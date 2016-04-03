/* jshint strict:false */
/* global require, process, module */

var Promise = require('bluebird'), 
	_ = require('lodash'),
	colour = require('colors'),
	castvote = (smop, config) => {
		return (args) => {
			var whitelist_verifier = config.whitelist_verifier, 
				candidates = config.candidates,
				ballot = args.ballot,
				voter = smop.getAuthenticatedUser();
			return [smop.getState('votes'), whitelist_verifier(voter)].spread((votes, authorised) => {
				if (!authorised) { throw Error("Not authorised to vote in this election"); }
				if (candidates.indexOf(ballot.choice) >= 0) {
					votes[voter.id] = ballot.choice;
					return smop.setState({votes:votes}).then(() => 'ok');
				}
				throw Error("Invalid vote ", ballot.choice);
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
	}, whitelist = (sm, config) => {
		return (person) => config.acl.map((x) => x.id).indexOf(person.id) >= 0;
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
			return sm.newOp('whitelist', ['http://hip.cat/emax', 'r@reubenbinns.com', 'jun.zhao@junzhao.com']).then((wl) => {
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


