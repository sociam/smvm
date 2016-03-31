/* jshint strict:false */
/* global console, require, process */



module.exports = { 
	register:(app) => {
		console.info('registering components functions >>>>>>>>>> ');
	}
};

var closedVote = (instance, whitelist_verifier, candidates) => {
	var votes = instance.getStateVariable('votes');
	return (voter, ballot) => {
		return whitelist_verifier(voter).then((authorised) => {
			if (!authorised) { throw Error("Not authorised to vote in this election"); }
			if (candidates.indexOf(ballot.choice) >= 0) {
				votes[voter.id] = ballot.choice;
				return 'ok';
			}
			throw Error("Invalid vote ", ballot.choice);
		});
	};
};

