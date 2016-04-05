/* jshint strict:false */
/* global require, console, module */

var Promise = require('bluebird'), 
	dism = require('./smvm-components'),
	colour = require('colors'),

	castvote = (smop, config) => {

		return (args) => {
			var whitelist = config.whitelist,  // "config" is set at configuration time
				candidates = config.candidates,
				ballot = args.ballot, // "Args" are passed in through REST calls
				voter = args.auth_user;

			return Promise.all([smop.getState('votes'), whitelist({id:voter})]).spread((votes, authorised) => {
				// check candidate authorised through remote call to whitelist op
				if (!authorised) { 
					throw Error("Not authorised to vote in this election"); 
				}
				// check validity of ballot
				if (candidates.map((x) => x.id).indexOf(ballot) < 0) {	
					throw Error("Not a valid candidate, check your ballot again");		
				}

				// store vote for later tallying. note that this creates secret information
				// in the voter state, which persists with the instance.
				votes = (votes || []).filter((x) => x[0] !== voter).concat([[voter, ballot]]);

				return smop.setState({votes:votes}).then(() => "cool!");
			});
		};
	}, 

	tallyvote = (sm, config) => { 
		return () => {
			// get state from the social machine instance
			return sm.getState('votes').then((votes) => { 
				// now reduce into a counts
				return votes.reduce((counts, votepair) => {
					var voter = votepair[0], ballot = votepair[1];
					counts[ballot] = counts[ballot] + 1 || 1;
					return counts;
				}, {});
			});
		};
	}, 

	whitelist = (sm, config, req) => {
		return (args) => { 
			// auth_user is a special variable
			return Promise.resolve(config.acl.indexOf(args.auth_user) >= 0);
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
			return sm.newOp('whitelist', 
				{ 
					acl : ['http://hip.cat/emax', 'r@reubenbinns.com', 'jun.zhao@junzhao.com'] 
				}
			).then((wl) => {
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
	},
	makeClosedElection :(smvm) => {
		var election = new dism.SocialMachine(),
			whitelist = new dism.SMOp('whitelist', 
				{ acl : ['http://hip.cat/emax', 'r@reubenbinns.com', 'jun.zhao@junzhao.com'] }
			),
			castvote = new dism.SMOp('castvote', { 
						whitelist:whitelist, 
						candidates: [ 
							{id:'http://makeamericangreatagain.com/#trump', name:'donald trump'}, 
							{id:'http://hillary.com/#clinton', name:'hillary clinton'}
						]
					}),
			tallyvote = new dism.SMOp('tallyvote');

		smvm.addSM(election);
		election.addOp(whitelist, castvote, tallyvote);
		return election.load().then(() => {
			return [whitelist, castvote, tallyvote].reduce((mapping, op) => {
					mapping[op.protid] = op.getURLs();
					return mapping;
			}, {});
		});
	}

};


