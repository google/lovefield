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
goog.provide('lf.index.SingleKeyRangeSet');

goog.require('lf.index.SingleKeyRange');



/**
 * A single key range set represnets a set of unioned ranges that any of the
 * two does not overlap.
 * @constructor
 * @struct
 *
 * @param {!Array<!lf.index.SingleKeyRange>} ranges
 */
lf.index.SingleKeyRangeSet = function(ranges) {
  /** @private {!Array<!lf.index.SingleKeyRange>} */
  this.ranges_ = [];

  this.join_(ranges);
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
 * Unions multiple ranges and minimizes the number of ranges returned, i.e.
 * overlapping ranges will be merged into one range.
 * @param {!lf.index.SingleKeyRangeSet|!lf.index.SingleKeyRange} value
 */
lf.index.SingleKeyRangeSet.prototype.union = function(value) {
  if (value instanceof lf.index.SingleKeyRange) {
    this.join_([value]);
  } else {
    this.join_(value.getValues());
  }
};


/**
 * @param {!Array<!lf.index.SingleKeyRange>} keyRanges
 * @private
 */
lf.index.SingleKeyRangeSet.prototype.join_ = function(keyRanges) {
  if (keyRanges.length == 0) {
    return;
  }

  var ranges = this.ranges_.concat(keyRanges);
  if (ranges.length == 1) {
    this.ranges_ = ranges;
    return;
  }

  ranges.sort(lf.index.SingleKeyRange.compare);

  var merge = function(r1, r2) {
    var r = lf.index.SingleKeyRange.all();
    if (!goog.isNull(r1.from) && !goog.isNull(r2.from)) {
      r.from = (r1.from < r2.from) ? r1.from : r2.from;
      r.excludeLower = r1.excludeLower && r2.excludeLower;
    }
    if (!goog.isNull(r1.to) && !goog.isNull(r2.to)) {
      r.to = (r1.to > r2.to) ? r1.to : r2.to;
      r.excludeUpper = r2.excludeUpper && r1.excludeUpper;
    }
    return r;
  };

  var results = [];
  var start = ranges[0];
  for (var i = 1; i < ranges.length; ++i) {
    if (start.overlaps(ranges[i])) {
      start = merge(start, ranges[i]);
    } else {
      results.push(start);
      start = ranges[i];
    }
  }
  results.push(start);
  this.ranges_ = results;
};


/**
 * Returns the boundary of this set.
 * @return {?lf.index.SingleKeyRange} Null if range set is empty.
 */
lf.index.SingleKeyRangeSet.prototype.getBoundary = function() {
  if (this.ranges_.length <= 1) {
    return this.ranges_.length == 0 ? null : this.ranges_[0];
  }

  var last = this.ranges_.length - 1;
  return new lf.index.SingleKeyRange(
      this.ranges_[0].from, this.ranges_[last].to,
      this.ranges_[0].excludeLower, this.ranges_[last].excludeUpper);
};
