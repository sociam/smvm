/* jshint strict:false */
/* global console, require, module */

const uuid = require('node-uuid'),
	Promise = require('bluebird'),
	worduuids = require('random-words'),
	worduuid = () => worduuids({exactly:5,join:'-'}),
	COLLECTION = 'instances',
	md5 = require('md5'),
	colors = require('colors'),	
	log = function() { console.log.apply(console,arguments); },
	request = require('request-promise'),
	_ = require('lodash');

var SMOp = function(sm, iid) {
	this.sm = sm;
	this.iid = iid;
	log('SMOP constructor'.green, iid.red);
};

SMOp.prototype = {
	getIDoc: function() { return this.sm.smvm.db.findById(this.iid); },
	getRequestUser: (req) => require('./smvm-auth').getRequestUser(req),	
	load:function() { 	
		var this_ = this;
		return this.getIDoc().then((idoc) => {
			log("SMOP load".red, idoc.protid, idoc._id);
			this_.protid = idoc.protid;
			this_.config = this_.sm.deserialise_op_config(idoc);
			return this_.bind().then(() => this_);
		});
	},
	getState:function(key) {
		return this.getIDoc().then((idoc) => { 
			if (idoc.state) { return idoc.state[key]; }
		});
	},
	setState:function(vars) {
		return this.getIDoc().then((idoc) => { 
			if (!idoc.state) { idoc.state = {}; }
			_.extend(idoc.state, vars);
			return this.sm.smvm.db.save(idoc);
		});		
	},
	getURLs: function() {
		return require('./smvm-net').makeFullURLs('/instances/'+this.iid);
	},	
	makeCallable:function(req) {
		// weird POST-GET to deal with persisting values then getitng them.
		var this_ = this, idoc,
			authtoken = require('./smvm-auth').getAuthToken(req);
		return (args) => { 
			return this_.getIDoc().then((idoc_) => { 
				idoc = idoc_;
				var url = idoc.urls[0];
				console.log("making POST call ".red, url, " >> ", args, 'authtoken', authtoken);
				return request({uri:url, method:'post', body:args, json:true, headers: {
					contentType:'application/json',
					authtoken:authtoken
				}});			
				// return Promise.any(idoc.urls.map((url) => {
				// 	console.log("making call ".red, url, " >> ", args);
				// 	return request({uri:url, method:'post', body:args, json:true, headers: {
				// 		contentType:'application/json'
				// 	}});
				// }));
			}).then(() => {
				// then get the value
				var url = idoc.urls[0];
				console.log("making GET call ".red, url, " >> ");
				return request({url:url, method:'GET', headers:{ authtoken:authtoken }});
				// return Promise.any(idoc.urls.map((url) => request({url:url, method:'GET' })));
			});
		};
	},
	bind:function() {
		var this_ = this,
			iid = this.iid,
			urlpath = '/instances/'+iid,
			net = require('./smvm-net'),
			idb = this.sm.smvm.db,
			app = this.sm.smvm.app;

		return this_.getIDoc().then((idoc) => { 
			// update locations first
			idoc.urls = net.makeFullURLs(urlpath);
			log('setting urls for op ', iid, idoc.urls);
			return idb.save(idoc);
		}).then(() => { 
			app.post(urlpath, (req,res) => { 
				log('POST '.yellow, iid, ' ', req.body);
				this_.getIDoc().then((idoc) => { 
					// post of req, update our document
					var user = this_.getRequestUser(req),
						args_by_user = idoc.args_by_user || {};
					if (!user) { return res.status(400).send('no user'); }
					args_by_user[md5(user)] = _(req.body).clone();
					idoc.args_by_user = args_by_user;
					log('POST saving updated idoc '.blue, idoc.args_by_user, idoc);
					idb.save(idoc).then(() => { res.status(200).send('Ok saved'); }).catch((e) => res.status(500).send('error '+ e.toString()));
				}).catch((e) => res.status(500).send('error '+ e.toString()));
			});
			app.get(urlpath, (req,res) => {
				// now get arguments and apply
				// invert params by identity
				log('GET '.yellow, iid, ' ', req.body);
				this_.getIDoc().then((i) => { 				
					var protid = i.protid,
						protocol = require('./smvm-registry').getRegistry()[protid],
						config = this_.sm.deserialise_op_callable_config(req, i.config),
						fn = protocol(this_, config),
						args = req.params;

					if (!protid) { 	return res.status(400).send('no protocol id specified'); }
					if (!protocol) { return res.status(400).send('no known protocol ' + protid); }
					if (!fn) { return res.status(500).send('protocol should have returned a function ' + protid); }
					/// TODO --- next step is to apply the method to the arguments	
					log('attempting to apply with arguments ', args);
					var result = fn(_.extend(args, {auth_user:this_.getRequestUser(req)}));
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
			return Promise.all(_.values(smvm.ops).map((x) => x.load())).then(() => this_);
		});
	},
	getDoc: function() { return this.db.findById(this.id); },
	// creating a new instance
	newOp:function(protid, config_args) {
		const opiid = protid, //  + "--" + worduuid(),
			this_ = this,
			opdoc = { _id:opiid, type:'smop', protid: protid, config:this.serialise_op_config(config_args) };

		log('creating op '.blue, protid, opiid.cyan, opdoc);

		return this.getDoc().then((smdoc) => { 
			// update t
			smdoc.ops.push(opiid);
			return this_.db.save(opdoc).then(() => {
				log('inserted '.blue, opdoc);
				return this.db.save(smdoc).then(() => {
					log('saving '.blue, smdoc);
					var op = new SMOp(this_,opiid);
					this_.ops[opiid] = op;
					return op.load().then(() => op);
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
	deserialise_op_config:function(config)  { 
		// todo can contain references to particular methods
		var ops = this.ops;
		// this is coming in from the saved version of this op.
		return _(config).keys().reduce((obj,k) => {
			var serialv = config[k];
			obj[k] = serialv.type == 'smop' ? ops[serialv.iid] : serialv;
			return obj;
		}, {});
	},
	deserialise_op_callable_config:function(req, config)  { 
		// todo can contain references to particular methods
		var ops = this.ops;
		// this is coming in from the saved version of this op.
		return _(config).keys().reduce((obj,k) => {
			var serialv = config[k];
			obj[k] = serialv.type == 'smop' ? ops[serialv.iid].makeCallable(req) : serialv;
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
		const this_ = this, id = 'social-machine-'+worduuid(), config = { _id : id, type :'socialmachine', config:{}, ops:[] };
		return this.db.save(config).then(() => { 
			var sm = this_.machines[id] = new SocialMachine(this, id);
			return sm.load().then(() => sm);
		});
	},
	loadAll:function() {
		// TODO debug
		var machines = this.machines, idb = this.db, this_ = this;
		return idb.find({type:'socialmachine'}).then((instances) => {
			return Promise.all(instances.map((i) => { 
				log("Loading social machine >>".yellow, i.id);
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

