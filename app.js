/* jshint strict:false */
/* global console, require, process */

var express = require('express'),
	app = express(),
	_ = require('lodash'),
	Promise = require('bluebird'),
	mongo = require('mongodb-bluebird'),
	bodyParser = require('body-parser'),
	config_file = process.argv.length > 2 ? process.argv[2] : './config',
	config = require(config_file),
	http = require('http'),
	url = require('url'),
	os = require('os'),
	md5 = require('MD5'),
	request = require('request-promise'),
	cookieParser = require('cookie-parser'),
	db, tracker, peers;

console.info('initialising with config ', config_file);
// set up middleware

app.use(bodyParser.json()); // for parsing application/json
app.use(cookieParser());
// set up static
app.use('/', express.static('www'));

// connect to the db -- which is at config.db
console.log('PIES instance:', config.id, ' port:', config.port, ' database:', config.db);
var connect = mongo.connect(config.tracker).then((tr) => {
	console.info('connected to tracker ', config.tracker);
	tracker = tr;
	return mongo.connect(config.db);
}).then((db_) => { db = db_; }).catch((err) => { console.error("could not connect to tracker", err); });

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
	return new Promise((acc) => {
		request({uri:peer_url, method:'GET', timeout:1000})
			.then(acc)
			.catch((err) => {
				console.error('could not connect to peer ', peer_url, err);
				acc();
			});
	});
};

var postPeer = (peer, path, payload) => {
	var pa = peer.addrs[0],
		peer_url = [pa.prot,'://',pa.host,':',''+pa.port, path].join('');

	console.log('POSTPEER >> connecting peer_url ', peer_url, path, ' payload :: ', payload);
	return new Promise((acc) => {
		request({method:'POST', uri:peer_url, timeout:1000, body: payload, json:true, headers: { 'content-type': 'application/json' }})
			.then(acc)
			.catch((err) => {
				console.error('could not connect to peer ', peer_url);
				acc(); // we just failfast
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
		});
	};

// api endpoints
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

// (name) -> returns (first) host that contains the collection
app.get('/api/findCollection', function(req,res) {
	var cname = url.parse(req.url, true).query.name;
	findCollection(cname).then((p) => {
		console.info('peers hit for ', cname, p);
		if (p !== undefined) {	return res.status(200).send(p.id);	}
		return res.status(404).send('');
	});
});

// gets a document with specified id from the given collection
app.get('/api/:collection/:id', function(req,res) {
	// console.log(' collection:', req.params.collection.trim(), ' id:', req.params.id);
	var cname = req.params.collection,
		id = req.params.id;

	findCollection(cname).then((chost) => {
		if (!chost) {
			console.error("Could not find collection ", cname, " returning 404");
			return res.status(400).send('Could not find collection');
		}
		if (chost && chost.id === config.id) {
			console.info('local hit! ');
			return db.collection(cname).find({_id:id}).then((docs) => {
				res.status(200).send(""+JSON.stringify(docs));
			}).catch((err) => {
				console.error("something went wrong fetching ", cname, " > ", id);
				res.status(400).send(err.toString());
			});
		}
		console.log('asking chost ', chost.id, ' - ', req.url);
		askPeer(chost, req.originalUrl).then(function(remote_response) {
			console.info('peer response', remote_response);
			res.status(200).send(""+remote_response);
		});
	});
});

var conn_by_token = {};

var makeToken = () => { 
	return new Promise((res,rej) => { 
		require('crypto').randomBytes(48, (ex, buf) => {  res(buf.toString('hex')); });
	});
};

app.post('/api/auth', (req,res) => {
	// automatically auth
	var username = req.body.username.trim(),
		password = req.body.password;

	console.info(req.body, 'username ', username, 'passwd ', password);	

	db.collection('users').findById(username).then(function(userdoc) { 
		console.log('userdoc ', userdoc);
		if (userdoc.passhash == md5(password)) { 
			makeToken().then((token) => { 
				console.info('password matches for user ', username, ' setting token ', token);			
				res.cookie('authtoken', token);
				conn_by_token[token] = { user: username, db_connections: {} };
				return res.status(200).send();
			});
		} else {
			res.status(403).send();
		}
	});
});
/* creates a new user document - overwriting previous ones. this
   effectively negates all security */
app.post('/api/newuser', (req,res) => {
	// todo make this actually work.
	var username = req.body.username.trim(),
		password = req.body.password,
		passhash = md5(password);

	db.collection('users').save({_id:username, passhash:passhash}).then(function() { 
		res.status(200).send();
	});
});
// auth check
app.get('/api/check', (req,res) => {
	var token = req.cookies.authtoken;
	console.info('auth cookie is ', req.cookies, token);
	if (conn_by_token[token] !== undefined) {
		return res.status(200).send();
	}
	return res.status(403).send();
});

// post like this:
// $.ajax({url:'/api/foo/newid2938',contentType:'application/json',method:'POST',data:JSON.stringify({a:123,b:'foo'})}).then((x) => console.log(x))
app.post('/api/:collection/:id', (req,res) => {

	var cname = req.params.collection,
		id = req.params.id,
		dtou = req.get('dtou');

	console.info('got data terms of use header', dtou);
	// console.info('POST /api/',cname,id, ' -> ', req.body, typeof req.body, 'rawbody ', req.rawbody);

	findCollection(cname).then((chost) => {
		if (!chost) {
			console.error("Could not find collection ", cname, " returning 404");
			return res.status(400).send('Could not find collection');
		}
		if (chost && chost.id === config.id) {
			// local commit!
			console.info('local hit on collection > ', cname);
			return db.collection(cname).save(_.extend({_id:id}, req.body)).then((resp) => {
				console.info('success inserting ');
				res.status(200).send('ok');
			}).catch((err) => {
				console.error("something went wrong fetching ", cname, " > ", id);
				res.status(400).send(err.toString());
			});
		}
		// remote commit, so ask appropriate peer
		console.log('asking chost ', chost.id, ' - ', req.url);
		postPeer(chost, req.originalUrl, req.body).then(function(remote_response) {
			console.info('peer response', remote_response);
			res.status(200).send(""+remote_response);
		});
	});

});


// app.post('/api/:collection/:id', function(req,res) {
// 	console.log('req.body ', req.body);
// 	res.status(200).send('hi');
// });

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
