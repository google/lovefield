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
 *
 * @fileoverview Provides default comparators. The comparators in this file
 * use the following logic for compare: whoever has a bigger array index wins.
 * For example, DESC order for (3, 5), since 3 shall have a bigger array index
 * when sorted descending, it wins the comparison.
 */
goog.provide('lf.index.ComparatorFactory');
goog.provide('lf.index.MultiKeyComparator');
goog.provide('lf.index.SimpleComparator');

goog.require('lf.Order');
goog.require('lf.index');
goog.require('lf.index.Comparator');
goog.forwardDeclare('lf.schema.Index');


/**
 * @param {!lf.schema.Index} indexSchema
 * @return {!lf.index.Comparator}
 */
lf.index.ComparatorFactory.create = function(indexSchema) {
  // TODO(arthurhsu): implement the real factory.
  return new lf.index.SimpleComparator(lf.Order.ASC);
};



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
  return lhs > rhs ?
      lf.index.FAVOR.LHS :
      (lhs < rhs ? lf.index.FAVOR.RHS : lf.index.FAVOR.TIE);
};


/**
 * @param {(string|number)} lhs
 * @param {(string|number)} rhs
 * @return {number} -1: favor rhs, 0: equal, 1: favor lhs
 */
lf.index.SimpleComparator.compareDescending = function(lhs, rhs) {
  return lhs > rhs ?
      lf.index.FAVOR.RHS :
      (lhs < rhs ? lf.index.FAVOR.LHS : lf.index.FAVOR.TIE);
};


/**
 * @param {!lf.index.Comparator.FunctionType} fn
 * @param {!lf.index.Index.Key|!Array<(string|number)>} key
 * @param {!lf.index.KeyRange} range
 * @return {boolean}
 */
lf.index.SimpleComparator.isInRange = function(fn, key, range) {
  var lowerBoundCheck = goog.isNull(range.from);
  if (!lowerBoundCheck) {
    var favor = fn(key, /** @type {!lf.index.Index.Key} */ (range.from));
    lowerBoundCheck = range.excludeLower ?
        favor == lf.index.FAVOR.LHS :
        favor != lf.index.FAVOR.RHS;
  }

  var upperBoundCheck = goog.isNull(range.to);
  if (!upperBoundCheck) {
    var favor = fn(key, /** @type {!lf.index.Index.Key} */ (range.to));
    upperBoundCheck = range.excludeUpper ?
        favor == lf.index.FAVOR.RHS :
        favor != lf.index.FAVOR.LHS;
  }

  return lowerBoundCheck && upperBoundCheck;
};


/** @override */
lf.index.SimpleComparator.prototype.compare = function(lhs, rhs) {
  return this.compare_(lhs, rhs);
};


/** @override */
lf.index.SimpleComparator.prototype.isInRange = function(key, range) {
  return lf.index.SimpleComparator.isInRange(this.compare_, key, range);
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


/** @override */
lf.index.MultiKeyComparator.prototype.isInRange = function(key, range) {
  // TODO(arthurhsu): implement
};
