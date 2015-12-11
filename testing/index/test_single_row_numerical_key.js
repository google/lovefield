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
goog.setTestOnly('lf.testing.index.TestSingleRowNumericalKey');
goog.provide('lf.testing.index.TestSingleRowNumericalKey');

goog.require('goog.testing.jsunit');
goog.require('lf.index.SingleKeyRange');
goog.require('lf.testing.index.TestIndex');



/**
 * @extends {lf.testing.index.TestIndex}
 * @constructor
 * @struct
 *
 * @param {!function():!lf.index.Index} constructorFn The function to call
 *     before every test case, in order to get a newly created index.
 * @param {boolean=} opt_reverse Range expectations shall be reversed.
 */
lf.testing.index.TestSingleRowNumericalKey = function(
    constructorFn, opt_reverse) {
  lf.testing.index.TestSingleRowNumericalKey.base(
      this, 'constructor', constructorFn);

  /**
   * Holds the max key and the corresponding values, populated in
   * populateIndex_.
   * @private {?Array}
   */
  this.maxKeyValuePair_ = null;

  /**
   * Holds the min key and the corresponding values, populated in
   * populateIndex_.
   * @private {?Array}
   */
  this.minKeyValuePair_ = null;

  /** @private {boolean} */
  this.reverse_ = opt_reverse || false;
};
goog.inherits(
    lf.testing.index.TestSingleRowNumericalKey,
    lf.testing.index.TestIndex);


/** @override */
lf.testing.index.TestSingleRowNumericalKey.prototype.testAddGet =
    function(index) {
  // Test add / get.
  for (var i = 0; i < 10; ++i) {
    var key = 10 + i;
    var value = 20 + i;
    index.add(key, value);
    var actualValue = index.get(key)[0];
    assertEquals(value, actualValue);
  }
};


/** @override */
lf.testing.index.TestSingleRowNumericalKey.prototype.testGetRangeCost =
    function(index) {
  this.populateIndex_(index);

  lf.testing.index.TestSingleRowNumericalKey.keyRanges.forEach(
      function(keyRange, counter) {
        var expectedResult = lf.testing.index.TestSingleRowNumericalKey.
            getRangeExpectations_[counter];
        if (this.reverse_) {
          expectedResult.reverse();
        }
        lf.testing.index.TestIndex.assertGetRangeCost(
            index, keyRange, expectedResult);
      }, this);
};


/** @override */
lf.testing.index.TestSingleRowNumericalKey.prototype.testRemove =
    function(index) {
  this.populateIndex_(index);

  index.remove(12, 22);
  assertArrayEquals([], index.get(12));

  var keyRange = lf.index.SingleKeyRange.only(12);
  assertArrayEquals([], index.getRange([keyRange]));
  assertEquals(0, index.cost(keyRange));
};


/** @override */
lf.testing.index.TestSingleRowNumericalKey.prototype.testSet = function(index) {
  this.populateIndex_(index);
  index.remove(12, 22);
  assertEquals(9, index.getRange().length);

  for (var i = 0; i < 10; ++i) {
    var key = 10 + i;
    var value = 30 + i;
    index.set(key, value);
    var actualValue = index.get(key)[0];
    assertEquals(value, actualValue);
  }

  assertEquals(10, index.getRange().length);
};


/** @override */
lf.testing.index.TestSingleRowNumericalKey.prototype.testMinMax = function(
    index) {
  // First try an empty index.
  assertNull(index.min());
  assertNull(index.max());

  this.populateIndex_(index);
  assertArrayEquals(this.minKeyValuePair_, index.min());
  assertArrayEquals(this.maxKeyValuePair_, index.max());
};


/** @override */
lf.testing.index.TestSingleRowNumericalKey.prototype.testMultiRange = function(
    index) {
  for (var i = 0; i < 20; ++i) {
    index.set(i, i);
  }

  // Simulate NOT(BETWEEN(2, 18))
  var range1 = new lf.index.SingleKeyRange(
      lf.index.SingleKeyRange.UNBOUND_VALUE, 2, false, true);
  var range2 = new lf.index.SingleKeyRange(
      18, lf.index.SingleKeyRange.UNBOUND_VALUE, true, false);

  var comparator = index.comparator();
  var expected = [0, 1, 19].sort(goog.bind(comparator.compare, comparator));
  var expectedReverse = expected.slice().reverse();

  assertArrayEquals(expected, index.getRange([range1, range2]));
  assertArrayEquals(expected, index.getRange([range2, range1]));
  assertArrayEquals(expectedReverse, index.getRange([range1, range2], true));
  assertArrayEquals(expectedReverse, index.getRange([range2, range1], true));
};


/**
 * Populates the index with dummy data to be used for all tests.
 * @param {!lf.index.Index} index
 * @private
 */
lf.testing.index.TestSingleRowNumericalKey.prototype.populateIndex_ =
    function(index) {
  for (var i = 0; i < 10; ++i) {
    var key = 10 + i;
    var value = key + 10;
    index.add(key, value);

    // Detecting min key and corresponding value to be used later in assertions.
    if (goog.isNull(this.minKeyValuePair_) ||
        key < this.minKeyValuePair_[0]) {
      this.minKeyValuePair_ = [key, [value]];
    }

    // Detecting max key and corresponding value to be used later in assertions.
    if (goog.isNull(this.maxKeyValuePair_) ||
        key > this.maxKeyValuePair_[0]) {
      this.maxKeyValuePair_ = [key, [value]];
    }
  }
};


/**
 * The key ranges to be used for testing.
 * @type {!Array<!lf.index.SingleKeyRange|undefined>}
 */
lf.testing.index.TestSingleRowNumericalKey.keyRanges = [
  // get all.
  undefined,
  lf.index.SingleKeyRange.all(),
  // get one key
  lf.index.SingleKeyRange.only(15),
  // lower bound.
  lf.index.SingleKeyRange.lowerBound(15),
  lf.index.SingleKeyRange.lowerBound(15, true),
  // upper bound.
  lf.index.SingleKeyRange.upperBound(15),
  lf.index.SingleKeyRange.upperBound(15, true),
  // both lower and upper bound.
  new lf.index.SingleKeyRange(12, 15, false, false),
  new lf.index.SingleKeyRange(12, 15, true, false),
  new lf.index.SingleKeyRange(12, 15, false, true),
  new lf.index.SingleKeyRange(12, 15, true, true)
];


/**
 * The expected results for all key ranges in
 * lf.testing.index.TestSingleRowNumericalKeyCases.keyRanges.
 * @private {!Array<!Array<number>>}
 */
lf.testing.index.TestSingleRowNumericalKey.getRangeExpectations_ = [
  // get all.
  [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
  [20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
  // get one key
  [25],
  // lower bound.
  [25, 26, 27, 28, 29],
  [26, 27, 28, 29],
  // upper bound.
  [20, 21, 22, 23, 24, 25],
  [20, 21, 22, 23, 24],
  // both lower and upper bound.
  [22, 23, 24, 25],
  [23, 24, 25],
  [22, 23, 24],
  [23, 24]
];
