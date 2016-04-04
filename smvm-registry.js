/* jshint strict:false */
/* global require, process, module */

var Promise = require('bluebird'), 
	_ = require('lodash'),
	colour = require('colors'),
	castvote = (smop, config) => {
		return (args) => {
			var whitelist = config.whitelist, 
				candidates = config.candidates,
				ballot = args.ballot,
				voter = args.auth_user;
			console.info("CASTVOTE :: actual args ".yellow, args);
			return Promise.all([smop.getState('votes'), whitelist({id:voter})]).spread((votes, authorised) => {
				console.log("getState [votes]", votes);
				console.log("authorised ", authorised);
				// console.info("CASTVOTE config ", config);
				console.info("CASTVOTE args ".green, candidates, voter, ballot);

				if (!authorised) { throw Error("Not authorised to vote in this election"); }
				if (candidates.map((x) => x.id).indexOf(ballot) >= 0) {
					votes = (votes || []).filter((x) => x[0] !== voter).concat([[voter, ballot]]);
					console.info('!!! new votes ', votes, ' SETTING STATE');					
					return smop.setState({votes:votes}).then(() => JSON.stringify({vote:votes}));
				} 
				return JSON.stringify({vote:votes});				
			});
		};
	}, 
	tallyvote = (sm, config) => { 
		return () => {
			return sm.getState('votes').then((votes) => { 
				return votes.reduce((counts, votepair) => {
					var voter = votepair[0], ballot = votepair[1];
					counts[ballot] = counts[ballot] + 1 || 1;
					return counts;
				}, {});
			});
		};
	}, whitelist = (sm, config, req) => {
		return (args) => { 
			console.info("WHITELIST args ", args, config);
			return Promise.resolve(config.acl.indexOf(args.id) >= 0);
		};
	};


module.exports = { 
	populate:(smvm) => {
		// smvm.registerProtocols([closedVote, whitelist]);
		this.makeElection(smvm);
	},
	getRegistry:() => { 
		return { castvote:castvote, whitelist:whitelist, tallyvote:tallyvote	}; 
	},
	makeElection:(smvm) => {
		 return smvm.newSocialMachine().then((sm) => {
			return sm.newOp('whitelist', { acl : ['http://hip.cat/emax', 'r@reubenbinns.com', 'jun.zhao@junzhao.com'] }).then((wl) => {
				return sm.newOp('castvote', 
					{ 
						whitelist:wl, 
						candidates: [ 
							{id:'http://makeamericangreatagain.com/#trump', name:'donald trump'}, 
							{id:'http://hillary.com/#clinton', name:'hillary clinton'}
						]
					}).then((cvote) => { 
						return sm.newOp('tallyvote').then((tvote) => {
							return [wl, cvote, tvote].reduce((mapping, op) => {
								console.log('op'.green, op.iid.cyan, op.getURLs());
								mapping[op.protid] = op.getURLs();
								return mapping;
							}, {});
						});
					});
				});
			});		
	}
};


