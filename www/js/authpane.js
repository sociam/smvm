/* global console,  angular, $ */

angular.module('smvm').component('authpane', {
    templateUrl:'tmpl/authpane.html',
    bindings:{},
    controller:function($scope) {
        console.log('authpane');
        $scope.baseurl = document.location.toString();

    }
}).factory( 'network', function(){

    var post = (url, args) => {
        return Promise.resolve($.ajax({url:url,
                contentType:'application/json',
                method:'post',
                data:JSON.stringify(args),
        }));
    }, get = (url, args) => {
        return Promise.resolve($.ajax({url:url, contentType:'application/json', method:'GET', data:args}));
    };

    this.checkAuth = () => get('/api/check');
    this.register = (username, password) => post('/api/newuser', {username:username,password:password});
    this.auth = (username, password) => post('/api/auth', {username:username,password:password});

    // this.postDoc = (collection, id, doc, dtou) => {
    //     return Promise.resolve($.ajax({url:`/api/${collection}/${id}`,
    //             contentType:'application/json',
    //             method:'post',
    //             data:JSON.stringify(doc),
    //             headers: dtou !== undefined ? { dtou:JSON.stingify(dtou) } : undefined
    //     }_); // .then((x) => {console.log(x); return x;});
    // };
    // this.getDoc = (collection, id, dtou_asserts) => {
    //     return Promise.resolve($.ajax({url:`/api/${collection}/${id}`,
    //         contentType:'application/json',
    //         method:'GET',
    //         headers: dtou_asserts !== undefined ? {
    //             dtou:JSON.stingify(dtou_asserts)
    //         } : undefined
    //     })); // .then((x) => {console.log(x); return x;});
    // };
});
