/* global console, require */

var express = require('express'),
	app = express(),
	_ = require('lodash'),
	// Promise = require('bluebird'),
	mongo = require('mongodb-bluebird'),
	bodyParser = require('body-parser'),
	multer = require('multer'), // v1.0.5
	upload = multer(),
	config = require('./config'),
	db, tracker, peers;

// set up middleware
app.use(bodyParser.json()); // for parsing application/json

// set up static
app.use('/', express.static('www'));

// connect to the db
console.log('connecting to ', config);
var connect = mongo.connect(config.tracker).then((tr) => {
	console.info('connected to tracker ', config.tracker);
	tracker = tr;
	return mongo.connect("mongodb://localhost:27017/dtou");
}).then((db_) => { db = db_; }).catch((err) => { console.error("could not connect to tracker"); });

connect.then(() => {
	// insert ourselves in the tracker
	tracker.collection('nodes').find({_id:config.owner.id}).then(function(d) {
		// record ourselves in there:
		var us = _.pick(config,['name','id']);
		peers = (d && d.nodes || []).filter((x) => (x.id === !config.id));
		return tracker.collection('nodes').save({_id:config.owner.id,nodes:peers.concat(us)});
	}).then(() => {
		// let's make contact with the peers
		console.log('done inserting ');
	});
});

app.get('/api/collections', function(req,res) {
		db.collections().then((x) => {
			res.status(200).send(x.map((x) => x.s.name));
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


app.listen(3000);
