/* jshint strict:false */
/* global console, require, process */

var express = require('express'),
	app = express(),
	_ = require('lodash'),
	Promise = require('bluebird'),
	mongo = require('mongodb-bluebird'),
	bodyParser = require('body-parser'),
	fs = require('fs'),	
	config_file = process.argv.length > 2 ? process.argv[2] : './config.json',
	config = JSON.parse(fs.readFileSync(config_file)),
	http = require('http'),
	cookieParser = require('cookie-parser'),
	snet = require('./smvm-net'),
	scrypto = require('./smvm-crypto'),
	sauth = require('./smvm-auth'),
	scomponents = require('./smvm-components'),
	host_key;

console.info('initialising with config ', config_file);
// set up middleware

// connect to the db -- which is at config.db
console.log('PIES instance:', config.id, ' port:', config.port, ' database:', config.db);

// key management -->
if (config.privkey === undefined) { 
	// const out_file = [config_file,'-key.json'].join('');
	config.privkey = scrypto.create_keypair().toPrivatePem().toString();
	fs.writeFileSync(config_file, JSON.stringify(config, null, 4));
	console.info('No private key, creating one for you and it writing to ', config_file, JSON.stringify(config, null, 4));	
}
host_key = scrypto.loadKey(config.privkey);

snet.connect(host_key).then((db) => {
	// snet kicks things off!
	snet.register(app, db, host_key);
	sauth.register(app, db, host_key); // register auth
	scomponents.register(app, db, host_key); // 
});

// register middleware
app.use(bodyParser.json()); // for parsing application/json
app.use(cookieParser());
app.use('/', express.static('www'));


var server = http.createServer(app);

// http.createServer(app).listen(3000);
server.listen(config.port, function() { });
