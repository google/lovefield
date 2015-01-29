/**
 * @license
 * Copyright 2014 Google Inc. All Rights Reserved.
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
goog.provide('lf.index.KeyRange');

goog.forwardDeclare('lf.index.Index.Key');



/**
 * An object specifying a key range to be used for querying various indices for
 * key ranges.
 * @constructor
 * @struct
 *
 * @param {?lf.index.Index.Key} from The lower bound of this range. Null means
 *     that there is no lower bound.
 * @param {?lf.index.Index.Key} to The upper bound of this range. Null means
 *     that there is no upper bound.
 * @param {boolean} excludeLower Whether the lower bound should be excluded.
 *     Ignored if no lower bound exists.
 * @param {boolean} excludeUpper Whether the upper bound should be excluded.
 *     Ignored if no upper bound exists.
 */
lf.index.KeyRange = function(from, to, excludeLower, excludeUpper) {
  /** @type {?lf.index.Index.Key} */
  this.from = from;

  /** @type {?lf.index.Index.Key} */
  this.to = to;

  /** @type {boolean} */
  this.excludeLower = !goog.isNull(this.from) ? excludeLower : false;

  /** @type {boolean} */
  this.excludeUpper = !goog.isNull(this.to) ? excludeUpper : false;
};


/**
 * @return {!function(!lf.index.Index.Key):boolean} A comparator function that
 *     checks whether a key resides within the speficied key range.
 */
lf.index.KeyRange.prototype.getComparator = function() {
  var lowerBoundComparator = goog.isNull(this.from) ?
      function() { return true; } :
      this.excludeLower ?
          goog.bind(function(key) { return key > this.from; }, this) :
          goog.bind(function(key) { return key >= this.from; }, this);

  var upperBoundComparator = goog.isNull(this.to) ?
      function() { return true; } :
      this.excludeUpper ?
          goog.bind(function(key) { return key < this.to; }, this) :
          goog.bind(function(key) { return key <= this.to; }, this);

  return goog.bind(
      function(key) {
        return lowerBoundComparator(key) && upperBoundComparator(key);
      }, this);
};


/**
 * A text representation of this key range, useful for tests.
 * Example: [a, b] means from a to b, with both a and be included in the range.
 * Example: (a, b] means from a to b, with a excluded, b included.
 * Example: (a, b) means from a to b, with both a and b excluded.
 * Example: [unbound, b) means anything less than b, with b not included.
 * Example: [a, unbound] means anything greater than a, with a included.
 * @override
 */
lf.index.KeyRange.prototype.toString = function() {
  return (this.excludeLower ? '(' : '[') +
      (goog.isNull(this.from) ? 'unbound' : this.from) + ', ' +
      (goog.isNull(this.to) ? 'unbound' : this.to) +
      (this.excludeUpper ? ')' : ']');
};


/**
 * Finds the complement key range. Note that in some cases the complement is
 * composed of two disjoint key ranges. For example complementing [10, 20] would
 * result in [unbound, 10) and (20, unbound].
 * @return {!Array.<!lf.index.KeyRange>} The complement key ranges. An empty
 *     array will be returned in the case where the complement is empty.
 */
lf.index.KeyRange.prototype.complement = function() {
  // Complement of lf.index.KeyRange.all() is empty.
  if (goog.isNull(this.from) && goog.isNull(this.to)) {
    return [];
  }

  var keyRangeLow = null;
  var keyRangeHigh = null;

  if (!goog.isNull(this.from)) {
    keyRangeLow = new lf.index.KeyRange(
        null, this.from, false, !this.excludeLower);
  }

  if (!goog.isNull(this.to)) {
    keyRangeHigh = new lf.index.KeyRange(
        this.to, null, !this.excludeUpper, false);
  }

  return [keyRangeLow, keyRangeHigh].filter(function(keyRange) {
    return !goog.isNull(keyRange);
  });
};


/**
 * @param {!lf.index.Index.Key} key The upper bound.
 * @param {boolean=} opt_shouldExclude Whether the upper bound should be
 *     excluded. Defaults to false.
 * @return {!lf.index.KeyRange}
 */
lf.index.KeyRange.upperBound = function(key, opt_shouldExclude) {
  return new lf.index.KeyRange(null, key, false, opt_shouldExclude || false);
};


/**
 * @param {!lf.index.Index.Key} key The lower bound.
 * @param {boolean=} opt_shouldExclude Whether the lower bound should be
 *     excluded. Defaults to false.
 * @return {!lf.index.KeyRange}
 */
lf.index.KeyRange.lowerBound = function(key, opt_shouldExclude) {
  return new lf.index.KeyRange(key, null, opt_shouldExclude || false, false);
};


/**
 * Creates a range that includes a single key.
 * @param {!lf.index.Index.Key} key
 * @return {!lf.index.KeyRange}
 */
lf.index.KeyRange.only = function(key) {
  return new lf.index.KeyRange(key, key, false, false);
};


/**
 * Creates a range that includes all keys.
 * @return {!lf.index.KeyRange}
 */
lf.index.KeyRange.all = function() {
  return new lf.index.KeyRange(null, null, false, false);
};
