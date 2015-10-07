/**
 * @license
 * Copyright 2014 The Lovefield Project Authors. All Rights Reserved.
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
goog.provide('lf.index.SingleKeyRange');
goog.provide('lf.index.UnboundKey');

goog.require('lf.index.Favor');

goog.forwardDeclare('lf.index.Index.SingleKey');



/**
 * A SingleKeyRange represents a key range of a single column, used for querying
 * various lf.index.Index implementations.
 * @constructor
 * @struct
 * @param {?lf.index.Index.SingleKey|!lf.index.UnboundKey} from The lower bound
 *     of this range. lf.index.UnboundKey means that there is no lower bound.
 * @param {?lf.index.Index.SingleKey|!lf.index.UnboundKey} to The upper bound of
 *     this range. lf.index.UnboundKey means that there is no upper bound.
 * @param {boolean} excludeLower Whether the lower bound should be excluded.
 *     Ignored if no lower bound exists.
 * @param {boolean} excludeUpper Whether the upper bound should be excluded.
 *     Ignored if no upper bound exists.
 */
lf.index.SingleKeyRange = function(from, to, excludeLower, excludeUpper) {
  /** @type {?lf.index.Index.SingleKey|!lf.index.UnboundKey} */
  this.from = from;

  /** @type {?lf.index.Index.SingleKey|!lf.index.UnboundKey} */
  this.to = to;

  /** @type {boolean} */
  this.excludeLower = !lf.index.SingleKeyRange.isUnbound(this.from) ?
      excludeLower : false;

  /** @type {boolean} */
  this.excludeUpper = !lf.index.SingleKeyRange.isUnbound(this.to) ?
      excludeUpper : false;
};



/**
 * Unbound is used to denote an unbound key range boundary.
 * @constructor @struct
 */
lf.index.UnboundKey = function() {
};


/**
 * A special value used to denote an unbound key range boundary.
 * @const {!lf.index.UnboundKey}
 */
lf.index.SingleKeyRange.UNBOUND_VALUE = new lf.index.UnboundKey();


/**
 * @param {?lf.index.Index.SingleKey|!lf.index.UnboundKey} value
 * @return {boolean}
 */
lf.index.SingleKeyRange.isUnbound = function(value) {
  return value == lf.index.SingleKeyRange.UNBOUND_VALUE;
};


/**
 * A KeyRange is more generic than a SingleKeyRange since it can express a key
 * range of a cross-column key. The SingleKeyRange instances in the array
 * represent a key range for each dimension of the cross-column key range.
 * Example for a lf.index.Index.Key (x, y) a KeyRange of [[0, 100], [50, 70]]
 * represents the 2D area where 0 >= x >= 100 AND 50 <= y <=100.
 * @typedef {!Array<!lf.index.SingleKeyRange>}
 */
lf.index.KeyRange;


/**
 * A text representation of this key range, useful for tests.
 * Example: [a, b] means from a to b, with both a and be included in the range.
 * Example: (a, b] means from a to b, with a excluded, b included.
 * Example: (a, b) means from a to b, with both a and b excluded.
 * Example: [unbound, b) means anything less than b, with b not included.
 * Example: [a, unbound] means anything greater than a, with a included.
 * @override
 */
lf.index.SingleKeyRange.prototype.toString = function() {
  return (this.excludeLower ? '(' : '[') +
      (lf.index.SingleKeyRange.isUnbound(this.from) ?
      'unbound' : this.from) + ', ' +
      (lf.index.SingleKeyRange.isUnbound(this.to) ?
      'unbound' : this.to) +
      (this.excludeUpper ? ')' : ']');
};


/**
 * Finds the complement key range. Note that in some cases the complement is
 * composed of two disjoint key ranges. For example complementing [10, 20] would
 * result in [unbound, 10) and (20, unbound].
 * @return {!Array<!lf.index.SingleKeyRange>} The complement key ranges. An
 *     empty array will be returned in the case where the complement is empty.
 */
lf.index.SingleKeyRange.prototype.complement = function() {
  // Complement of lf.index.SingleKeyRange.all() is empty.
  if (this.isAll()) {
    return [];
  }

  var keyRangeLow = null;
  var keyRangeHigh = null;

  if (!lf.index.SingleKeyRange.isUnbound(this.from)) {
    keyRangeLow = new lf.index.SingleKeyRange(
        lf.index.SingleKeyRange.UNBOUND_VALUE, this.from,
        false, !this.excludeLower);
  }

  if (!lf.index.SingleKeyRange.isUnbound(this.to)) {
    keyRangeHigh = new lf.index.SingleKeyRange(
        this.to, lf.index.SingleKeyRange.UNBOUND_VALUE,
        !this.excludeUpper, false);
  }

  return [keyRangeLow, keyRangeHigh].filter(function(keyRange) {
    return !goog.isNull(keyRange);
  });
};


/**
 * Reverses a keyRange such that "lower" refers to larger values and "upper"
 * refers to smaller values. Note: This is different than what complement()
 * does.
 * @return {!lf.index.SingleKeyRange}
 */
lf.index.SingleKeyRange.prototype.reverse = function() {
  return new lf.index.SingleKeyRange(
      this.to, this.from, this.excludeUpper, this.excludeLower);
};


/**
 * Determines if this range overlaps with the given one.
 * @param {!lf.index.SingleKeyRange} range
 * @return {boolean}
 */
lf.index.SingleKeyRange.prototype.overlaps = function(range) {
  var favor = lf.index.SingleKeyRange.compareKey_(
      this.from, range.from, true, this.excludeLower, range.excludeLower);
  if (favor == lf.index.Favor.TIE) {
    return true;
  }
  var left = (favor == lf.index.Favor.RHS) ? this : range;
  var right = (favor == lf.index.Favor.LHS) ? this : range;

  return lf.index.SingleKeyRange.isUnbound(left.to) ||
      left.to > right.from ||
      (left.to == right.from && !left.excludeUpper && !right.excludeLower);
};


/**
 * @param {!lf.index.Index.SingleKey} key The upper bound.
 * @param {boolean=} opt_shouldExclude Whether the upper bound should be
 *     excluded. Defaults to false.
 * @return {!lf.index.SingleKeyRange}
 */
lf.index.SingleKeyRange.upperBound = function(key, opt_shouldExclude) {
  return new lf.index.SingleKeyRange(
      lf.index.SingleKeyRange.UNBOUND_VALUE, key,
      false, opt_shouldExclude || false);
};


/**
 * @param {!lf.index.Index.SingleKey} key The lower bound.
 * @param {boolean=} opt_shouldExclude Whether the lower bound should be
 *     excluded. Defaults to false.
 * @return {!lf.index.SingleKeyRange}
 */
lf.index.SingleKeyRange.lowerBound = function(key, opt_shouldExclude) {
  return new lf.index.SingleKeyRange(
      key, lf.index.SingleKeyRange.UNBOUND_VALUE,
      opt_shouldExclude || false, false);
};


/**
 * Creates a range that includes a single key.
 * @param {!lf.index.Index.SingleKey} key
 * @return {!lf.index.SingleKeyRange}
 */
lf.index.SingleKeyRange.only = function(key) {
  return new lf.index.SingleKeyRange(key, key, false, false);
};


/**
 * Creates a range that includes all keys.
 * @return {!lf.index.SingleKeyRange}
 */
lf.index.SingleKeyRange.all = function() {
  return new lf.index.SingleKeyRange(
      lf.index.SingleKeyRange.UNBOUND_VALUE,
      lf.index.SingleKeyRange.UNBOUND_VALUE,
      false,
      false);
};


/**
 * Returns if the range is all.
 * @return {boolean}
 */
lf.index.SingleKeyRange.prototype.isAll = function() {
  return lf.index.SingleKeyRange.isUnbound(this.from) &&
      lf.index.SingleKeyRange.isUnbound(this.to);
};


/**
 * Returns if the range is only.
 * @return {boolean}
 */
lf.index.SingleKeyRange.prototype.isOnly = function() {
  return this.from == this.to &&
      !lf.index.SingleKeyRange.isUnbound(this.from) &&
      !this.excludeLower &&
      !this.excludeUpper;
};


/**
 * @param {!lf.index.Index.SingleKey} key
 * @return {boolean}
 */
lf.index.SingleKeyRange.prototype.contains = function(key) {
  var left = lf.index.SingleKeyRange.isUnbound(this.from) ||
      (key > this.from) ||
      (key == this.from && !this.excludeLower);
  var right = lf.index.SingleKeyRange.isUnbound(this.to) ||
      (key < this.to) ||
      (key == this.to && !this.excludeUpper);
  return left && right;
};


/**
 * Bound the range with [min, max] and return the newly bounded range.
 * @param {!lf.index.Index.SingleKey} min
 * @param {!lf.index.Index.SingleKey} max
 * @return {?lf.index.SingleKeyRange} When the given bound
 *     has no intersection with this range, or the range/bound is
 *     reversed, return null.
 */
lf.index.SingleKeyRange.prototype.getBounded = function(min, max) {
  // Eliminate out of range scenarios.
  if ((lf.index.SingleKeyRange.isUnbound(this.from) && !this.contains(min)) ||
      (lf.index.SingleKeyRange.isUnbound(this.to) && !this.contains(max))) {
    return null;
  }

  var range = new lf.index.SingleKeyRange(min, max, false, false);
  if (!lf.index.SingleKeyRange.isUnbound(this.from) && this.from >= min) {
    range.from = this.from;
    range.excludeLower = this.excludeLower;
  }
  if (!lf.index.SingleKeyRange.isUnbound(this.to) && this.to <= max) {
    range.to = this.to;
    range.excludeUpper = this.excludeUpper;
  }

  if (range.from > range.to ||
      (range.from == range.to && (range.excludeUpper || range.excludeLower))) {
    return null;
  }
  return range;
};


/**
 * @param {!lf.index.SingleKeyRange} range
 * @return {boolean}
 */
lf.index.SingleKeyRange.prototype.equals = function(range) {
  return this.from == range.from &&
      this.excludeLower == range.excludeLower &&
      this.to == range.to &&
      this.excludeUpper == range.excludeUpper;
};


/**
 * @param {boolean} a
 * @param {boolean} b
 * @return {boolean}
 */
lf.index.SingleKeyRange.xor = function(a, b) {
  return a ? !b : b;
};


/**
 * Directionally compare two keys.
 * Left hand side key comparison logic: null is considered left, exclusion
 * is considered right.
 * Right hand side key comparison logic: null is considered right, exclusion
 * is considered left.
 * @param {?lf.index.Index.SingleKey|!lf.index.UnboundKey} l
 * @param {?lf.index.Index.SingleKey|!lf.index.UnboundKey} r
 * @param {boolean} isLeftHandSide
 * @param {boolean=} opt_excludeL
 * @param {boolean=} opt_excludeR
 * @return {!lf.index.Favor}
 * @private
 */
lf.index.SingleKeyRange.compareKey_ = function(
    l, r, isLeftHandSide, opt_excludeL, opt_excludeR) {
  var Favor = lf.index.Favor;
  var excludeL = opt_excludeL || false;
  var excludeR = opt_excludeR || false;
  var flip = function(favor) {
    return isLeftHandSide ? favor :
        (favor == Favor.LHS) ? Favor.RHS : Favor.LHS;
  };

  // The following logic is implemented for LHS. RHS is achieved using flip().
  var tieLogic = function() {
    return !lf.index.SingleKeyRange.xor(excludeL, excludeR) ? Favor.TIE :
        excludeL ? flip(Favor.LHS) : flip(Favor.RHS);
  };

  if (lf.index.SingleKeyRange.isUnbound(l)) {
    return !lf.index.SingleKeyRange.isUnbound(r) ?
        flip(Favor.RHS) : tieLogic();
  }
  return lf.index.SingleKeyRange.isUnbound(r) ? flip(Favor.LHS) :
      (l < r) ? Favor.RHS :
      (l == r) ? tieLogic() : Favor.LHS;
};


/**
 * Compares two ranges, meant to be used in Array#sort.
 * @param {!lf.index.SingleKeyRange} lhs
 * @param {!lf.index.SingleKeyRange} rhs
 * @return {!lf.index.Favor}
 */
lf.index.SingleKeyRange.compare = function(lhs, rhs) {
  var result = lf.index.SingleKeyRange.compareKey_(
      lhs.from, rhs.from, true, lhs.excludeLower, rhs.excludeLower);
  if (result == lf.index.Favor.TIE) {
    result = lf.index.SingleKeyRange.compareKey_(
        lhs.to, rhs.to, false, lhs.excludeUpper, rhs.excludeUpper);
  }
  return result;
};


/**
 * Returns a new range that is the minimum range that covers both ranges given.
 * @param {!lf.index.SingleKeyRange} r1
 * @param {!lf.index.SingleKeyRange} r2
 * @return {!lf.index.SingleKeyRange}
 */
lf.index.SingleKeyRange.getBoundingRange = function(r1, r2) {
  var r = lf.index.SingleKeyRange.all();
  if (!lf.index.SingleKeyRange.isUnbound(r1.from) &&
      !lf.index.SingleKeyRange.isUnbound(r2.from)) {
    var favor = lf.index.SingleKeyRange.compareKey_(r1.from, r2.from, true);
    if (favor != lf.index.Favor.LHS) {
      r.from = r1.from;
      r.excludeLower = (favor != lf.index.Favor.TIE) ? r1.excludeLower :
          r1.excludeLower && r2.excludeLower;
    } else {
      r.from = r2.from;
      r.excludeLower = r2.excludeLower;
    }
  }
  if (!lf.index.SingleKeyRange.isUnbound(r1.to) &&
      !lf.index.SingleKeyRange.isUnbound(r2.to)) {
    var favor = lf.index.SingleKeyRange.compareKey_(r1.to, r2.to, false);
    if (favor != lf.index.Favor.RHS) {
      r.to = r1.to;
      r.excludeUpper = (favor != lf.index.Favor.TIE) ? r1.excludeUpper :
          r1.excludeUpper && r2.excludeUpper;
    } else {
      r.to = r2.to;
      r.excludeUpper = r2.excludeUpper;
    }
  }
  return r;
};


/**
 * Intersects two ranges and return their intersection.
 * @param {!lf.index.SingleKeyRange} r1
 * @param {!lf.index.SingleKeyRange} r2
 * @return {?lf.index.SingleKeyRange} Returns null if intersection is empty.
 */
lf.index.SingleKeyRange.and = function(r1, r2) {
  if (!r1.overlaps(r2)) {
    return null;
  }

  var r = lf.index.SingleKeyRange.all();
  var favor = lf.index.SingleKeyRange.compareKey_(r1.from, r2.from, true);
  var left = (favor == lf.index.Favor.TIE) ? (r1.excludeLower ? r1 : r2) :
      (favor != lf.index.Favor.RHS) ? r1 : r2;
  r.from = left.from;
  r.excludeLower = left.excludeLower;

  // right side boundary test is different, null is considered greater.
  var right;
  if (lf.index.SingleKeyRange.isUnbound(r1.to) ||
      lf.index.SingleKeyRange.isUnbound(r2.to)) {
    right = (lf.index.SingleKeyRange.isUnbound(r1.to)) ? r2 : r1;
  } else {
    favor = lf.index.SingleKeyRange.compareKey_(r1.to, r2.to, false);
    right = (favor == lf.index.Favor.TIE) ? (r1.excludeUpper ? r1 : r2) :
        (favor == lf.index.Favor.RHS) ? r1 : r2;
  }
  r.to = right.to;
  r.excludeUpper = right.excludeUpper;
  return r;
};


/**
 * Calculates the complement key ranges of the input key ranges.
 * NOTE: The key ranges passed in this method must satisfy "isOnly() == true",
 * and none of from/to should be null.
 * @param {!Array<!lf.index.SingleKeyRange>} keyRanges
 * @return {!Array<!lf.index.SingleKeyRange>}
 */
lf.index.SingleKeyRange.complement = function(keyRanges) {
  if (keyRanges.length == 0) {
    return [];
  }

  keyRanges.sort(lf.index.SingleKeyRange.compare);
  var complementKeyRanges = new Array(keyRanges.length + 1);
  for (var i = 0; i < complementKeyRanges.length; i++) {
    if (i == 0) {
      complementKeyRanges[i] = lf.index.SingleKeyRange.upperBound(
          /** @type {!lf.index.Index.SingleKey} */ (keyRanges[i].from), true);
    } else if (i == complementKeyRanges.length - 1) {
      complementKeyRanges[i] = lf.index.SingleKeyRange.lowerBound(
          /** @type {!lf.index.Index.SingleKey} */ (keyRanges[i - 1].to), true);
    } else {
      complementKeyRanges[i] = new lf.index.SingleKeyRange(
          keyRanges[i - 1].to, keyRanges[i].from, true, true);
    }
  }
  return complementKeyRanges;
};
