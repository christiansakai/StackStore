'use strict';

angular.module('stackStoreApp')

.controller('StoreAdminCtrl', function($scope, $http, $location, Auth, $stateParams, User, Product, socket, Store) {

    $scope.owner = false;
    $scope.storeName = $stateParams.name;
    $scope.store = {};

    $scope.name = '';
    $scope.info = '';
    $scope.price = '';

    //Get Owner ID of current store
    User.get().$promise
        .then(function(user) {
            var store = Store.get({
                name: $stateParams.name
            }, function(store) {
                if (user._id === store.owner) {
                    $scope.owner = true;
                    $scope.store = store;
                } else {
                    $location.path('/store/' + $stateParams.name);
                }
            })
        })
        .then(null, function(err) {
            $location.path('/store/' + $stateParams.name);
        })

    //Add a new product
    $scope.addProduct = function() {
        if ($scope.name === '') {
            return;
        }
        if ($scope.info === '') {
            return;
        }
        if ($scope.price === '') {
            return;
        }

        Product.save({
            name: $scope.name,
            info: $scope.info,
            price: $scope.price,
            owner: $scope.ownerId,
            storeName: $scope.storeName
        }, function(product) {
            console.log(product);
            Store.get({
                name: $stateParams.name
            }, function(store) {
                console.log(store);
                $scope.store = store;
            });
        })

    }

    $scope.deleteProduct = function(id) {
        Product.remove({
            id: id,
            storeName: $scope.storeName
        }, function(product) {
            console.log(product);
            Store.get({
                name: $stateParams.name
            }, function(store) {
                console.log(store);
                $scope.store = store;

            });
        })

    }
});
