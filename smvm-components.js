/* jshint strict:false */
/* global console, require, process */



module.exports = { 
	register:(app) => {
		console.info('registering components functions >>>>>>>>>> ');
	}
};

var closedVote = (instance, whitelist_verifier, candidates) => {
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
};


var whitelist = (instance, acl) => {
	id:'whitelist',
	method:instance.createFunction((person) => acl.map((x) => x.id).indexOf(person.id) >= 0 )
};

var program = () => {
	var instance = SMVMs.newSocialMachine(),
		wl = SMVMs.makeNew(instance, 'whitelist', ['http://hip.cat/emax', 'r@reubenbinns.com', 'jun.zhao@junzhao.com']),
		vote = SMVMs.makeNew(instance, 'closedVote', wl, ['http://makeamericangreatagain.com/#trump', 
			'http://hilary.com/#clinton'],
		ballotboxUI = SMVM.makeNew(instance,'ballotBoxUI',vote),
		resultsUI = SMVM.makeNew(instance,'histogramUI', () => vote.results(instance));
	return vote;
};



}