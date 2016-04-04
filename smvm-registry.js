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

			console.info("CASTVOTE config ", config);
			console.info("CASTVOTE args ".green, candidates, voter, ballot);
			return Promise.all([smop.getState('votes'), whitelist({id:voter})]).spread((votes, authorised) => {
				console.log("getState [votes]", votes);
				console.log("authorised ", authorised);
				if (!authorised) { throw Error("Not authorised to vote in this election"); }
				if (candidates.map((x) => x.id).indexOf(ballot) >= 0) {
					votes[voter.id] = ballot;
					return smop.setState({votes:votes}).then(() => JSON.stringify({vote:votes}));
				}
				throw Error("Invalid vote ", ballot);
			});
		};
	}, 
	tallyvote = (sm, config) => { 
		return () => {
			return sm.getState('votes').then((votes) => { 
				return _.values(votes).reduce((counts, b) => {
					counts[b] = counts[b] + 1 || 1;
					return counts;
				}, {});
			});
		};
	}, whitelist = (sm, config, req) => {
		return (args) => { 
			console.info("WHITELIST args ", args, config);
			return config.acl.indexOf(args.auth_user) >= 0;
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


