/* jshint strict:false */
/* global console, require */

const crypto = require('crypto');

var create_keypair = () => { 
	var prime_length = 60,
		diffHell = crypto.createDiffieHellman(prime_length);

	diffHell.generateKeys('base64');
	console.log("Public Key : " ,diffHell.getPublicKey('base64'));
	console.log("Private Key : " ,diffHell.getPrivateKey('base64'));

	console.log("Public Key : " ,diffHell.getPublicKey('hex'));
	console.log("Private Key : " ,diffHell.getPrivateKey('hex'));
	return diffHell;
};

create_keypair();