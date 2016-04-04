/* jshint strict:false */
/* global console, require, module */

const conn_by_token = {}, 
	crypto = require('crypto'),
	md5 = require('MD5');	

var makeToken = () => { 
	return new Promise((res) => { 
		crypto.randomBytes(48, (ex, buf) => {  res(buf.toString('hex')); });
	});
};

module.exports = { 
	getRequestUser: function(req) { 
		var token = this.getAuthToken(req); // req.cookies && req.cookies.authtoken;
		if (token && conn_by_token[token] !== undefined) {
			return conn_by_token[token].user;
		}
	},
	getAuthToken:(req) => {
		// console.info('auth token ', req.path, req.get('authtoken'));
		return req.cookies && req.cookies.authtoken || req.get('authtoken');		
	},
	register: (app, db) => {
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

			db.collection('users').save({_id:username, passhash:passhash}).then(() => { 
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
	}
};

