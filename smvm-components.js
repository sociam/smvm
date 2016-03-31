/* jshint strict:false */
/* global console, require, process */


var SMVMCore = (app, db) => {
	this.app = app;
	this.db = db;
};

SMVMCore.prototype = {
	// 
	registerProtocols:(definitions) => { 
		// todo this can be done later
		// 
	},
	// establishes the root of a new social machine, creates a new instance variable
	newSocialMachine:() => { 
	},
	loadInstances:() => {
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

