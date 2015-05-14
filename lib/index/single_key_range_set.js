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
goog.provide('lf.index.SingleKeyRangeSet');

goog.require('lf.index.SingleKeyRange');



/**
 * A single key range set represnets a set of unioned ranges that any of the
 * two does not overlap.
 * @constructor
 * @struct
 *
 * @param {!Array<!lf.index.SingleKeyRange>=} opt_ranges
 */
lf.index.SingleKeyRangeSet = function(opt_ranges) {
  /** @private {!Array<!lf.index.SingleKeyRange>} */
  this.ranges_ = [];

  if (goog.isDef(opt_ranges)) {
    this.add(opt_ranges);
  }
};


/** @override */
lf.index.SingleKeyRangeSet.prototype.toString = function() {
  return this.ranges_.map(function(r) {
    return r.toString();
  }).join(',');
};


/**
 * @param {!lf.index.Index.SingleKey} key
 * @return {boolean}
 */
lf.index.SingleKeyRangeSet.prototype.containsKey = function(key) {
  return this.ranges_.some(function(r) {
    return r.contains(key);
  });
};


/** @return {!Array<!lf.index.SingleKeyRange>} */
lf.index.SingleKeyRangeSet.prototype.getValues = function() {
  return this.ranges_;
};


/**
 * Adds ranges to current set. Overlapping ranges will be merged.
 * @param {!Array<!lf.index.SingleKeyRange>} keyRanges
 */
lf.index.SingleKeyRangeSet.prototype.add = function(keyRanges) {
  if (keyRanges.length == 0) {
    return;
  }

  var ranges = this.ranges_.concat(keyRanges);
  if (ranges.length == 1) {
    this.ranges_ = ranges;
    return;
  }

  ranges.sort(lf.index.SingleKeyRange.compare);
  var results = [];
  var start = ranges[0];
  for (var i = 1; i < ranges.length; ++i) {
    if (start.overlaps(ranges[i])) {
      start = lf.index.SingleKeyRange.getBoundingRange(start, ranges[i]);
    } else {
      results.push(start);
      start = ranges[i];
    }
  }
  results.push(start);
  this.ranges_ = results;
};


/**
 * @param {!lf.index.SingleKeyRangeSet} set
 * @return {boolean}
 */
lf.index.SingleKeyRangeSet.prototype.equals = function(set) {
  if (this.ranges_.length == set.ranges_.length) {
    return this.ranges_.length == 0 ||
        this.ranges_.every(function(r, index) {
          return r.equals(set.ranges_[index]);
        });
  }

  return false;
};


/**
 * Returns the boundary of this set.
 * @return {?lf.index.SingleKeyRange} Null if range set is empty.
 */
lf.index.SingleKeyRangeSet.prototype.getBoundingRange = function() {
  if (this.ranges_.length <= 1) {
    return this.ranges_.length == 0 ? null : this.ranges_[0];
  }

  var last = this.ranges_.length - 1;
  return lf.index.SingleKeyRange.getBoundingRange(
      this.ranges_[0], this.ranges_[last]);
};


/**
 * Intersection of two range sets.
 * @param {!lf.index.SingleKeyRangeSet} s0
 * @param {!lf.index.SingleKeyRangeSet} s1
 * @return {!lf.index.SingleKeyRangeSet}
 */
lf.index.SingleKeyRangeSet.intersect = function(s0, s1) {
  var ranges = s0.getValues().map(function(r0) {
    return s1.getValues().map(function(r1) {
      return lf.index.SingleKeyRange.and(r0, r1);
    });
  });

  var results = [];
  ranges.forEach(function(dimension) {
    results = results.concat(dimension);
  });

  return new lf.index.SingleKeyRangeSet(results.filter(function(r) {
    return !goog.isNull(r);
  }));
};
