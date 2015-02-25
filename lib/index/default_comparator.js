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
 * @extends {lf.index.Comparator.<
 *     !lf.index.Index.SingleKey, !lf.index.SingleKeyRange>}
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

  /** @private {!Function} */
  this.orderRange_ = (order == lf.Order.DESC) ?
      lf.index.SimpleComparator.orderRangeDescending :
      lf.index.SimpleComparator.orderRangeAscending;
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
  return lf.index.SimpleComparator.compareAscending(rhs, lhs);
};


/**
 * @param {boolean} a
 * @param {boolean} b
 * @return {boolean}
 */
lf.index.SimpleComparator.xor = function(a, b) {
  return a ? !b : b;
};


/**
 * @param {!lf.index.SingleKeyRange} lhs
 * @param {!lf.index.SingleKeyRange} rhs Shall not overlap with lhs.
 * @return {!lf.index.Favor}
 */
lf.index.SimpleComparator.orderRangeAscending = function(lhs, rhs) {
  var xor = lf.index.SimpleComparator.xor;
  var favor = lf.index.SimpleComparator.compareAscending(
      /** @type {!lf.index.Index.SingleKey} */ (lhs.from),
      /** @type {!lf.index.Index.SingleKey} */ (rhs.from));
  if (favor == lf.index.Favor.TIE) {
    if (xor(lhs.excludeLower, rhs.excludeLower)) {
      favor = lhs.excludeLower ? lf.index.Favor.LHS : lf.index.Favor.RHS;
    } else {
      favor = lf.index.SimpleComparator.compareAscending(
          /** @type {!lf.index.Index.SingleKey} */ (lhs.to),
          /** @type {!lf.index.Index.SingleKey} */ (rhs.to));
      if (favor == lf.index.Favor.TIE &&
          !xor(lhs.excludeUpper, rhs.excludeUpper)) {
        favor = lhs.excludeUpper ? lf.index.Favor.LHS : lf.index.Favor.RHS;
      }
    }
  }
  return favor;
};


/**
 * @param {!lf.index.SingleKeyRange} lhs
 * @param {!lf.index.SingleKeyRange} rhs
 * @return {!lf.index.Favor}
 */
lf.index.SimpleComparator.orderRangeDescending = function(lhs, rhs) {
  return lf.index.SimpleComparator.orderRangeAscending(rhs, lhs);
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
 * @override
 */
lf.index.SimpleComparator.prototype.compareRange = function(key, naturalRange) {
  var LEFT = 0;
  var RIGHT = 1;
  var range = this.normalizeKeyRange_(naturalRange);

  var results = [goog.isNull(range.from), goog.isNull(range.to)];
  if (!results[LEFT]) {
    var favor = this.compare_(key, range.from);
    results[LEFT] = range.excludeLower ?
        favor == lf.index.Favor.LHS :
        favor != lf.index.Favor.RHS;
  }

  if (!results[RIGHT]) {
    var favor = this.compare_(key, range.to);
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
  var results = this.compareRange(key, range);
  return results[0] && results[1];
};


/**
 * @param {!lf.index.Comparator} c
 * @param {!lf.index.Index.SingleKey|!Array<!lf.index.Index.SingleKey>} left
 * @param {!lf.index.Index.SingleKey|!Array<!lf.index.Index.SingleKey>} right
 * @return {!Array<!lf.index.Index.SingleKey>|
 *     !Array<!Array<!lf.index.Index.SingleKey>>}
 */
lf.index.SimpleComparator.getMinMaxKeys = function(c, left, right) {
  var minKey = left;
  var maxKey = right;
  var favor = c.min(left, right);
  if (favor != lf.index.Favor.LHS) {
    minKey = right;
    maxKey = left;
  }
  return [minKey, maxKey];
};


/**
 * @param {!lf.index.Index.SingleKey} leftMostKey
 * @param {!lf.index.Index.SingleKey} rightMostKey
 * @param {!lf.index.SingleKeyRange=} opt_keyRange
 * @return {?lf.index.SingleKeyRange} Returns null if provided key range is out
 *     of bound.
 */
lf.index.SimpleComparator.prototype.bindKeyRange = function(
    leftMostKey, rightMostKey, opt_keyRange) {
  var keys = /** @type {!Array<!lf.index.Index.SingleKey>} */ (
      lf.index.SimpleComparator.getMinMaxKeys(this, leftMostKey, rightMostKey));
  var range = new lf.index.SingleKeyRange(keys[0], keys[1], false, false);

  // Shortcut the undefined and all() case.
  if (!goog.isDef(opt_keyRange) || opt_keyRange.isAll()) {
    return range;
  }

  return opt_keyRange.getBounded(keys[0], keys[1]);
};


/**
 * @param {!lf.index.SingleKeyRange} lhs
 * @param {!lf.index.SingleKeyRange} rhs
 * @return {!lf.index.Favor}
 */
lf.index.SimpleComparator.prototype.orderKeyRange = function(lhs, rhs) {
  return this.orderRange_(lhs, rhs);
};


/** @override */
lf.index.SimpleComparator.prototype.bindAndSortKeyRanges = function(
    leftMostKey, rightMostKey, opt_keyRanges) {
  var outputKeyRanges;

  var keys = lf.index.SimpleComparator.getMinMaxKeys(
      this, leftMostKey, rightMostKey);
  if (goog.isDefAndNotNull(opt_keyRanges)) {
    outputKeyRanges = opt_keyRanges.map(function(range) {
      var boundKeyRange = this.bindKeyRange(keys[0], keys[1], range);
      return boundKeyRange;
    }, this).filter(function(range) {
      return !goog.isNull(range);
    }).sort(goog.bind(function(lhs, rhs) {
      return this.orderRange_(lhs, rhs);
    }, this));
  } else {
    outputKeyRanges = [this.bindKeyRange(keys[0], keys[1])];
  }

  return outputKeyRanges;
};


/** @override */
lf.index.SimpleComparator.prototype.rangeToKeys = function(naturalRange) {
  var range = this.normalizeKeyRange_(naturalRange);
  return [range.from, range.to];
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
 * @param {Array<!lf.index.Index.SingleKey>} leftMostKey
 * @param {!Array<!lf.index.Index.SingleKey>} rightMostKey
 * @param {!Array<!lf.index.SingleKeyRange>=} opt_keyRange
 * @return {!Array<!lf.index.SingleKeyRange>}
 * @private
 */
lf.index.MultiKeyComparator.prototype.bindKeyRange_ = function(
    leftMostKey, rightMostKey, opt_keyRange) {
  return this.comparators_.map(
      function(c, i) {
        return goog.isDefAndNotNull(opt_keyRange) ?
            c.bindKeyRange(leftMostKey[i], rightMostKey[i], opt_keyRange[i]) :
            c.bindKeyRange(leftMostKey[i], rightMostKey[i], undefined);
      }, this);
};


/** @override */
lf.index.MultiKeyComparator.prototype.bindAndSortKeyRanges = function(
    leftMostKey, rightMostKey, opt_keyRanges) {
  var keys = /** @type {!Array<!Array<lf.index.Index.SingleKey>>} */ (
      lf.index.SimpleComparator.getMinMaxKeys(this, leftMostKey, rightMostKey));
  var minKey = keys[0];
  var maxKey = keys[1];

  if (goog.isDefAndNotNull(opt_keyRanges)) {
    // Bound the given key ranges if they were open-ended.
    var outputKeyRanges = opt_keyRanges.map(function(range) {
      var boundKeyRange = this.bindKeyRange_(minKey, maxKey, range);
      return boundKeyRange;
    }, this).filter(function(range) {
      return range.every(goog.isDefAndNotNull);
    });

    // Ranges are in the format of
    // [[dim0_range0, dim1_range0, ...], [dim0_range1, dim1_range1, ...], ...]
    // Reorganize the array to
    // [[dim0_range0, dim0_range1, ...], [dim1_range0, dim1_range1, ...], ...]
    var keysPerDimensions = new Array(this.comparators_.length);
    for (var i = 0; i < keysPerDimensions.length; i++) {
      keysPerDimensions[i] = outputKeyRanges.map(function(range) {
        return range[i];
      });
    }
    // Sort ranges per dimension.
    keysPerDimensions.forEach(function(keys, i) {
      keys.sort(goog.bind(function(lhs, rhs) {
        return this.comparators_[i].orderKeyRange(lhs, rhs);
      }, this));
    }, this);

    // Swapping back to original key range format. This time the new ranges
    // are properly aligned from left to right in each dimension.
    var finalKeyRanges = new Array(outputKeyRanges.length);
    for (var i = 0; i < finalKeyRanges.length; i++) {
      finalKeyRanges[i] = keysPerDimensions.map(function(keys) {
        return keys[i];
      });
    }

    // Perform another sorting to properly arrange order of ranges with either
    // excludeLower or excludeUpper.
    return finalKeyRanges.sort(goog.bind(function(lhs, rhs) {
      var favor = lf.index.Favor.TIE;
      for (var i = 0;
          i < this.comparators_.length && favor == lf.index.Favor.TIE;
          ++i) {
        favor = this.comparators_[i].orderKeyRange(lhs[i], rhs[i]);
      }
      return favor;
    }, this));
  } else {
    return [this.bindKeyRange_(minKey, maxKey)];
  }
};


/** @override */
lf.index.MultiKeyComparator.prototype.rangeToKeys = function(keyRange) {
  var startKey = keyRange.map(function(range, i) {
    return this.comparators_[i].rangeToKeys(range)[0];
  }, this);
  var endKey = keyRange.map(function(range, i) {
    return this.comparators_[i].rangeToKeys(range)[1];
  }, this);

  return [startKey, endKey];
};
