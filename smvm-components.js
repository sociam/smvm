/* jshint strict:false */
/* global console, require, process */

const uuid = require('node-uuid'),
	COLLECTION = COLLECTION;

var SMOp = (sm, iid) => {
	var this_ = this;
	this.sm = sm;
	this.iid = iid;
};

SMOp.prototype = {
	getIDoc: () => this.sm.smvm.db.collection(COLLECTION).findById(this.iid),
	getRequestUser: (req) => require('./smvm-net').getRequestUser(req),	
	load:() => { 	
		return this.getIDoc().then((idoc) => {
			this_.deserialise_config(idoc);
			return this_.bind();
		});
	},
	makeCallable:() => {
		// weird POST-GET to deal with persisting values then getitng them.
		return (args) => { 
			return this_.getIDoc().then((idoc) => { 
				var urls = idoc.urls;
				// first set the aprams
				return Promise.any(idoc.urls.map((url) => $.ajax({url:url, method:'POST', contentType:'application/json', data:JSON.stringify(args) })));
			}).then((x) => {
				// then get the value
				return Promise.any(idoc.urls.map((url) => $.ajax({url:url, method:'GET' })));
			});
		};
	},
	bind:() => {
		var this_ = this,
			iid = this.config.iid,
			urlpath = '/instances/'+iid,
			net = require('./smvm-net'),
			idb = this.sm.smvm.db.collection(COLLECTION);

		return this_.getIDoc().then((idoc) => { 
			// update locations first
			idoc.urls = net.makeFullURL(urlpath);
			return idoc.save();
		}).then(() => { 
			this_.smvm.app.post(, (req,res) => { 
				this_.getIDoc().then((idoc) => { 
					// post of req, update our document
					var user = this_.getRequestUser(req),
						args_by_user = idoc.args_by_user || {};
					if (!user) { return res.status(400).send('no user'); }
					args_by_user[user] = _(req.params).clone();
					idb.save(idoc).then((x) => { res.status(200).send('Ok saved');	})
						.catch((e) => res.status(500).send('error '+ e.toString()));
				}).catch((e) => res.status(500).send('error '+ e.toString()));
			});
			this.smvm.app.get('/instances/'+i.config.iid, (req,res) => {
				// now get arguments and apply
				// invert params by identity
				this_.getIDoc().then((i) => { 				
					var protid = i.protid,
						protocol = require('./smvm-registry').getRegistry()[protid],
						config = this_.sm.deserialise_op_callable_config(i.config),
						fn = protocol(this_, config);

					if (!protid) { 	return res.status(400).send('no protocol id specified'); }
					if (!protocol) { return res.status(400).send('no known protocol ' + protid); }
					/// TODO --- next step is to apply the method to the arguments	
					var result = fn(config);
					res.status(200).send(result);
				});
			});
		});
	}
};
	
var SocialMachine = (smvm, id) => {
	this.smvm = smvm;
	this.ops = {}; // by iid
	this.id = id;
	this.db = this.smvm.db.collection(COLLECTION);
	this.load();
};
SocialMachine.prototype = {
	bind:() => {
		// makes server bindigs;
		var i = this.instance, this_ = this,
			idb = this.smvm.db.collection(COLLECTION);

	},
	load:function() {
		// loads all the ops we need
		var this_ = this, db = this.db, smvm = this.smvm, ops = this.ops || {};
		// retrieve our doc.
		return db.findById(this.id).then((idoc) => {
			this.ops = idoc.ops.map((opspec) => {
				smvm.ops[opspec.iid] = this_.ops[opspec.iid] = smvm.ops[opspec.iid] || new SMOp(opspec.iid);
			});
			return Promise.all(_.values(smvm.ops).map((x) => x.load()));
		});
	},
	// creating a new instance
	newOp:(protid, config_args) => {
		var iid = uuid.v1(),
			doc = { _id:iid, type:'smop', protid: protid, config:this.serialise_op_config(config_args) };
		return this.db.save(doc).then((x) => new SMOp(iid));
	},
	serialise_op_config:(config) => {
		_(config).keys().reduce((obj,k) => { 
			var v = config[k];
			obj[k] = v instanceof SMOp ? { type:'smop', iid: v.iid } : v;
			return obj;
		},{});
		return obj;
	},
	deserialise_op_callable_config:(config) => { 
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


var SMVM = (app, db) => {
	this.app = app;
	this.db = db;
	this.machines = {};
	this.ops = {}; // potentially shared among SMVMs
};

SMVM.prototype = {
	// establishes the root of a new social machine, creates a new instance variable
	newSocialMachine:(id) => { 
		// creates a new social machine without a config
		var config = { _id : id, type :'socialmachine' };
		return new SocialMachine(this_, config);
	},
	bindInstances:() => {
		// binds configured instances to listen to appropriate 
		var this_ = this,
			machines = this.machines,
			app = this.app, 
			idb = this.db.collection(COLLECTION);

		idb.find({type:'socialmachine'}).then((instances) => {
			instances.map((i) => { 
				machines[i.id] = machines[i.id] || new SocialMachine(this_, i.id);
			});
		});
	}
};

module.exports = { 
	SMVM:SMVM,
	register:(app) => {
		console.info('registering components functions >>>>>>>>>> ');
	}
};

