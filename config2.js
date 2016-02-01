module.exports = {
	db:'mongodb://localhost:27017/dtotwo',
	tracker:'mongodb://robostar.csail.mit.edu:12345/pies',
	port:3001,	
	prot: 'http',
	name:'happy storage node',
	id:'node-secondary-max',
	owner: {
		id:'http://hip.cat/emax',
		name: 'electronic Max',
		pubkey:'2389238392921938928328'
	},
	location: {
		city: 'http://dbpedia.org/page/Oxford',
		lat:51.7485820,
		lon:-1.239827012,
	},
	security:'none'
};