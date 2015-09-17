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
goog.provide('lf.index.SimpleComparator');

goog.require('lf.Order');
goog.require('lf.index.Comparator');
goog.require('lf.index.Favor');
goog.require('lf.index.SingleKeyRange');



/**
 * @extends {lf.index.Comparator.<
 *     !lf.index.Index.SingleKey, !lf.index.SingleKeyRange>}
 * @constructor @struct
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
 * @param {!lf.index.SingleKeyRange} lhs
 * @param {!lf.index.SingleKeyRange} rhs Shall not overlap with lhs.
 * @return {!lf.index.Favor}
 */
lf.index.SimpleComparator.orderRangeAscending = function(lhs, rhs) {
  return lf.index.SingleKeyRange.compare(lhs, rhs);
};


/**
 * @param {!lf.index.SingleKeyRange} lhs
 * @param {!lf.index.SingleKeyRange} rhs
 * @return {!lf.index.Favor}
 */
lf.index.SimpleComparator.orderRangeDescending = function(lhs, rhs) {
  return lf.index.SingleKeyRange.compare(rhs, lhs);
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

  var results = [lf.index.SingleKeyRange.isUnbound(range.from),
                 lf.index.SingleKeyRange.isUnbound(range.to)];
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


/** @override */
lf.index.SimpleComparator.prototype.getAllRange = function() {
  return lf.index.SingleKeyRange.all();
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
lf.index.SimpleComparator.prototype.sortKeyRanges = function(keyRanges) {
  return keyRanges.filter(function(range) {
    return !goog.isNull(range);
  }).sort(function(lhs, rhs) {
    return this.orderRange_(lhs, rhs);
  }.bind(this));
};


/** @override */
lf.index.SimpleComparator.prototype.isLeftOpen = function(range) {
  return lf.index.SingleKeyRange.isUnbound(this.normalizeKeyRange_(range).from);
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
