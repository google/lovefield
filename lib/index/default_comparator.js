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

goog.require('goog.functions');
goog.require('lf.Order');
goog.require('lf.index');
goog.require('lf.index.Comparator');
goog.forwardDeclare('lf.schema.Index');


/**
 * @param {!lf.schema.Index} indexSchema
 * @return {!lf.index.Comparator}
 */
lf.index.ComparatorFactory.create = function(indexSchema) {
  if (indexSchema.columns.length == 1) {
    return new lf.index.SimpleComparator(indexSchema.columns[0].order);
  }

  var orders = indexSchema.columns.map(function(col) {
    return col.order;
  });
  return new lf.index.MultiKeyComparator(orders);
};



/**
 * @extends {lf.index.Comparator.<!lf.index.Index.SingleKey, !lf.index.SingleKeyRange>}
 * @constructor
 *
 * @param {!lf.Order} order
 */
lf.index.SimpleComparator = function(order) {
  lf.index.SimpleComparator.base(this, 'constructor');

  /** @private {!Function} */
  this.compare_ = (order == lf.Order.DESC) ?
      lf.index.SimpleComparator.compareDescending :
      lf.index.SimpleComparator.compareAscending;

  /** @private {!Function} */
  this.normalizeKeyRange_ = (order == lf.Order.DESC) ?
      function(opt_keyRange) {
        return goog.isDefAndNotNull(opt_keyRange) ?
            opt_keyRange.reverse() : null;
      } : goog.functions.identity;
};
goog.inherits(lf.index.SimpleComparator, lf.index.Comparator);


/**
 * @param {!lf.index.Index.SingleKey} lhs
 * @param {!lf.index.Index.SingleKey} rhs
 * @return {!lf.index.FAVOR}
 */
lf.index.SimpleComparator.compareAscending = function(lhs, rhs) {
  return lhs > rhs ?
      lf.index.FAVOR.LHS :
      (lhs < rhs ? lf.index.FAVOR.RHS : lf.index.FAVOR.TIE);
};


/**
 * @param {!lf.index.Index.SingleKey} lhs
 * @param {!lf.index.Index.SingleKey} rhs
 * @return {!lf.index.FAVOR}
 */
lf.index.SimpleComparator.compareDescending = function(lhs, rhs) {
  return lhs > rhs ?
      lf.index.FAVOR.RHS :
      (lhs < rhs ? lf.index.FAVOR.LHS : lf.index.FAVOR.TIE);
};


/**
 * @param {!function(!lf.index.Index.SingleKey, !lf.index.Index.SingleKey):
 *     !lf.index.FAVOR} fn
 * @param {!lf.index.Index.SingleKey} key
 * @param {!lf.index.SingleKeyRange} range
 * @return {boolean}
 */
lf.index.SimpleComparator.isInRange = function(fn, key, range) {
  var lowerBoundCheck = goog.isNull(range.from);
  if (!lowerBoundCheck) {
    var favor = fn(key, /** @type {!lf.index.Index.SingleKey} */ (range.from));
    lowerBoundCheck = range.excludeLower ?
        favor == lf.index.FAVOR.LHS :
        favor != lf.index.FAVOR.RHS;
  }

  var upperBoundCheck = goog.isNull(range.to);
  if (!upperBoundCheck) {
    var favor = fn(key, /** @type {!lf.index.Index.SingleKey} */ (range.to));
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
lf.index.SimpleComparator.prototype.min = function(lhs, rhs) {
  return lhs < rhs ? lf.index.FAVOR.LHS :
      (lhs == rhs ? lf.index.FAVOR.TIE : lf.index.FAVOR.RHS);
};


/** @override */
lf.index.SimpleComparator.prototype.max = function(lhs, rhs) {
  return lhs > rhs ? lf.index.FAVOR.LHS :
      (lhs == rhs ? lf.index.FAVOR.TIE : lf.index.FAVOR.RHS);
};


/** @override */
lf.index.SimpleComparator.prototype.isInRange = function(key, range) {
  return lf.index.SimpleComparator.isInRange(this.compare_, key, range);
};


/** @override */
lf.index.SimpleComparator.prototype.normalizeKeyRange = function(keyRange) {
  return this.normalizeKeyRange_(keyRange);
};


/** @override */
lf.index.SimpleComparator.prototype.toString = function() {
  return this.compare_ == lf.index.SimpleComparator.compareDescending ?
      'SimpleComparator_DESC' : 'SimpleComparator_ASC';
};



/**
 * @extends {lf.index.Comparator.<!lf.index.Index.Key, !lf.index.KeyRange>}
 * @constructor
 *
 * @param {!Array<!lf.Order>} orders
 */
lf.index.MultiKeyComparator = function(orders) {
  lf.index.MultiKeyComparator.base(this, 'constructor');

  /** @private {!Array<!lf.index.SimpleComparator>} */
  this.comparators_ = orders.map(function(order) {
    return new lf.index.SimpleComparator(order);
  });
};
goog.inherits(lf.index.MultiKeyComparator, lf.index.Comparator);


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


/**
 * @param {!lf.index.Index.Key} lhs
 * @param {!lf.index.Index.Key} rhs
 * @param {!function(!lf.index.SimpleComparator,
 *                   !lf.index.Index.SingleKey,
 *                   !lf.index.Index.SingleKey): lf.index.FAVOR} fn
 * @return {!lf.index.FAVOR}
 * @private
 */
lf.index.MultiKeyComparator.prototype.forEach_ = function(lhs, rhs, fn) {
  var favor = lf.index.FAVOR.TIE;
  for (var i = 0;
      i < this.comparators_.length && favor == lf.index.FAVOR.TIE;
      ++i) {
    favor = fn(this.comparators_[i], lhs[i], rhs[i]);
  }
  return favor;
};


/** @override */
lf.index.MultiKeyComparator.prototype.compare = function(lhs, rhs) {
  return this.forEach_(lhs, rhs, function(c, l, r) {
    return c.compare(l, r);
  });
};


/** @override */
lf.index.MultiKeyComparator.prototype.min = function(lhs, rhs) {
  return this.forEach_(lhs, rhs, function(c, l, r) {
    return c.min(l, r);
  });
};


/** @override */
lf.index.MultiKeyComparator.prototype.max = function(lhs, rhs) {
  return this.forEach_(lhs, rhs, function(c, l, r) {
    return c.max(l, r);
  });
};


/**
 * The range must have same dimensions as key.
 * TODO(arthurhsu): relax this restriction if performance issue surfaced later.
 * @override
 */
lf.index.MultiKeyComparator.prototype.isInRange = function(key, range) {
  var isInRange = true;
  for (var i = 0; i < this.comparators_.length && isInRange; ++i) {
    isInRange = this.comparators_[i].isInRange(key[i], range[i]);
  }
  return isInRange;
};


/**
 * The keyRange must have same or less dimensions as the orders given in the
 * constructor.
 * @override
 */
lf.index.MultiKeyComparator.prototype.normalizeKeyRange = function(keyRange) {
  return keyRange.map(function(range, index) {
    return this.comparators_[index].normalizeKeyRange(range);
  }, this);
};
