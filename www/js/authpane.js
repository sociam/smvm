/* global console,  angular, $ */

angular.module('smvm').component('authpane', {
    templateUrl:'tmpl/authpane.html',
    bindings:{},
    controller:function($scope) {
        console.log('authpane');
        $scope.baseurl = document.location.toString();

    }
});
