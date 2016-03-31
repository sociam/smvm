/* jshint strict:false */
/* global console, require, process */

var closedvote = (instance, whitelist_verifier, candidates) => {
	return {
		id: 'closedvote',
		methods: {
			cast: instance.createFunction((instance, ballot) => {
				var votes = instance.get('votes'),
					voter = instance.getAuthenticatedUser();
				return whitelist_verifier(voter).then((authorised) => {
					if (!authorised) { throw Error("Not authorised to vote in this election"); }
					if (candidates.indexOf(ballot.choice) >= 0) {
						votes[voter.id] = ballot.choice;
						instance.set({votes:votes});
						return 'ok';
					}
					throw Error("Invalid vote ", ballot.choice);
				});
			}),
			results : instance.createFunction((instance) => {
				var votes = instance.get('votes');
				return _.values(votes).reduce((counts, b) => { 
					counts[b] = counts[b] + 1 || 1;
					return counts;
				}, {});
			})
		} 
	}; 
}, whitelist = (instance, acl) => {
	id:'whitelist',
	method:instance.createFunction((person) => acl.map((x) => x.id).indexOf(person.id) >= 0 )
};


module.exports = { 
	populate:(smvm) => {
		// smvm.registerProtocols([closedVote, whitelist]);
		this.makeElection(smvm);
	},
	getRegistry:() => { 
		return { closedvote:closedVote, whitelist:whitelist	}; 
	},
	makeElection:(smvm) => {
		var instance = smvm.newSocialMachine(),
			wl = smvm.makeNew(instance, 'whitelist', ['http://hip.cat/emax', 'r@reubenbinns.com', 'jun.zhao@junzhao.com']),
			vote = smvm.makeNew(instance, 'closedVote', wl, 
				[
					{id:'http://makeamericangreatagain.com/#trump', name:'donald trump'}, 
					{id:'http://hillary.com/#clinton', name:'hillary clinton'}
				]
			);
		return vote;
	}
};


