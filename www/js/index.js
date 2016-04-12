/* global console,  angular, $, window */

angular.module('smvm', [])
    .controller('main', function($scope) {
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
