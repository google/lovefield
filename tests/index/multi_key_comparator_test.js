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
goog.setTestOnly();
goog.require('goog.testing.jsunit');
goog.require('lf.Order');
goog.require('lf.index.Favor');
goog.require('lf.index.MultiKeyComparator');
goog.require('lf.index.MultiKeyComparatorWithNull');
goog.require('lf.index.SingleKeyRange');


var favor = lf.index.Favor;


/** @param {!Function} testFn */
function shuffleAndTest(testFn) {
  var ORDER = [lf.Order.DESC, lf.Order.ASC];
  for (var j = 0; j < ORDER.length; ++j) {
    for (var k = 0; k < ORDER.length; ++k) {
      var c = new lf.index.MultiKeyComparator([ORDER[j], ORDER[k]]);
      testFn(c);
    }
  }
}

function testMin() {
  shuffleAndTest(checkMin);
}


function testMax() {
  shuffleAndTest(checkMax);
}


/**
 * Checks the min() method of the given comparator.
 * @param {!lf.index.MultiKeyComparator} c
 */
function checkMin(c) {
  assertEquals(favor.TIE, c.min([0, 'A'], [0, 'A']));
  assertEquals(favor.TIE, c.min(['', ''], ['', '']));
  assertEquals(favor.TIE, c.min([888.88, 888.88], [888.88, 888.88]));
  assertEquals(favor.TIE, c.min(['ab', 'ab'], ['ab', 'ab']));

  assertEquals(favor.RHS, c.min([1, 'A'], [0, 'Z']));
  assertEquals(favor.LHS, c.min([0, 999], [1, 888]));
  assertEquals(favor.RHS, c.min([1, 1], [1, 0]));
  assertEquals(favor.LHS, c.min(['A', 'D'], ['A', 'Z']));
  assertEquals(favor.RHS, c.min([888.88, 999], [888.87, 1]));
  assertEquals(favor.LHS, c.min([888.87, 999], [888.88, 1]));
  assertEquals(favor.RHS, c.min([888.88, 999], [888.88, 1]));
  assertEquals(favor.LHS, c.min([1, 888.87], [1, 888.88]));

  assertEquals(favor.RHS, c.min(['b', 1], ['a', 999]));
  assertEquals(favor.LHS, c.min(['a', 999], ['b', 0]));
  assertEquals(favor.RHS, c.min(['b', 'b'], ['b', 'a']));
  assertEquals(favor.LHS, c.min(['a', 'a'], ['a', 'b']));
  assertEquals(favor.RHS, c.min(['bbb', 'bba'], ['bba', 'bbb']));
  assertEquals(favor.LHS, c.min(['bba', 'bbb'], ['bbb', 'bba']));
  assertEquals(favor.RHS, c.min(['bbb', 'bbc'], ['bbb', 'bbb']));
  assertEquals(favor.LHS, c.min(['bba', 'bbb'], ['bba', 'bbc']));
}


/**
 * Checks the max() method of the given comparator.
 * @param {!lf.index.MultiKeyComparator} c
 */
function checkMax(c) {
  assertEquals(favor.TIE, c.max([0, 'A'], [0, 'A']));
  assertEquals(favor.TIE, c.max(['', ''], ['', '']));
  assertEquals(favor.TIE, c.max([888.88, 888.88], [888.88, 888.88]));
  assertEquals(favor.TIE, c.max(['ab', 'ab'], ['ab', 'ab']));

  assertEquals(favor.LHS, c.max([1, 'A'], [0, 'Z']));
  assertEquals(favor.RHS, c.max([0, 999], [1, 888]));
  assertEquals(favor.LHS, c.max([1, 1], [1, 0]));
  assertEquals(favor.RHS, c.max(['A', 'D'], ['A', 'Z']));
  assertEquals(favor.LHS, c.max([888.88, 999], [888.87, 1]));
  assertEquals(favor.RHS, c.max([888.87, 999], [888.88, 1]));
  assertEquals(favor.LHS, c.max([888.88, 999], [888.88, 1]));
  assertEquals(favor.RHS, c.max([1, 888.87], [1, 888.88]));

  assertEquals(favor.LHS, c.max(['b', 1], ['a', 999]));
  assertEquals(favor.RHS, c.max(['a', 999], ['b', 0]));
  assertEquals(favor.LHS, c.max(['b', 'b'], ['b', 'a']));
  assertEquals(favor.RHS, c.max(['a', 'a'], ['a', 'b']));
  assertEquals(favor.LHS, c.max(['bbb', 'bba'], ['bba', 'bbb']));
  assertEquals(favor.RHS, c.max(['bba', 'bbb'], ['bbb', 'bba']));
  assertEquals(favor.LHS, c.max(['bbb', 'bbc'], ['bbb', 'bbb']));
  assertEquals(favor.RHS, c.max(['bba', 'bbb'], ['bba', 'bbc']));
}



function testDefaultOrder() {
  var orders = lf.index.MultiKeyComparator.createOrders(2, lf.Order.ASC);
  var comparator = new lf.index.MultiKeyComparator(orders);
  var c = goog.bind(comparator.compare, comparator);

  assertEquals(favor.TIE, c([0, 0], [0, 0]));
  assertEquals(favor.TIE, c(['', ''], ['', '']));
  assertEquals(favor.TIE, c([99.99, 99.99], [99.99, 99.99]));
  assertEquals(favor.TIE, c(['ab', 'ab'], ['ab', 'ab']));
  assertEquals(favor.TIE, c([77, 'ab'], [77, 'ab']));

  assertEquals(favor.LHS, c([7, 6], [5, 4]));
  assertEquals(favor.LHS, c([7, 6], [7, 4]));
  assertEquals(favor.RHS, c([5, 4], [7, 6]));
  assertEquals(favor.RHS, c([5, 4], [5, 8]));

  assertEquals(favor.LHS, c([9, 'abc'], [8, 'zzz']));
  assertEquals(favor.LHS, c(['zzz', 8], ['abc', 12]));
  assertEquals(favor.LHS, c(['zzz', 2], ['zzz', 1]));
  assertEquals(favor.LHS, c([2, 'zzz'], [2, 'zza']));
  assertEquals(favor.RHS, c(['zzz', 1], ['zzz', 2]));
  assertEquals(favor.RHS, c([2, 'zza'], [2, 'zzz']));
}

function testCustomOrder() {
  var comparator =
      new lf.index.MultiKeyComparator([lf.Order.DESC, lf.Order.ASC]);
  var c = goog.bind(comparator.compare, comparator);

  assertEquals(favor.TIE, c([0, 0], [0, 0]));
  assertEquals(favor.TIE, c(['', ''], ['', '']));
  assertEquals(favor.TIE, c([99.99, 99.99], [99.99, 99.99]));
  assertEquals(favor.TIE, c(['ab', 'ab'], ['ab', 'ab']));
  assertEquals(favor.TIE, c([77, 'ab'], [77, 'ab']));

  assertEquals(favor.RHS, c([7, 6], [5, 4]));
  assertEquals(favor.LHS, c([7, 6], [7, 4]));
  assertEquals(favor.LHS, c([5, 4], [7, 6]));
  assertEquals(favor.RHS, c([5, 4], [5, 8]));

  assertEquals(favor.RHS, c([9, 'abc'], [8, 'zzz']));
  assertEquals(favor.RHS, c(['zzz', 8], ['abc', 12]));
  assertEquals(favor.LHS, c(['zzz', 2], ['zzz', 1]));
  assertEquals(favor.LHS, c([2, 'zzz'], [2, 'zza']));
  assertEquals(favor.RHS, c(['zzz', 1], ['zzz', 2]));
  assertEquals(favor.RHS, c([2, 'zza'], [2, 'zzz']));
}


/** @param {!lf.index.MultiKeyComparator} c */
function checkIsInRange(c) {
  var lowerBound = lf.index.SingleKeyRange.lowerBound(2);
  var lowerBoundExclude = lf.index.SingleKeyRange.lowerBound(2, true);
  var upperBound = lf.index.SingleKeyRange.upperBound(2);
  var upperBoundExclude = lf.index.SingleKeyRange.upperBound(2, true);

  assertTrue(c.isInRange(
      [2, 2],
      [lf.index.SingleKeyRange.all(), lf.index.SingleKeyRange.all()]));
  assertTrue(c.isInRange([2, 2], [lowerBound, lowerBound]));
  assertFalse(c.isInRange([2, 2], [lowerBoundExclude, lowerBound]));
  assertFalse(c.isInRange([2, 2], [lowerBound, lowerBoundExclude]));
  assertFalse(c.isInRange([2, 2], [lowerBoundExclude, lowerBoundExclude]));
  assertTrue(c.isInRange([2, 2], [upperBound, upperBound]));
  assertFalse(c.isInRange([2, 2], [upperBoundExclude, upperBound]));
  assertFalse(c.isInRange([2, 2], [upperBound, upperBoundExclude]));
  assertFalse(c.isInRange([2, 2], [upperBoundExclude, upperBoundExclude]));
  assertTrue(c.isInRange([2, 2], [lowerBound, upperBound]));
  assertFalse(c.isInRange([2, 2], [lowerBoundExclude, upperBound]));
  assertFalse(c.isInRange([2, 2], [lowerBound, upperBoundExclude]));
  assertFalse(c.isInRange([2, 2], [lowerBoundExclude, upperBoundExclude]));
  assertTrue(c.isInRange([2, 2], [upperBound, lowerBound]));
  assertFalse(c.isInRange([2, 2], [upperBoundExclude, lowerBound]));
  assertFalse(c.isInRange([2, 2], [upperBound, lowerBoundExclude]));
  assertFalse(c.isInRange([2, 2], [upperBoundExclude, lowerBoundExclude]));
}

function testIsInRange_MultiKeyComparator() {
  // The orders do not really affect the judgement for this test, therefore
  // two random orders are picked to make this test shorter.
  var c = new lf.index.MultiKeyComparator([lf.Order.ASC, lf.Order.DESC]);
  checkIsInRange(c);
}

function testIsInRange_MultiKeyComparatorWithNull() {
  var c = new lf.index.MultiKeyComparatorWithNull(
      [lf.Order.ASC, lf.Order.DESC]);
  checkIsInRange(c);

  // Null specific tests
  var all = lf.index.SingleKeyRange.all();
  var lowerBound = lf.index.SingleKeyRange.lowerBound(2);
  assertTrue(c.isInRange([2, null], [all, all]));
  assertTrue(c.isInRange([null, 2], [all, all]));
  assertTrue(c.isInRange([2, null], [lowerBound, all]));
  assertFalse(c.isInRange([2, null], [lowerBound, lowerBound]));
  assertTrue(c.isInRange([null, 2], [all, lowerBound]));

  assertTrue(c.isInRange([null, null], [all, all]));
  assertFalse(c.isInRange([null, null], [lowerBound, all]));
  assertFalse(c.isInRange([null, null], [all, lowerBound]));
  assertFalse(c.isInRange([null, null], [lowerBound, lowerBound]));
}

function testSortKeyRanges_Asc() {
  var c = new lf.index.MultiKeyComparator([lf.Order.ASC, lf.Order.ASC]);
  var keyRanges = [
    [
      lf.index.SingleKeyRange.upperBound(5, true),
      lf.index.SingleKeyRange.upperBound('D', true)
    ],
    [
      lf.index.SingleKeyRange.lowerBound(90, true),
      lf.index.SingleKeyRange.lowerBound('X', true)
    ],
    [
      lf.index.SingleKeyRange.only(90),
      lf.index.SingleKeyRange.only('X')
    ]
  ];

  var expectations = [
    '[unbound, 5),[unbound, D)',
    '[90, 90],[X, X]',
    '(90, unbound],(X, unbound]'
  ];

  var actual = c.sortKeyRanges(keyRanges).map(function(range) {
    return range.toString();
  });

  assertArrayEquals(expectations, actual);
}


function testSortKeyRanges_MixedOrder() {
  var c = new lf.index.MultiKeyComparator([lf.Order.ASC, lf.Order.DESC]);

  // NOT(BETWEEN([2, 'X'], [24, 'B'])) OR [22, 'D']
  var keyRanges = [
    [
      new lf.index.SingleKeyRange(
          lf.index.SingleKeyRange.UNBOUND_VALUE, 2, false, true),
      new lf.index.SingleKeyRange(
          lf.index.SingleKeyRange.UNBOUND_VALUE, 'B', false, true)
    ],
    [
      new lf.index.SingleKeyRange(
          24, lf.index.SingleKeyRange.UNBOUND_VALUE, true, false),
      new lf.index.SingleKeyRange(
          'X', lf.index.SingleKeyRange.UNBOUND_VALUE, true, false)
    ],
    [
      lf.index.SingleKeyRange.only(22),
      lf.index.SingleKeyRange.only('D')
    ]
  ];

  var expectations = [
    '[unbound, 2),(X, unbound]',
    '[22, 22],[D, D]',
    '(24, unbound],[unbound, B)'
  ];

  var actual = c.sortKeyRanges(keyRanges).map(function(range) {
    return range.toString();
  });

  assertArrayEquals(expectations, actual);
}


function testCompareRange() {
  var c = new lf.index.MultiKeyComparator([lf.Order.ASC, lf.Order.DESC]);
  var lowerBound = lf.index.SingleKeyRange.lowerBound(2);
  var lowerBoundExclude = lf.index.SingleKeyRange.lowerBound(2, true);
  var upperBound = lf.index.SingleKeyRange.upperBound(2);
  var upperBoundExclude = lf.index.SingleKeyRange.upperBound(2, true);
  var all = lf.index.SingleKeyRange.all();
  var only1 = lf.index.SingleKeyRange.only(1);
  var only2 = lf.index.SingleKeyRange.only(2);
  var only3 = lf.index.SingleKeyRange.only(3);
  var key = [2, 2];

  // Shuffle of valid conditions shall result in covering both ends.
  var ranges = [all, only2, lowerBound, upperBound];
  for (var i = 0; i < ranges.length; ++i) {
    for (var j = 0; j < ranges.length; ++j) {
      assertArrayEquals([true, true],
          c.compareRange(key, [ranges[i], ranges[j]]));
    }
  }

  assertArrayEquals([true, false], c.compareRange(key, [only1, only3]));
  assertArrayEquals([false, true], c.compareRange(key, [only3, only1]));
  assertArrayEquals([false, false], c.compareRange(key, [only1, only1]));
  assertArrayEquals([false, false], c.compareRange(key, [only3, only3]));

  assertArrayEquals([false, true],
      c.compareRange(key, [lowerBoundExclude, lowerBound]));
  assertArrayEquals([false, false],
      c.compareRange(key, [lowerBoundExclude, lowerBoundExclude]));
  assertArrayEquals([false, true],
      c.compareRange(key, [lowerBoundExclude, upperBound]));
  assertArrayEquals([false, true],
      c.compareRange(key, [lowerBoundExclude, upperBoundExclude]));

  assertArrayEquals([true, false],
      c.compareRange(key, [upperBoundExclude, lowerBound]));
  assertArrayEquals([true, false],
      c.compareRange(key, [upperBoundExclude, lowerBoundExclude]));
  assertArrayEquals([true, false],
      c.compareRange(key, [upperBoundExclude, upperBound]));
  assertArrayEquals([false, false],
      c.compareRange(key, [upperBoundExclude, upperBoundExclude]));
}


function testIsFirstKeyInRange() {
  var c = new lf.index.MultiKeyComparatorWithNull(
      [lf.Order.ASC, lf.Order.DESC]);
  var all = lf.index.SingleKeyRange.all();
  var only1 = lf.index.SingleKeyRange.only(1);
  var only2 = lf.index.SingleKeyRange.only(2);

  assertTrue(c.isFirstKeyInRange([1, 2], [only1, only1]));
  assertTrue(c.isFirstKeyInRange([1, 2], [all, only1]));
  assertTrue(c.isFirstKeyInRange([1, 2], [only1, null]));
  assertTrue(c.isFirstKeyInRange([null, 2], [all, only1]));
  assertFalse(c.isFirstKeyInRange([1, 2], [only2, all]));
  assertFalse(c.isFirstKeyInRange([null, 2], [only1, all]));
}
