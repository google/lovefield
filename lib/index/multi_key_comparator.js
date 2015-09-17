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

goog.require('lf.index.Comparator');
goog.require('lf.index.Favor');
goog.require('lf.index.SimpleComparator');



/**
 * @extends {lf.index.Comparator.<!lf.index.Index.Key, !lf.index.KeyRange>}
 * @constructor @struct
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


/** @override */
lf.index.MultiKeyComparator.prototype.getAllRange = function() {
  return this.comparators_.map(function(c) {
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
  var keysPerDimensions = new Array(this.comparators_.length);
  for (var i = 0; i < keysPerDimensions.length; i++) {
    keysPerDimensions[i] = outputKeyRanges.map(function(range) {
      return range[i];
    });
  }
  // Sort ranges per dimension.
  keysPerDimensions.forEach(function(keys, i) {
    keys.sort(function(lhs, rhs) {
      return this.comparators_[i].orderKeyRange(lhs, rhs);
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
        i < this.comparators_.length && favor == lf.index.Favor.TIE;
        ++i) {
      favor = this.comparators_[i].orderKeyRange(lhs[i], rhs[i]);
    }
    return favor;
  }.bind(this));
};


/** @override */
lf.index.MultiKeyComparator.prototype.isLeftOpen = function(range) {
  return this.comparators_[0].isLeftOpen(range[0]);
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
