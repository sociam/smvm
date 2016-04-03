/* jshint strict:false */
/* global console, require, module */

const uuid = require('node-uuid'),
	Promise = require('bluebird'),
	COLLECTION = 'instances',
	log = (x) => console.log(x),
	request = require('request-promise'),
	_ = require('lodash');

var SMOp = function(sm, iid) {
	this.sm = sm;
	this.iid = iid;
};

SMOp.prototype = {
	getIDoc: function() { return this.sm.smvm.db.findById(this.iid); },
	getRequestUser: (req) => require('./smvm-net').getRequestUser(req),	
	load:function() { 	
		var this_ = this;
		log("SMOP load");
		return this.getIDoc().then((idoc) => {
			this_.protid = idoc.protid;
			this_.config = this_.sm.deserialise_op_config(idoc);
			return this_.bind();
		});
	},
	getState:function(key) {
		return this.getIDoc().then((idoc) => { 
			if (idoc.state && idoc.state[key]) { 
				return idoc.state[key];
			}
		});
	},
	setState:function(vars) {
		return this.getIDoc().then((idoc) => { 
			if (!idoc.state) { idoc.state = {}; }
			_(idoc.state).extend(vars);
			return this.sm.smvm.db.save(idoc);
		});		
	},
	getURLs: function() {
		return require('./smvm-net').makeFullURLs('/instances/'+this.iid);
	},	
	makeCallable:function() {
		// weird POST-GET to deal with persisting values then getitng them.
		var this_ = this, idoc;
		return (args) => { 
			return this_.getIDoc().then((idoc_) => { 
				idoc = idoc_;
				return Promise.any(idoc.urls.map((url) => request({url:url, method:'POST', contentType:'application/json', data:JSON.stringify(args) })));
			}).then(() => {
				// then get the value
				return Promise.any(idoc.urls.map((url) => request({url:url, method:'GET' })));
			});
		};
	},
	bind:function() {
		var this_ = this,
			iid = this.iid,
			urlpath = '/instances/'+iid,
			net = require('./smvm-net'),
			idb = this.sm.smvm.db;

		return this_.getIDoc().then((idoc) => { 
			// update locations first
			idoc.urls = net.makeFullURLs(urlpath);
			log('setting urls for op ', iid, idoc.urls);
			return idoc.save();
		}).then(() => { 
			this_.smvm.app.post(urlpath, (req,res) => { 
				this_.getIDoc().then((idoc) => { 
					// post of req, update our document
					var user = this_.getRequestUser(req),
						args_by_user = idoc.args_by_user || {};
					if (!user) { return res.status(400).send('no user'); }
					args_by_user[user] = _(req.params).clone();
					idb.save(idoc).then(() => { res.status(200).send('Ok saved'); }).catch((e) => res.status(500).send('error '+ e.toString()));
				}).catch((e) => res.status(500).send('error '+ e.toString()));
			});
			this.smvm.app.get(urlpath, (req,res) => {
				// now get arguments and apply
				// invert params by identity
				this_.getIDoc().then((i) => { 				
					var protid = i.protid,
						protocol = require('./smvm-registry').getRegistry()[protid],
						config = this_.sm.deserialise_op_callable_config(i.config),
						fn = protocol(this_, config),
						args = req.params;

					if (!protid) { 	return res.status(400).send('no protocol id specified'); }
					if (!protocol) { return res.status(400).send('no known protocol ' + protid); }
					if (!fn) { return res.status(500).send('protocol should have returned a function ' + protid); }
					/// TODO --- next step is to apply the method to the arguments	
					log('attempting to apply with arguments ', args);
					var result = fn(args);
					res.status(200).send(result);
				}).catch((e) => res.status(500).send('error '+ e.toString()));
			});
		});
	}
};
	
var SocialMachine = function(smvm, id) {
	this.smvm = smvm;
	this.id = id;
	this.db = this.smvm.db;
	this.ops = {}; // by iid	
};
SocialMachine.prototype = {
	// bind:() => {},
	load:function() {
		// loads all the ops we need
		var this_ = this, db = this.db, smvm = this.smvm;
		// retrieve our doc.
		return db.findById(this.id).then((idoc) => {
			idoc.ops.map((opspec) => {
				smvm.ops[opspec.iid] = this_.ops[opspec.iid] = (smvm.ops[opspec.iid] || new SMOp(this_,opspec.iid));
			});
			return Promise.all(_.values(smvm.ops).map((x) => x.load()));
		});
	},
	getDoc: function() { return this.db.findById(this.id); },
	// creating a new instance
	newOp:function(protid, config_args) {
		const opiid = uuid.v1(),
			this_ = this,
			opdoc = { _id:opiid, type:'smop', protid: protid, config:this.serialise_op_config(config_args) };

		return this.getDoc().then((smdoc) => { 
			// update t
			smdoc.ops.push(opiid);
			return this_.db.save(opdoc).then(() => {
				return this.db.save(smdoc).then(() => {
					var op = new SMOp(this_,opiid);
					this_.ops[opiid] = op;
					return op;
				});
			});
		});
	},
	serialise_op_config:function(config) {
		return _(config).keys().reduce((obj,k) => { 
			var v = config[k];
			obj[k] = v instanceof SMOp ? { type:'smop', iid: v.iid } : v;
			return obj;
		},{});
	},
	deserialise_op_callable_config:function(config)  { 
		// todo can contain references to particular methods
		var ops = this.ops;
		// this is coming in from the saved version of this op.
		return _(config).keys().reduce((obj,k) => {
			var serialv = config[k];
			obj[k] = serialv.type == 'smop' ? ops[serialv.iid].makeCallable() : serialv;
			return obj;
		}, {});
	}
};

var SMVM = function(app, db) {
	this.app = app;
	this.db = db.collection(COLLECTION);
	this.machines = {};
	this.ops = {}; // potentially shared among SMVMs
};

SMVM.prototype = {
	// establishes the root of a new social machine, creates a new instance variable
	newSocialMachine:function() { 
		// creates a new social machine without a config
		const this_ = this, id = uuid.v1(),config = { _id : id, type :'socialmachine', config:{}, ops:[] };
		return this.db.save(config).then(() => { 
			var sm = this_.machines[id] = new SocialMachine(this, id);
			return sm.load().then(() => sm);
		});
	},
	bindInstances:function() {
		// TODO debug
		var machines = this.machines, idb = this.db, this_ = this;
		return idb.find({type:'socialmachine'}).then((instances) => {
			return Promise.all(instances.map((i) => { 
				machines[i.id] = machines[i.id] || new SocialMachine(this_, i.id); // intentional use of this due to => 
				return machines[i.id].load().then(() => machines[i.id]);
			}));
		});
	}
};

module.exports = { 
	SMVM:SMVM,
	SocialMachine:SocialMachine,
	SMOp:SMOp
};

