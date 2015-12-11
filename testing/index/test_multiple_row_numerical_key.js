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
goog.setTestOnly('lf.testing.index.TestMultiRowNumericalKey');
goog.provide('lf.testing.index.TestMultiRowNumericalKey');

goog.require('goog.testing.jsunit');
goog.require('lf.index.SingleKeyRange');
goog.require('lf.testing.index.TestIndex');
goog.require('lf.testing.index.TestSingleRowNumericalKey');



/**
 * @extends {lf.testing.index.TestIndex}
 * @constructor
 * @struct
 *
 * @param {!function():!lf.index.Index} constructorFn The function to call
 *     before every test case, in order to get a newly created index.
 */
lf.testing.index.TestMultiRowNumericalKey = function(constructorFn) {
  lf.testing.index.TestMultiRowNumericalKey.base(
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
};
goog.inherits(
    lf.testing.index.TestMultiRowNumericalKey,
    lf.testing.index.TestIndex);


/** @override */
lf.testing.index.TestMultiRowNumericalKey.prototype.testAddGet =
    function(index) {
  for (var i = 0; i < 10; ++i) {
    var key = 10 + i;
    var value1 = 20 + i;
    var value2 = 30 + i;
    index.add(key, value1);
    index.add(key, value2);
    assertEquals(value1, index.get(key)[0]);
    assertEquals(value2, index.get(key)[1]);
  }
};


/** @override */
lf.testing.index.TestMultiRowNumericalKey.prototype.testGetRangeCost =
    function(index) {
  this.populateIndex_(index);

  lf.testing.index.TestSingleRowNumericalKey.keyRanges.forEach(
      function(keyRange, counter) {
        var expectedResult = lf.testing.index.TestMultiRowNumericalKey.
            getRangeExpectations[counter];
        lf.testing.index.TestIndex.assertGetRangeCost(
            index, keyRange, expectedResult);
      });
};


/** @override */
lf.testing.index.TestMultiRowNumericalKey.prototype.testRemove =
    function(index) {
  this.populateIndex_(index);

  index.remove(11, 21);
  assertArrayEquals([31], index.get(11));
  index.remove(12, 22);
  index.remove(12, 32);
  assertArrayEquals([], index.get(12));
  assertArrayEquals([], index.getRange([lf.index.SingleKeyRange.only(12)]));
};


/** @override */
lf.testing.index.TestMultiRowNumericalKey.prototype.testSet = function(index) {
  this.populateIndex_(index);
  index.remove(12, 22);

  for (var i = 0; i < 10; ++i) {
    var key = 10 + i;
    var value = 40 + i;
    index.set(key, value);
    var actualValues = index.get(key);
    assertEquals(1, actualValues.length);
    assertEquals(value, actualValues[0]);
  }

  assertEquals(10, index.getRange().length);
};


/** @override */
lf.testing.index.TestMultiRowNumericalKey.prototype.testMinMax = function(
    index) {
  // First try an empty index.
  assertNull(index.min());
  assertNull(index.max());

  this.populateIndex_(index);
  assertArrayEquals(this.minKeyValuePair_, index.min());
  assertArrayEquals(this.maxKeyValuePair_, index.max());
};


/** @override */
lf.testing.index.TestMultiRowNumericalKey.prototype.testMultiRange = function(
    index) {
  // TODO(arthurhsu): implement
};


/**
 * Populates the index with dummy data to be used for al tests.
 * @param {!lf.index.Index} index
 * @private
 */
lf.testing.index.TestMultiRowNumericalKey.prototype.populateIndex_ =
    function(index) {
  for (var i = 0; i < 10; ++i) {
    var key = 10 + i;
    var value1 = 20 + i;
    var value2 = 30 + i;
    index.add(key, value1);
    index.add(key, value2);

    // Detecting min key and corresponding value to be used later in assertions.
    if (goog.isNull(this.minKeyValuePair_) ||
        key < this.minKeyValuePair_[0]) {
      this.minKeyValuePair_ = [key, [value1, value2]];
    }

    // Detecting max key and corresponding value to be used later in assertions.
    if (goog.isNull(this.maxKeyValuePair_) ||
        key > this.maxKeyValuePair_[0]) {
      this.maxKeyValuePair_ = [key, [value1, value2]];
    }
  }
};


/**
 * An array holding all the values that are added in the index in
 * populateIndex().
 * @private {!Array<number>}
 */
lf.testing.index.TestMultiRowNumericalKey.allValues_ =
    [20, 30, 21, 31, 22, 32, 23, 33, 24, 34, 25, 35, 26, 36, 27, 37, 28,
     38, 29, 39];


/**
 * The expected results for all key ranges in
 * lf.testing.index.TestSingleRowNumericalKey.keyRanges.
 * @type {!Array<!Array<number>>}
 */
lf.testing.index.TestMultiRowNumericalKey.getRangeExpectations = [
  // get all.
  lf.testing.index.TestMultiRowNumericalKey.allValues_,
  lf.testing.index.TestMultiRowNumericalKey.allValues_,
  // get one key
  [25, 35],
  // lower bound.
  [25, 35, 26, 36, 27, 37, 28, 38, 29, 39],
  [26, 36, 27, 37, 28, 38, 29, 39],
  // upper bound.
  [20, 30, 21, 31, 22, 32, 23, 33, 24, 34, 25, 35],
  [20, 30, 21, 31, 22, 32, 23, 33, 24, 34],
  // both lower and upper bound.
  [22, 32, 23, 33, 24, 34, 25, 35],
  [23, 33, 24, 34, 25, 35],
  [22, 32, 23, 33, 24, 34],
  [23, 33, 24, 34]
];
