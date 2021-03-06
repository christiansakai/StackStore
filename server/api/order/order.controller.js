'use strict';

var _ = require('lodash');
var Order = require('./order.model');
var User = require('../user/user.model');
var Product = require('../product/product.model');
var Promo = require('../promo/promo.model');
var async = require('async');

// Get list of orders
exports.index = function(req, res) {
  Order.find()
    .populate({path: 'promoApplied', model:'Promo'})
    .exec(function(err, orders){
      if(err) { return handleError(res, err); }
      if(!orders) return res.send(404);
      return res.json(200, orders);
    })
};

// Get a single order
exports.show = function(req, res) {
  Order.findById(req.params.id, function (err, order) {
    if(err) { return handleError(res, err); }
    if(!order) { return res.send(404); }
    return res.json(order);
  });
};

// Creates a new order in the DB.
exports.create = function(req, res) {
  var userId = req.user._id;
  var cart, user, storeOwnerOrders;

  User.findById(userId)
    .populate('cart')
    .exec(function(err, user){
      var handleBuyerOrder = function(buyerOrderHandled) {
        user = user;
        cart = user.cart.map(function(item) { return item; })
        if(!cart) res.send(404, "No cart...");
        if(cart.length == 0) res.send(404, "Cart is empty!");
        var newOrder = new Order();
        newOrder.buyer = req.user._id;
        newOrder.products = [];
        newOrder.status = "Created";
        newOrder.chargeId = req.body.chargeId;
        if(req.body.promo) newOrder.promoApplied = req.body.promo;

        //build hash of storeowners key: storeOwnerId, obj { products: [] }
        var storeHash = {};
        cart.forEach(function(item){
          newOrder.products.push({
            _id: item._id,
            name: item.name,
            active: item.active,
            upvotes: item.upvotes,
            storeId: item.storeId,
            owner: item.owner,
            price: item.price,
            description: item.description,
            inventory: item.inventory,
            tags: item.tags,
            comments: item.comments
          }); //need flat version of products instead of references so we know the price at which the item was bought
          if(!storeHash.hasOwnProperty(item.owner)) storeHash[item.owner] = { products: [] };
          storeHash[item.owner].products.push(item);
        })

        storeOwnerOrders = [];
        for(var owner in storeHash) {
          newOrder.storeOwner.push(owner);
        }

        newOrder.save(function(err, order){
          console.log('saved buyer order', order)
          user.orders.push(order._id);
          user.cart = []; //empty cart after order is fulfilled
          for(var owner in storeHash) {
            var tempOrder = new Order();
            tempOrder.buyer = req.user._id;
            tempOrder.storeOwner.push(owner); //him/herself
            storeHash[owner].products.forEach(function(item){
              tempOrder.products.push({
                _id: item._id,
                name: item.name,
                active: item.active,
                upvotes: item.upvotes,
                storeId: item.storeId,
                owner: item.owner,
                price: item.price,
                description: item.description,
                inventory: item.inventory,
                tags: item.tags,
                comments: item.comments
              })
            })
            tempOrder.status = "Created";
            tempOrder.chargeId = req.body.chargeId;
            tempOrder.buyerOrder = order._id;
            if(req.body.promo) tempOrder.promoApplied = req.body.promo;
            storeOwnerOrders.push(tempOrder);
          }
          user.save(function(err, user) {
            buyerOrderHandled(err, "finish doing stuff with order");
          })
        })
      };

      var handleStoreOwnerOrders = function(storeOrdersHandled) {
        //make orders for every storeowner in storeHash
        var makeOrder = function(oneOrder, doneOneOrder) {
          oneOrder.save(function(err, order) {
            var id = (order['storeOwner'])[0];
            console.log('saved owner order', id, order)
            User.findById(id)
              .populate('cart')
              .exec(function(err, owner){
                owner.orders.push(order._id);
                owner.save(function(err, owner){
                  doneOneOrder(err);
                })
              })
          });
        };

        async.each(storeOwnerOrders, makeOrder, function(err) {
          storeOrdersHandled(err, "Finished store owner orders.");
        });
      };

      async.series([handleBuyerOrder, handleStoreOwnerOrders], function(err, results) {
        if(err) res.json(404);
        res.json(200);
      });
    });
};

// Updates an existing order in the DB.
exports.update = function(req, res) {
  // if(req.body._id) { delete req.body._id; }
  console.log('req.params.id', req.params.id)
  console.log('req.body', req.body)
  Order.findById(req.params.id)
    .populate('buyerOrder')
    .exec(function(err, order){
      if (err) { return handleError(res, err); }
      if(!order) { return res.send(404); }
      console.log('order', order)
      if(req.body.promoApplied) req.body.promoApplied = req.body.promoApplied._id;
      if(req.body.buyerOrder) req.body.buyerOrder = req.body.buyerOrder._id;
      var updated = _.merge(order, req.body);
      updated.save(function (err, updatedOrder) {
        if (err) { return handleError(res, err); }
        Order.findOne({_id: updatedOrder._id})
        .populate('buyerOrder')
        .exec(function(err, finalOrder){
          return res.json(200, finalOrder);
        })
      });
    })
};

// Deletes a order from the DB.
exports.destroy = function(req, res) {
  Order.findById(req.params.id, function (err, order) {
    if(err) { return handleError(res, err); }
    if(!order) { return res.send(404); }
    order.remove(function(err) {
      if(err) { return handleError(res, err); }
      return res.send(204);
    });
  });
};

function handleError(res, err) {
  return res.send(500, err);
}
