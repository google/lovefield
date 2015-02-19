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
goog.provide('lf.testing.index.TestMultiKeyIndex');

goog.require('lf.testing.index.TestIndex');



/**
 * @extends {lf.testing.index.TestIndex}
 * @constructor
 * @struct
 *
 * @param {!function():!lf.index.Index} constructorFn The function to call
 *     before every test case, in order to get a newly created index. The index
 *     must have a unique key of type (number: asc, string: desc).
 */
lf.testing.index.TestMultiKeyIndex = function(constructorFn) {
  lf.testing.index.TestMultiKeyIndex.base(this, 'constructor', constructorFn);
};
goog.inherits(lf.testing.index.TestMultiKeyIndex, lf.testing.index.TestIndex);


/** @override */
lf.testing.index.TestMultiKeyIndex.prototype.testAddGet = function(index) {
  for (var i = 0; i < 26; ++i) {
    var key = [i, String.fromCharCode('z'.charCodeAt(0) - i)];
    var value = 2000 + i;
    index.add(key, value);
    var actualValue = index.get(key)[0];
    assertEquals(value, actualValue);
  }
};


/** @override */
lf.testing.index.TestMultiKeyIndex.prototype.testGetRangeCost =
    function(index) {
  // TODO(arthurhsu): implement
};


/** @override */
lf.testing.index.TestMultiKeyIndex.prototype.testRemove = function(index) {
  this.populateIndex_(index);

  // Remove non-existent key shall not yield any error.
  index.remove([0, 'K']);

  assertArrayEquals([2008], index.get([8, 'R']));
  index.remove([8, 'R']);
  assertArrayEquals([], index.get([8, 'R']));
};


/** @override */
lf.testing.index.TestMultiKeyIndex.prototype.testSet = function(index) {
  this.populateIndex_(index);

  index.remove([8, 'R']);
  assertEquals(25, index.getRange().length);

  for (var i = 0; i < 26; ++i) {
    var key = [i, String.fromCharCode('Z'.charCodeAt(0) - i)];
    var value = 3000 + i;
    index.set(key, value);
    var actualValue = index.get(key)[0];
    assertEquals(value, actualValue);
  }

  assertEquals(26, index.getRange().length);
};


/** @override */
lf.testing.index.TestMultiKeyIndex.prototype.testMinMax = function(index) {
  // First try an empty index.
  assertArrayEquals([null, null], index.min());
  assertArrayEquals([null, null], index.max());

  this.populateIndex_(index);
  assertArrayEquals([[0, 'Z'], [2000]], index.min());
  assertArrayEquals([[25, 'A'], [2025]], index.max());
};


/** @override */
lf.testing.index.TestMultiKeyIndex.prototype.testMultiRange = function(index) {
  // TODO(arthurhsu): implement
};


/**
 * Populates the index with dummy data to be used for all tests.
 * @param {!lf.index.Index} index
 * @private
 */
lf.testing.index.TestMultiKeyIndex.prototype.populateIndex_ = function(index) {
  for (var i = 0; i < 26; ++i) {
    var key = [i, String.fromCharCode('Z'.charCodeAt(0) - i)];
    var value = 2000 + i;
    index.add(key, value);
  }
};
