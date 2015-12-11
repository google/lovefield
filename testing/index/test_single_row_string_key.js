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
goog.setTestOnly('lf.testing.index.TestSingleRowStringKey');
goog.provide('lf.testing.index.TestSingleRowStringKey');

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
lf.testing.index.TestSingleRowStringKey = function(constructorFn, opt_reverse) {
  lf.testing.index.TestSingleRowStringKey.base(
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
    lf.testing.index.TestSingleRowStringKey,
    lf.testing.index.TestIndex);


/** @override */
lf.testing.index.TestSingleRowStringKey.prototype.testAddGet =
    function(index) {
  // Test add / get.
  for (var i = -5; i < 5; ++i) {
    var key = 'key' + i.toString();
    var value = i;
    index.add(key, value);
    var actualValue = index.get(key)[0];
    assertEquals(value, actualValue);
  }
};


/** @override */
lf.testing.index.TestSingleRowStringKey.prototype.testGetRangeCost =
    function(index) {
  this.populateIndex_(index);

  lf.testing.index.TestSingleRowStringKey.keyRanges.forEach(
      function(keyRange, counter) {
        var expectedResult = lf.testing.index.TestSingleRowStringKey.
            getRangeExpectations[counter];
        if (this.reverse_) {
          expectedResult.reverse();
        }
        lf.testing.index.TestIndex.assertGetRangeCost(
            index, keyRange, expectedResult);
      }, this);
};


/** @override */
lf.testing.index.TestSingleRowStringKey.prototype.testRemove =
    function(index) {
  this.populateIndex_(index);
  var key = 'key-1';
  assertTrue(index.get(key).length > 0);

  index.remove(key);
  assertArrayEquals([], index.get(key));

  var keyRange = lf.index.SingleKeyRange.only(key);
  assertArrayEquals([], index.getRange([keyRange]));
  assertEquals(0, index.cost(keyRange));
};


/** @override */
lf.testing.index.TestSingleRowStringKey.prototype.testSet = function(index) {
  this.populateIndex_(index);
  index.remove('key-1');
  assertEquals(9, index.getRange().length);

  for (var i = -5; i < 5; ++i) {
    var key = 'key' + i.toString();
    var value = 30 + i;
    index.set(key, value);
    var actualValue = index.get(key)[0];
    assertEquals(value, actualValue);
  }

  assertEquals(10, index.getRange().length);
};


/** @override */
lf.testing.index.TestSingleRowStringKey.prototype.testMinMax = function(
    index) {
  // First try an empty index.
  assertNull(index.min());
  assertNull(index.max());

  this.populateIndex_(index);
  assertArrayEquals(this.minKeyValuePair_, index.min());
  assertArrayEquals(this.maxKeyValuePair_, index.max());
};


/** @override */
lf.testing.index.TestSingleRowStringKey.prototype.testMultiRange = function(
    index) {
  for (var i = 0; i < 10; ++i) {
    index.set('k' + i, i);
  }

  // Simulate NOT(BETWEEN('k2', 'k8'))
  var range1 = new lf.index.SingleKeyRange(
      lf.index.SingleKeyRange.UNBOUND_VALUE, 'k2', false, true);
  var range2 = new lf.index.SingleKeyRange(
      'k8', lf.index.SingleKeyRange.UNBOUND_VALUE, true, false);

  var comparator = index.comparator();
  var expected = [0, 1, 9].sort(goog.bind(comparator.compare, comparator));
  var expectedReverse = expected.slice().reverse();

  assertArrayEquals(expected, index.getRange([range1, range2]));
  assertArrayEquals(expected, index.getRange([range2, range1]));
  assertArrayEquals(expectedReverse, index.getRange([range1, range2], true));
  assertArrayEquals(expectedReverse, index.getRange([range2, range1], true));
};


/**
 * Populates the index with dummy data to be used for al tests.
 * @param {!lf.index.Index} index
 * @private
 */
lf.testing.index.TestSingleRowStringKey.prototype.populateIndex_ =
    function(index) {
  for (var i = -5; i < 5; ++i) {
    var key = 'key' + i.toString();
    var value = i;
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
lf.testing.index.TestSingleRowStringKey.keyRanges = [
  // get all.
  undefined,
  lf.index.SingleKeyRange.all(),
  // get one key
  lf.index.SingleKeyRange.only('key-3'),
  // lower bound.
  lf.index.SingleKeyRange.lowerBound('key0'),
  lf.index.SingleKeyRange.lowerBound('key0', true),
  // upper bound.
  lf.index.SingleKeyRange.upperBound('key0'),
  lf.index.SingleKeyRange.upperBound('key0', true),
  // both lower and upper bound.
  new lf.index.SingleKeyRange('key-1', 'key-5', false, false),
  new lf.index.SingleKeyRange('key-1', 'key-5', true, false),
  new lf.index.SingleKeyRange('key-1', 'key-5', false, true),
  new lf.index.SingleKeyRange('key-1', 'key-5', true, true)
];


/**
 * The expected results for all key ranges in
 * lf.testing.index.TestSingleRowStringKeyCases.keyRanges.
 * @type {!Array<!Array<number>>}
 */
lf.testing.index.TestSingleRowStringKey.getRangeExpectations = [
  // get all.
  [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4],
  [-1, -2, -3, -4, -5, 0, 1, 2, 3, 4],
  // get one key
  [-3],
  // lower bound.
  [0, 1, 2, 3, 4],
  [1, 2, 3, 4],
  // upper bound.
  [-1, -2, -3, -4, -5, 0],
  [-1, -2, -3, -4, -5],
  // both lower and upper bound.
  [-1, -2, -3, -4, -5],
  [-2, -3, -4, -5],
  [-1, -2, -3, -4],
  [-2, -3, -4]
];
