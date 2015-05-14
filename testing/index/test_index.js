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
goog.provide('lf.testing.index.TestIndex');



/**
 * A base class to be subclassed by index related tests (single row/multi row,
 * numerical/string key).
 * @constructor
 * @struct
 *
 * @param {!function():!lf.index.Index} constructorFn The function to call
 *     before every test case, in order to get a newly created index.
 */
lf.testing.index.TestIndex = function(constructorFn) {
  this.constructorFn_ = constructorFn;

  this.testCases_ = [
    this.testAddGet,
    this.testGetRangeCost,
    this.testMinMax,
    this.testRemove,
    this.testSet,
    this.testMultiRange
  ];
};


/**
 * Runs all test cases.
 */
lf.testing.index.TestIndex.prototype.run = function() {
  this.testCases_.forEach(
      function(testCase) {
        var index = this.constructorFn_();
        testCase.call(this, index);
      }, this);
};


/** @param {!lf.index.Index} index */
lf.testing.index.TestIndex.prototype.testAddGet = goog.abstractMethod;


/** @param {!lf.index.Index} index */
lf.testing.index.TestIndex.prototype.testGetRangeCost = goog.abstractMethod;


/** @param {!lf.index.Index} index */
lf.testing.index.TestIndex.prototype.testRemove = goog.abstractMethod;


/** @param {!lf.index.Index} index */
lf.testing.index.TestIndex.prototype.testSet = goog.abstractMethod;


/** @param {!lf.index.Index} index */
lf.testing.index.TestIndex.prototype.testMinMax = goog.abstractMethod;


/** @param {!lf.index.Index} index */
lf.testing.index.TestIndex.prototype.testMultiRange = goog.abstractMethod;


/**
 * Asserts that the return values of getRange() and cost() are as expected for
 * the given index, for the given key range.
 * @param {!lf.index.Index} index
 * @param {!lf.index.SingleKeyRange|!lf.index.KeyRange|undefined}
 *     keyRange
 * @param {!Array} expectedResult
 */
lf.testing.index.TestIndex.assertGetRangeCost =
    function(index, keyRange, expectedResult) {
  var actualResult = index.getRange(
      goog.isDef(keyRange) ? [keyRange] : undefined);
  assertArrayEquals(expectedResult, actualResult);
  assertEquals(actualResult.length, index.cost(keyRange));
};
