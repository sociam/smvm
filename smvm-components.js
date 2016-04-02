/* jshint strict:false */
/* global console, require, process */

const uuid = require('node-uuid'),
	COLLECTION = COLLECTION;

var SMOp = (sm, options) => {
	var this_ = this;
	this.sm = sm;
	this.id = opid;
	this.config = config;

	// load this one

	if (options.iid) {

		this.sm.smvm.db.collection(COLLECTION).get({_id:options.iid}).then((idoc) => {
			this_.config.this_.deserialise_config(idoc);
		});


};

SMOp.prototype = {
	getIDoc:() => {
		var idb = this.sm.smvm.db.collection(COLLECTION);
		return idb.find({iid:this.config.iid});
	},
	getRequestUser: (req) => require('./smvm-net').getRequestUser(req),	
	bind:() => {
		var this_ = this,
			iid = this.config.iid
			idb = this.sm.smvm.db.collection(COLLECTION);

			this_.smvm.app.post('/instances/'+iid, (req,res) => { 
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
				var protid = i.protid,
					protocol = require('./smvm-examples').getRegistry()[protid],
					method = protocol && protocol.methods && i.method,
					config = this_.deserialise_config(i.config),
					fn = protocol.method || protocol.methods && method && protocol.methods[method](this_,config);

				if (!protid) { 	return res.status(400).send('no protocol id specified'); }
				if (!protocol) { return res.status(400).send('no known protocol ' + protid); }
				if (protocol.methods && !method) { 
					return res.status(400).send('no method for protocol ' + protid);						
				}		
				/// TODO --- next step is to apply the method to the arguments	
			});
	},
	deserialise_config:(config) => { 
		// todo can contain references to particular methods
		var ops = this.sm.ops;
		// this is coming in from the saved version of this op.
		this.config = _(config).keys().reduce((obj,k) => {
			var serialv = config[k];
			obj[k] = serialv.type == 'smop' ? ops[serialv.iid] : serialv;
			return obj;
		}, {});
		this.iid = config.iid;
	},
	serialise_config:() => {
		var config = this.config;
		_(config).keys().reduce((obj,k) => { 
			var v = config[k];
			obj[k] = v instanceof SMOp ? { type:'smop', iid: v.iid } : v;
			return obj;
		},{});
		obj.iid = this.iid;
		return obj;
	}
};
	
var SocialMachine = (smvm, instancedoc) => {
	this.smvm = smvm;
	if (instancedoc === undefined) { 
		// new social machine
		this.ops = {}; // by iid
	} else {
		this.load(instancedoc);
	}
};
SocialMachine.prototype = {
	bind:() => {
		// makes server bindigs;
		var i = this.instance, this_ = this,
			idb = this.smvm.db.collection(COLLECTION);

	},
	load:function(idoc) {
		var this_ = this, db = this.smvm.db.collection(COLLECTION), smvm = this.smvm, ops = this.ops || {};
		this.ops = idoc.ops.map((opspec) => {

			var op = smvm.ops[opspec.iid] || new SMOp(opspec);
			smvm.ops[opspec.iid] = op;
		});
		this.ops = ops;
	},
	newOp:(instance, id, config) => {
		var args = arguments.slice(2),
			reg = require('./smvm-examples').registry;
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
				if (!machines[i.id]) {
					machines[i.id] = new SocialMachine(this_, i);
					machines[i.id] = true;
				}
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

