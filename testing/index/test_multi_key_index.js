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
goog.provide('lf.testing.index.TestMultiKeyIndex');

goog.require('lf.index.SingleKeyRange');
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


/** @private {!Array<!Array<!lf.index.SingleKeyRange>|undefined>} */
lf.testing.index.TestMultiKeyIndex.keyRanges_ = [
  // Get all.
  undefined,
  [lf.index.SingleKeyRange.all(), lf.index.SingleKeyRange.all()],

  // Get one key.
  [lf.index.SingleKeyRange.only(8), lf.index.SingleKeyRange.only('R')],

  // Lower bound.
  [lf.index.SingleKeyRange.lowerBound(8),
   lf.index.SingleKeyRange.upperBound('R')],
  [lf.index.SingleKeyRange.lowerBound(8, true),
   lf.index.SingleKeyRange.upperBound('R')],
  [lf.index.SingleKeyRange.lowerBound(8),
   lf.index.SingleKeyRange.upperBound('R', true)],
  [lf.index.SingleKeyRange.lowerBound(8, true),
   lf.index.SingleKeyRange.upperBound('R', true)],

  // Upper bound.
  [lf.index.SingleKeyRange.upperBound(2),
   lf.index.SingleKeyRange.lowerBound('X')],
  [lf.index.SingleKeyRange.upperBound(2, true),
   lf.index.SingleKeyRange.lowerBound('X')],
  [lf.index.SingleKeyRange.upperBound(2),
   lf.index.SingleKeyRange.lowerBound('X', true)],
  [lf.index.SingleKeyRange.upperBound(2, true),
   lf.index.SingleKeyRange.lowerBound('X', true)],

  // Between.
  [new lf.index.SingleKeyRange(2, 8, false, false),
   new lf.index.SingleKeyRange('R', 'X', false, false)],
  [new lf.index.SingleKeyRange(2, 8, false, true),
   new lf.index.SingleKeyRange('R', 'X', false, false)],
  [new lf.index.SingleKeyRange(2, 8, false, false),
   new lf.index.SingleKeyRange('R', 'X', true, false)],
  [new lf.index.SingleKeyRange(2, 8, false, true),
   new lf.index.SingleKeyRange('R', 'X', true, false)],
  [new lf.index.SingleKeyRange(2, 8, true, false),
   new lf.index.SingleKeyRange('R', 'X', false, false)],
  [new lf.index.SingleKeyRange(2, 8, false, false),
   new lf.index.SingleKeyRange('R', 'X', false, true)],
  [new lf.index.SingleKeyRange(2, 8, true, false),
   new lf.index.SingleKeyRange('R', 'X', false, true)]
];


/** @private {!Array<!Array<number>>} */
lf.testing.index.TestMultiKeyIndex.rangeExpectations_ = [
  // Get all.
  [2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009],
  [2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009],

  // Get one key.
  [2008],

  // Lower bound.
  [2008, 2009],
  [2009],
  [2009],
  [2009],

  // Upper bound.
  [2000, 2001, 2002],
  [2000, 2001],
  [2000, 2001],
  [2000, 2001],

  // Between.
  [2002, 2003, 2004, 2005, 2006, 2007, 2008],
  [2002, 2003, 2004, 2005, 2006, 2007],
  [2002, 2003, 2004, 2005, 2006, 2007],
  [2002, 2003, 2004, 2005, 2006, 2007],
  [2003, 2004, 2005, 2006, 2007, 2008],
  [2003, 2004, 2005, 2006, 2007, 2008],
  [2003, 2004, 2005, 2006, 2007, 2008]
];


/** @override */
lf.testing.index.TestMultiKeyIndex.prototype.testGetRangeCost =
    function(index) {
  this.populateIndex_(index, 10);

  var keyRanges = lf.testing.index.TestMultiKeyIndex.keyRanges_;
  var expectations = lf.testing.index.TestMultiKeyIndex.rangeExpectations_;

  keyRanges.forEach(function(range, i) {
    var expected = expectations[i];
    lf.testing.index.TestIndex.assertGetRangeCost(index, range, expected);
  });
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
  assertNull(index.min());
  assertNull(index.max());
  this.populateIndex_(index);
  assertArrayEquals([[0, 'Z'], [2000]], index.min());
  assertArrayEquals([[25, 'A'], [2025]], index.max());
};


/** @override */
lf.testing.index.TestMultiKeyIndex.prototype.testMultiRange = function(index) {
  this.populateIndex_(index);

  // Simulate NOT(BETWEEN([2, 'X'], [24, 'B']))
  // The optimizer already handles the range order.
  var range1 = [
    new lf.index.SingleKeyRange(
        lf.index.SingleKeyRange.UNBOUND_VALUE, 2, false, true),
    new lf.index.SingleKeyRange(
        lf.index.SingleKeyRange.UNBOUND_VALUE, 'B', false, true)
  ];
  var range2 = [
    new lf.index.SingleKeyRange(
        24, lf.index.SingleKeyRange.UNBOUND_VALUE, true, false),
    new lf.index.SingleKeyRange(
        'X', lf.index.SingleKeyRange.UNBOUND_VALUE, true, false)
  ];

  var expected = [2000, 2001, 2025];

  assertArrayEquals(expected, index.getRange([range1, range2]));
  assertArrayEquals(expected, index.getRange([range2, range1]));
};


/**
 * Populates the index with dummy data to be used for all tests.
 * @param {!lf.index.Index} index
 * @param {number=} opt_number
 * @private
 */
lf.testing.index.TestMultiKeyIndex.prototype.populateIndex_ = function(
    index, opt_number) {
  var count = opt_number || 26;
  for (var i = 0; i < count; ++i) {
    var key = [i, String.fromCharCode('Z'.charCodeAt(0) - i)];
    var value = 2000 + i;
    index.add(key, value);
  }
};
