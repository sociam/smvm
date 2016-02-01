/* global console, require */

var express = require('express'),
	app = express(),
	_ = require('lodash'),
	// Promise = require('bluebird'),
	mongo = require('mongodb-bluebird'),
	bodyParser = require('body-parser'),
	multer = require('multer'), // v1.0.5
	upload = multer(),
	config_file = process.argv.length > 2 ? process.argv[2] : './config',
	config = require(config_file),
	http = require('http'),
	os = require('os'),
	db, tracker, peers;

console.info('initialising with config ', config_file);
// set up middleware
app.use(bodyParser.json()); // for parsing application/json

// set up static
app.use('/', express.static('www'));

// connect to the db
console.log('connecting to ', config);
var connect = mongo.connect(config.tracker).then((tr) => {
	console.info('connected to tracker ', config.tracker);
	tracker = tr;
	return mongo.connect(config.db);
}).then((db_) => { db = db_; })
.catch((err) => { console.error("could not connect to tracker"); });

connect.then(() => {
	// insert ourselves in the tracker
	tracker.collection('nodes').find({_id:config.owner.id}).then(function(d) {
		// record ourselves in there:
		// creates { name: <nodename>, id: 'nodeid', addrs: [ { prot: 'http', host:<addr>, port:3000 } ] }
		var us = _(config).pick(['name','id']).extend({addrs : getMyInterfaces().map((x) => ({ prot:config.prot, host: x, port: config.port }))}).value();
		peers = (d && d[0] && d[0].nodes || []).filter((x) => (x.id !== config.id));
		var new_us = {_id:config.owner.id,nodes:peers.concat(us)};
		return tracker.collection('nodes').save(new_us);
	}).then(() => {
		// let's make contact with the peers
		console.log('done inserting ');
	});
});

var askPeer = (peer) => {
	var peer_url = [peer.prot,'://',peer.host,':',''+peer.port].join('');
	console.log('connecting peer_url ', peer_url);
	return Promise( (acc,rej) => $.get({url:peer_url}).done(acc).fail(rej) );
};

app.get('/api/collections', function(req,res) {
	var localOnly = req.params.local,
		localC = () => { 
			return db.collections().then((x) => {
				res.status(200).send(x.map((x) => x.s.name));
			});
		};
	if (localOnly) { return localC(); }
	return localC.then((localC) => { 
		return Promise.all(peers.map((p) => askPeer(p, '/api/collections?local=true'))).then((rC) => { 
			console.info('remote Collections ', rC);
			return localC.concat(rC);
		});
	});
});

// respond with "hello world" when a GET request is made to the homepage
// app.get('/', function(req, res) { res.send('hello world'); });
app.get('/api/:collection/:id', function(req,res) {
	console.log(' collection:', req.params.collection.trim(), ' id:', req.params.id);
	var c = db.collection(req.params.collection);
    return c.find().then(function(docs) {
        res.status(200).send(""+JSON.stringify(docs));
    }).catch(function(err) {
        console.error("something went wrong");
    });
});

app.post('/api/:collection/:id', function(req,res) {
	console.log('req.body ', req.body);
	res.status(200).send('hi');
});

var getMyInterfaces = () => { 
	var localhosts = ["127.0.0.1", "::", "::1", "fe80::1"];
	return _(os.networkInterfaces()).values().map((x) => x.map((y) => y.address))
		.flatten()
		.filter((x) => localhosts.indexOf(x) < 0) // get rid of localhosts
		.uniq().value();
};

// console.log('myinterfaces ', getMyInterfaces());
var server = http.createServer(app);

// http.createServer(app).listen(3000);
server.listen(config.port, function() {
	console.log('app.address ', server.address());
	console.log();
});
