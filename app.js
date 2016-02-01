/* global console, require */

var express = require('express'),
	app = express(),
	_ = require('lodash'),
	Promise = require('bluebird'),
	mongo = require('mongodb-bluebird'),
	bodyParser = require('body-parser'),
	multer = require('multer'), // v1.0.5
	upload = multer(),
	config_file = process.argv.length > 2 ? process.argv[2] : './config',
	config = require(config_file),
	http = require('http'),
	url = require('url'),
	os = require('os'),
	request = require('request-promise'),
	db, tracker, peers;

console.info('initialising with config ', config_file);
// set up middleware
app.use(bodyParser.json()); // for parsing application/json

// set up static
app.use('/', express.static('www'));

// connect to the db -- which is at config.db
console.log('PIES instance:', config.id, ' port:', config.port, ' database:', config.db);
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

		// test get local collections
		getLocalCollections().then((x) => console.log('local collections ', x));

	});
});

var askPeer = (peer, path) => {
	var pa = peer.addrs[0],
		peer_url = [pa.prot,'://',pa.host,':',''+pa.port, path].join('');

	console.log('connecting peer_url ', peer_url);
	return new Promise((acc,rej) => {
		request({url:peer_url, timeout:1000})
			.then(acc)
			.catch((err) => {
				console.error('could not connect to peer ', peer_url);
				acc();
			});
		});
};

var getLocalCollections = () => db.collections().then((sC) => { return sC.map((x) => x.s.name);	}),
	getPeerCollections = (p) => askPeer(p, '/api/collections?local=true').then((x) => (x && JSON.parse(x) || [])),
	findCollection = (cid) => {
		return getLocalCollections().then((lCs) => {
			if (lCs.indexOf(cid) >= 0) { return { id: config.id }; }
			return Promise.filter(peers,
				(p) => getPeerCollections(p).then((cs) => cs.indexOf(cid) >= 0)
			).then((ps) => {
				if (ps.length > 0) { return ps[0]; }
			});
		})
	};

app.get('/api/collections', function(req,res) {
	var localOnly = url.parse(req.url, true).query.local;
	if (localOnly) {
		return getLocalCollections().then((cs) => {
			console.log('collections ', cs);
			res.status(200).send(JSON.stringify(cs));
		});
	}
	return getLocalCollections().then((locals) => {
		return Promise.all(peers.map((p) => getPeerCollections(p)))
		.then((cs) => _(cs).filter((x) => x).push(locals).flatten().uniq().value())
		.then((csuniq) => res.status(200).send(JSON.stringify(csuniq)));
	}); // getLocalCollections
}); // app.get

app.get('/api/findCollection', function(req,res) {
	var cname = url.parse(req.url, true).query.name;
	findCollection(cname).then((p) => {
		console.info('peers hit for ', cname, p)
		if (p !== undefined) {
			return res.status(200).send(p.id);
		}
		return res.status(404).send('');
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
		.filter((x) => localhosts.indexOf(x) < 0 && x.indexOf(':') < 0) // get rid of localhosts, ipv6 shizzle
		.uniq().value();
};

console.log('myinterfaces ', getMyInterfaces());

var server = http.createServer(app);

// http.createServer(app).listen(3000);
server.listen(config.port, function() { });
