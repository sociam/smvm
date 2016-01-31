/* global _, moment, console, require */
// jshint strict:false

var express = require('express'),
	app = express(),
	_ = require('lodash'),
	Promise = require('bluebird'),
	mongo = require('mongodb-bluebird'),
	bodyParser = require('body-parser'),
	multer = require('multer'), // v1.0.5
	upload = multer(),
	db;

// set up middleware
app.use(bodyParser.json()); // for parsing application/json

// set up static
app.use('/', express.static('www'));

// connect to the db
mongo.connect("mongodb://localhost:27017/dtou").then(function(db_) {
	db = db_;
    console.log('connected');

    // //close connection to the database
    // return db.close().then(function() {
    //     console.log('success');
    // });
}).catch(function(err) { console.error("something went wrong"); });	


// respond with "hello world" when a GET request is made to the homepage
// app.get('/', function(req, res) { res.send('hello world'); });
app.get('/api/:collection/:id', function(req,res) { 
	console.log(' collection:', req.params.collection.trim(), ' id:', req.params.id);
	var c = db.collection(req.params.collection);
    return c.find().then(function(docs) {
        // console.log(docs);
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
