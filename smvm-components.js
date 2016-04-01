/* jshint strict:false */
/* global console, require, process */


var SMVMCore = (app, db) => {
	this.app = app;
	this.db = db;
	this.actinst = {};
};

SMVMCore.prototype = {
	// 
	registerProtocols:(definitions) => { 
		// todo this can be done later
		// 
	},
	getRequestUser: (req) => require('./smvm-net').getRequestUser(req),
	// establishes the root of a new social machine, creates a new instance variable
	newSocialMachine:() => { 
	},
	bindInstances:() => {
		// binds configured instances to listen to appropriate 
		var actinst = this.actinst,
			app = this.app, 
			idb = this.db.collection('instances');

		idb.find().then((instances) => {
			instances.map((i) => { 
				if (!actinst[i.iid]) {
					app.post('/instances/'+i.iid, (req,res) => { 
						// post of req, push onto arguments :D
						// organise by poster
						var user = this_.getRequestUser(req),
							args_by_user = i.args_by_user || {};
						if (!user) { return res.status(400).send('no user'); }
						args_by_user[user] = _(req.params).clone();
						console.log('saving params for user ', user, ' :: ', req.params);
						idb.save(i).then((x) => { res.status(200).send('Ok saved');	})
							.catch((e) => { res.status(500).send('error '+ e.toString()); });
					});
					app.get('/instances/'+i.iid, (req,res) => {
						// now get arguments and apply
						// invert params by identity
						var protid = i.protid,
							protocol = require('./smvm-examples').getRegistry()[protid],
							method = protocol && protocol.methods && i.method,
							fn = protocol.method || protocol.methods && method && protocol.methods[method];

						if (!protid) { 	return res.status(400).send('no protocol id specified'); }
						if (!protocol) { return res.status(400).send('no known protocol ' + protid); }
						if (protocol.methods && !method) { 
							return res.status(400).send('no method for protocol ' + protid);						
						}
						
					});
					actinst[i.iid] = true;
				}
		});
	},
	extendOp:(instance, id) => {
		var args = arguments.slice(2),
			reg = require('./smvm-examples').registry;

	}
};

module.exports = { 
	SMVMCore:SMVMCore,
	register:(app) => {
		console.info('registering components functions >>>>>>>>>> ');
	}
};

