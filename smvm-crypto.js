/* jshint strict:false */
/* global console, require */

var crypto = require('crypto'),ursa = require('ursa');

var exports = module.exports = {
	create_keypair : () => ursa.generatePrivateKey(1024, 65537),
	getPublicKey : (key) => key.toPublicPem().toString(),
	loadKey:(priv_pem) => ursa.createPrivateKey(priv_pem),
	encryptObj:(key, data) => key.privateEncrypt(JSON.stringify(data), 'utf8', 'base64'),
	decryptObj:(key, base64) => JSON.parse(key.publicDecrypt(base64, 'base64', 'utf8'))
};


// kp = exports.create_keypair();
// kp2 = ursa.createPrivateKey(kp.toPrivatePem());


module.exports = exports;