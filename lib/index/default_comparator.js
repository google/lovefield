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
goog.require('lf.index.Comparator');
goog.require('lf.index.Favor');
goog.require('lf.index.SingleKeyRange');
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
      } :
      function(opt_keyRange) {
        return opt_keyRange || null;
      };
};
goog.inherits(lf.index.SimpleComparator, lf.index.Comparator);


/**
 * @param {!lf.index.Index.SingleKey} lhs
 * @param {!lf.index.Index.SingleKey} rhs
 * @return {!lf.index.Favor}
 */
lf.index.SimpleComparator.compareAscending = function(lhs, rhs) {
  return lhs > rhs ?
      lf.index.Favor.LHS :
      (lhs < rhs ? lf.index.Favor.RHS : lf.index.Favor.TIE);
};


/**
 * @param {!lf.index.Index.SingleKey} lhs
 * @param {!lf.index.Index.SingleKey} rhs
 * @return {!lf.index.Favor}
 */
lf.index.SimpleComparator.compareDescending = function(lhs, rhs) {
  return lhs > rhs ?
      lf.index.Favor.RHS :
      (lhs < rhs ? lf.index.Favor.LHS : lf.index.Favor.TIE);
};


/**
 * Checks if the range covers "left" or "right" of the key (inclusive).
 * For example:
 *
 * key is 2, comparator ASC
 *
 * |-----|-----X-----|-----|
 * 0     1     2     3     4
 *
 * range [0, 4] and [2, 2] cover both left and right, so return [true, true].
 * range [0, 2) covers only left, return [true, false].
 * range (2, 0] covers only right, return [false, true].
 *
 * @see {Comparator#compareRange}
 * @param {!function(!lf.index.Index.SingleKey, !lf.index.Index.SingleKey):
 *     !lf.index.Favor} fn
 * @param {!lf.index.Index.SingleKey} key
 * @param {!lf.index.SingleKeyRange} range Normalized range.
 * @return {!Array<boolean>}
 */
lf.index.SimpleComparator.compareRange = function(fn, key, range) {
  var LEFT = 0;
  var RIGHT = 1;
  var results = [goog.isNull(range.from), goog.isNull(range.to)];
  if (!results[LEFT]) {
    var favor = fn(key, /** @type {!lf.index.Index.SingleKey} */ (range.from));
    results[LEFT] = range.excludeLower ?
        favor == lf.index.Favor.LHS :
        favor != lf.index.Favor.RHS;
  }

  if (!results[RIGHT]) {
    var favor = fn(key, /** @type {!lf.index.Index.SingleKey} */ (range.to));
    results[RIGHT] = range.excludeUpper ?
        favor == lf.index.Favor.RHS :
        favor != lf.index.Favor.LHS;
  }

  return results;
};


/** @override */
lf.index.SimpleComparator.prototype.compare = function(lhs, rhs) {
  return this.compare_(lhs, rhs);
};


/** @override */
lf.index.SimpleComparator.prototype.compareRange = function(key, range) {
  return lf.index.SimpleComparator.compareRange(this.compare_, key, range);
};


/** @override */
lf.index.SimpleComparator.prototype.min = function(lhs, rhs) {
  return lhs < rhs ? lf.index.Favor.LHS :
      (lhs == rhs ? lf.index.Favor.TIE : lf.index.Favor.RHS);
};


/** @override */
lf.index.SimpleComparator.prototype.max = function(lhs, rhs) {
  return lhs > rhs ? lf.index.Favor.LHS :
      (lhs == rhs ? lf.index.Favor.TIE : lf.index.Favor.RHS);
};


/** @override */
lf.index.SimpleComparator.prototype.isInRange = function(key, range) {
  var results = lf.index.SimpleComparator.compareRange(
      this.compare_, key, range);
  return results[0] && results[1];
};


/** @override */
lf.index.SimpleComparator.prototype.normalizeKeyRange = function(opt_keyRange) {
  return this.normalizeKeyRange_(opt_keyRange);
};


/** @override */
lf.index.SimpleComparator.prototype.bindKeyRange = function(
    leftMostKey, rightMostKey, opt_keyRange) {
  if (goog.isDefAndNotNull(opt_keyRange)) {
    if (goog.isNull(opt_keyRange.from)) {
      opt_keyRange.from = leftMostKey;
    }
    if (goog.isNull(opt_keyRange.to)) {
      opt_keyRange.to = rightMostKey;
    }

    return opt_keyRange;
  }

  return new lf.index.SingleKeyRange(leftMostKey, rightMostKey, false, false);
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
 *                   !lf.index.Index.SingleKey): lf.index.Favor} fn
 * @return {!lf.index.Favor}
 * @private
 */
lf.index.MultiKeyComparator.prototype.forEach_ = function(lhs, rhs, fn) {
  var favor = lf.index.Favor.TIE;
  for (var i = 0;
      i < this.comparators_.length && favor == lf.index.Favor.TIE;
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


/** @override */
lf.index.MultiKeyComparator.prototype.compareRange = function(key, range) {
  var results = [true, true];
  for (var i = 0;
      i < this.comparators_.length && (results[0] || results[1]);
      ++i) {
    var dimensionResults = this.comparators_[i].compareRange(key[i], range[i]);
    results[0] = results[0] && dimensionResults[0];
    results[1] = results[1] && dimensionResults[1];
  }
  return results;
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
lf.index.MultiKeyComparator.prototype.normalizeKeyRange =
    function(opt_keyRange) {
  if (!goog.isDefAndNotNull(opt_keyRange)) {
    return null;
  }

  return opt_keyRange.map(function(range, index) {
    return this.comparators_[index].normalizeKeyRange(range);
  }, this);
};


/** @override */
lf.index.MultiKeyComparator.prototype.bindKeyRange = function(
    leftMostKey, rightMostKey, opt_keyRange) {
  return this.comparators_.map(
      function(c, i) {
        return goog.isDefAndNotNull(opt_keyRange) ?
            c.bindKeyRange(leftMostKey[i], rightMostKey[i], opt_keyRange[i]) :
            c.bindKeyRange(leftMostKey[i], rightMostKey[i], undefined);
      }, this);
};
