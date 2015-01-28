/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
goog.provide('lf.index.MultiKeyComparator');
goog.provide('lf.index.SimpleComparator');

goog.require('lf.Order');
goog.require('lf.index.Comparator');



/**
 * @implements {lf.index.Comparator}
 * @constructor
 *
 * @param {!lf.Order} order
 */
lf.index.SimpleComparator = function(order) {
  /** @private {!Function} */
  this.compare_ = (order == lf.Order.DESC) ?
      lf.index.SimpleComparator.compareDescending :
      lf.index.SimpleComparator.compareAscending;
};


/**
 * @param {(string|number)} lhs
 * @param {(string|number)} rhs
 * @return {number} -1: favor rhs, 0: equal, 1: favor lhs
 */
lf.index.SimpleComparator.compareAscending = function(lhs, rhs) {
  return lhs > rhs ? 1 : (lhs < rhs ? -1 : 0);
};


/**
 * @param {(string|number)} lhs
 * @param {(string|number)} rhs
 * @return {number} -1: favor rhs, 0: equal, 1: favor lhs
 */
lf.index.SimpleComparator.compareDescending = function(lhs, rhs) {
  return lhs > rhs ? -1 : (lhs < rhs ? 1 : 0);
};


/** @override */
lf.index.SimpleComparator.prototype.compare = function(lhs, rhs) {
  return this.compare_(lhs, rhs);
};



/**
 * @implements {lf.index.Comparator}
 * @constructor
 *
 * @param {!Array<!lf.Order>} orders
 */
lf.index.MultiKeyComparator = function(orders) {
  /** @private {!Array<!Function>} */
  this.comparators_ = orders.map(function(order) {
    return order == lf.Order.DESC ?
        lf.index.SimpleComparator.compareDescending :
        lf.index.SimpleComparator.compareAscending;
  });
};


/**
 * @param {number} numKeys
 * @param {!lf.Order} order
 * @return {!Array<!lf.Order>}
 */
lf.index.MultiKeyComparator.createOrders = function(numKeys, order) {
  var orders = new Array(numKeys);
  for (var i = 0; i < numKeys; ++i) {
    orders[i] = order;
  }
  return orders;
};


/** @override */
lf.index.MultiKeyComparator.prototype.compare = function(lhs, rhs) {
  var base = 0;
  for (var i = 0; i < this.comparators_.length && base == 0; ++i) {
    base = this.comparators_[i](lhs[i], rhs[i]);
  }
  return base;
};
