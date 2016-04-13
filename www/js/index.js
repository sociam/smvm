/* global console,  angular, $, window */

angular.module('smvm', [])
    .service( 'network', function() {
        var post = (url, args) => {
            return Promise.resolve($.ajax({url:url, contentType:'application/json', method:'post',data:JSON.stringify(args) }));
        }, get = (url, args) => {
            return Promise.resolve($.ajax({url:url, contentType:'application/json', method:'GET', data:args}));
        };
        this.checkAuth = () => get('/api/check');
        this.register = (username, password) => post('/api/newuser', {username:username,password:password});
        this.auth = (username, password) => post('/api/auth', {username:username,password:password});
        this.generateKey = () => get('/api/generateKey');
    }).service('storage', function() {
        var this_ = this,
            name="smvm",
            PDB_OPTIONS = {};
        this._loadp = new Promise((acc,rej) => {
            new PouchDB(name, PDB_OPTIONS, function(err, db) {
                if (!err) { 
                    this_.db = db; 
                    return acc(db);
                }
                throw err;
            });
        });
        this.getDB = () => this._loadp;
    }).controller('main', function($scope) {
        window.post = (url, args) => {
            return $.ajax({url:url,
                    contentType:'application/json',
                    method:'post',
                    data:JSON.stringify(args),
            });
        };
        window.posti = (instname, args) => {
            console.log('args ', JSON.stringify(args));
            return $.ajax({url:`/instances/${instname}`,
                contentType:'application/json',
                method:'post',
                data:JSON.stringify(args),
            });
        };
        window.geti = (instname, args) => {
            return $.ajax({url:`/instances/${instname}`,
                    contentType:'application/json',
                    method:'GET'
            });
        };
        window.auth = (username, password) => {
            return window.post('/api/newuser', {username:username,password:password}).then(() => {
                console.log('called newuser');
                return window.post('/api/auth', {username:username,password:password});
            });
        };
        window.postDoc = (collection, id, doc, dtou) => {
            return $.ajax({url:`/api/${collection}/${id}`,
                    contentType:'application/json',
                    method:'post',
                    data:JSON.stringify(doc),
                    headers: dtou !== undefined ? { dtou:JSON.stingify(dtou) } : undefined
            }); // .then((x) => {console.log(x); return x;});
        };
        window.getDoc = (collection, id, dtou_asserts) => {
            return $.ajax({url:`/api/${collection}/${id}`,
                contentType:'application/json',
                method:'GET',
                headers: dtou_asserts !== undefined ? {
                    dtou:JSON.stingify(dtou_asserts)
                } : undefined
            }); // .then((x) => {console.log(x); return x;});
        };
    });
