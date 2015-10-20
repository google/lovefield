/**
 * @license
 * Copyright 2015 The Lovefield Project Authors. All Rights Reserved.
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
goog.provide('lf.index.MultiKeyComparatorWithNull');

goog.require('lf.index.Comparator');
goog.require('lf.index.Favor');
goog.require('lf.index.SimpleComparator');
goog.require('lf.index.SimpleComparatorWithNull');



/**
 * @implements {lf.index.Comparator<!lf.index.Index.Key, !lf.index.KeyRange>}
 * @constructor @struct
 *
 * @param {!Array<!lf.Order>} orders
 */
lf.index.MultiKeyComparator = function(orders) {
  /** @protected {!Array<!lf.index.SimpleComparator>} */
  this.comparators = orders.map(function(order) {
    return new lf.index.SimpleComparator(order);
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
      i < this.comparators.length && favor == lf.index.Favor.TIE;
      ++i) {
    favor = fn(this.comparators[i], lhs[i], rhs[i]);
  }
  return favor;
};


/** @override */
lf.index.MultiKeyComparator.prototype.compare = function(lhs, rhs) {
  return this.forEach_(lhs, rhs, function(c, l, r) {
    if (l == lf.index.SingleKeyRange.UNBOUND_VALUE ||
        r == lf.index.SingleKeyRange.UNBOUND_VALUE) {
      return lf.index.Favor.TIE;
    }
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
      i < this.comparators.length && (results[0] || results[1]);
      ++i) {
    var dimensionResults = this.comparators[i].compareRange(key[i], range[i]);
    results[0] = results[0] && dimensionResults[0];
    results[1] = results[1] && dimensionResults[1];
  }
  return results;
};


/**
 * The range must have same dimensions as key.
 * @override
 */
lf.index.MultiKeyComparator.prototype.isInRange = function(key, range) {
  var isInRange = true;
  for (var i = 0; i < this.comparators.length && isInRange; ++i) {
    isInRange = this.comparators[i].isInRange(key[i], range[i]);
  }
  return isInRange;
};


/** @override */
lf.index.MultiKeyComparator.prototype.isFirstKeyInRange = function(key, range) {
  return this.comparators[0].isInRange(key[0], range[0]);
};


/** @override */
lf.index.MultiKeyComparator.prototype.getAllRange = function() {
  return this.comparators.map(function(c) {
    return c.getAllRange();
  });
};


/** @override */
lf.index.MultiKeyComparator.prototype.sortKeyRanges = function(keyRanges) {
  var outputKeyRanges = keyRanges.filter(function(range) {
    return range.every(goog.isDefAndNotNull);
  });

  // Ranges are in the format of
  // [[dim0_range0, dim1_range0, ...], [dim0_range1, dim1_range1, ...], ...]
  // Reorganize the array to
  // [[dim0_range0, dim0_range1, ...], [dim1_range0, dim1_range1, ...], ...]
  var keysPerDimensions = new Array(this.comparators.length);
  for (var i = 0; i < keysPerDimensions.length; i++) {
    keysPerDimensions[i] = outputKeyRanges.map(function(range) {
      return range[i];
    });
  }
  // Sort ranges per dimension.
  keysPerDimensions.forEach(function(keys, i) {
    keys.sort(function(lhs, rhs) {
      return this.comparators[i].orderKeyRange(lhs, rhs);
    }.bind(this));
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
  return finalKeyRanges.sort(function(lhs, rhs) {
    var favor = lf.index.Favor.TIE;
    for (var i = 0;
        i < this.comparators.length && favor == lf.index.Favor.TIE;
        ++i) {
      favor = this.comparators[i].orderKeyRange(lhs[i], rhs[i]);
    }
    return favor;
  }.bind(this));
};


/** @override */
lf.index.MultiKeyComparator.prototype.isLeftOpen = function(range) {
  return this.comparators[0].isLeftOpen(range[0]);
};


/** @override */
lf.index.MultiKeyComparator.prototype.rangeToKeys = function(keyRange) {
  var startKey = keyRange.map(function(range, i) {
    return this.comparators[i].rangeToKeys(range)[0];
  }, this);
  var endKey = keyRange.map(function(range, i) {
    return this.comparators[i].rangeToKeys(range)[1];
  }, this);

  return [startKey, endKey];
};


/** @override */
lf.index.MultiKeyComparator.prototype.comparable = function(key) {
  return key.every(function(keyDimension, i) {
    return this.comparators[i].comparable(keyDimension);
  }, this);
};


/** @override */
lf.index.MultiKeyComparator.prototype.keyDimensions = function() {
  return this.comparators.length;
};



/**
 * @extends {lf.index.MultiKeyComparator}
 * @constructor @struct
 *
 * @param {!Array<!lf.Order>} orders
 */
lf.index.MultiKeyComparatorWithNull = function(orders) {
  lf.index.MultiKeyComparatorWithNull.base(this, 'constructor', orders);

  /** @protected {!Array<!lf.index.SimpleComparator>} */
  this.comparators = orders.map(function(order) {
    return new lf.index.SimpleComparatorWithNull(order);
  });
};
goog.inherits(lf.index.MultiKeyComparatorWithNull, lf.index.MultiKeyComparator);
