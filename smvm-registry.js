/* jshint strict:false */
/* global console, require, process */

var castvote = (instance, config) => {
	return (instance, args) => {
		var whitelist_verifier = config.whitelist_verifier, 
			candidates = config.candidates,
			ballot = args.ballot,
			votes = instance.get('votes'),
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
	};
}, tallyvote = (instance, config) { 
	return (instance) => {
		var votes = instance.get('votes');
		return _.values(votes).reduce((counts, b) => { 
			counts[b] = counts[b] + 1 || 1;
			return counts;
		}, {});
	};
}, whitelist = (instance, config) => {
	return (person) => config.acl.map((x) => x.id).indexOf(person.id) >= 0;
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
			wl = instance.newOp(instance, 'whitelist', ['http://hip.cat/emax', 'r@reubenbinns.com', 'jun.zhao@junzhao.com']),
			vote = instance.newOp(instance, 'closedVote', { whitelist:wl, candidates: [
					{id:'http://makeamericangreatagain.com/#trump', name:'donald trump'}, 
					{id:'http://hillary.com/#clinton', name:'hillary clinton'}
				]
			});
		return vote;
	}
};

