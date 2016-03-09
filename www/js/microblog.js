/* global console,  angular, $, window */

angular.module('dtou', [])
    .controller('microblog', function($scope) {

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