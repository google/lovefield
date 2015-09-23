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
goog.require('lf.index.SimpleComparator');
goog.require('lf.index.SimpleComparatorWithNull');
goog.require('lf.index.SingleKeyRange');


var favor = lf.index.Favor;

function checkOrderAsc(comparator) {
  var c = comparator.compare.bind(comparator);

  assertEquals(favor.TIE, c(0, 0));
  assertEquals(favor.TIE, c('', ''));
  assertEquals(favor.TIE, c(888.88, 888.88));
  assertEquals(favor.TIE, c('ab', 'ab'));

  assertEquals(favor.LHS, c(1, 0));
  assertEquals(favor.RHS, c(0, 1));
  assertEquals(favor.LHS, c(888.88, 888.87));
  assertEquals(favor.RHS, c(888.87, 888.88));

  assertEquals(favor.LHS, c('b', 'a'));
  assertEquals(favor.RHS, c('a', 'b'));
  assertEquals(favor.LHS, c('bbb', 'bba'));
  assertEquals(favor.RHS, c('bba', 'bbb'));
}

function testOrderAsc() {
  var c1 = new lf.index.SimpleComparator(lf.Order.ASC);
  checkOrderAsc(c1);
  var c2 = new lf.index.SimpleComparatorWithNull(lf.Order.ASC);
  checkOrderAsc(c2);

  // Null-specific tests
  var c = c2.compare.bind(c2);
  assertEquals(favor.TIE, c(null, null));
  assertEquals(favor.LHS, c(0, null));
  assertEquals(favor.RHS, c(null, 0));
}

function checkOrderDesc(comparator) {
  var c = comparator.compare.bind(comparator);

  assertEquals(favor.TIE, c(0, 0));
  assertEquals(favor.TIE, c('', ''));
  assertEquals(favor.TIE, c(888.88, 888.88));
  assertEquals(favor.TIE, c('ab', 'ab'));

  assertEquals(favor.RHS, c(1, 0));
  assertEquals(favor.LHS, c(0, 1));
  assertEquals(favor.RHS, c(888.88, 888.87));
  assertEquals(favor.LHS, c(888.87, 888.88));

  assertEquals(favor.RHS, c('b', 'a'));
  assertEquals(favor.LHS, c('a', 'b'));
  assertEquals(favor.RHS, c('bbb', 'bba'));
  assertEquals(favor.LHS, c('bba', 'bbb'));
}

function testOrderDesc() {
  var c1 = new lf.index.SimpleComparator(lf.Order.DESC);
  checkOrderDesc(c1);
  var c2 = new lf.index.SimpleComparatorWithNull(lf.Order.DESC);
  checkOrderDesc(c2);

  // Null-specific tests
  var c = c2.compare.bind(c2);
  assertEquals(favor.TIE, c(null, null));
  assertEquals(favor.RHS, c(0, null));
  assertEquals(favor.LHS, c(null, 0));
}

function testMin() {
  var c1 = new lf.index.SimpleComparator(lf.Order.DESC);
  checkMin(c1);

  // Ensuring that Comparator#min() is not be affected by the order.
  var c2 = new lf.index.SimpleComparator(lf.Order.ASC);
  checkMin(c2);

  var c3 = new lf.index.SimpleComparatorWithNull(lf.Order.DESC);
  checkMin(c3);
  checkMinWithNull(c3);

  var c4 = new lf.index.SimpleComparatorWithNull(lf.Order.ASC);
  checkMin(c4);
  checkMinWithNull(c4);
}


function testMax() {
  var c1 = new lf.index.SimpleComparator(lf.Order.DESC);
  checkMax(c1);

  // Ensuring that Comparator#max() is not be affected by the order.
  var c2 = new lf.index.SimpleComparator(lf.Order.ASC);
  checkMax(c2);

  var c3 = new lf.index.SimpleComparatorWithNull(lf.Order.DESC);
  checkMax(c3);
  checkMaxWithNull(c3);

  var c4 = new lf.index.SimpleComparatorWithNull(lf.Order.ASC);
  checkMax(c4);
  checkMaxWithNull(c4);
}


/**
 * Checks the min() method of the given comparator.
 * @param {!lf.index.SimpleComparator} c
 */
function checkMin(c) {
  assertEquals(favor.TIE, c.min(0, 0));
  assertEquals(favor.TIE, c.min('', ''));
  assertEquals(favor.TIE, c.min(888.88, 888.88));
  assertEquals(favor.TIE, c.min('ab', 'ab'));

  assertEquals(favor.RHS, c.min(1, 0));
  assertEquals(favor.LHS, c.min(0, 1));
  assertEquals(favor.RHS, c.min(888.88, 888.87));
  assertEquals(favor.LHS, c.min(888.87, 888.88));

  assertEquals(favor.RHS, c.min('b', 'a'));
  assertEquals(favor.LHS, c.min('a', 'b'));
  assertEquals(favor.RHS, c.min('bbb', 'bba'));
  assertEquals(favor.LHS, c.min('bba', 'bbb'));
}


/**
 * Checks the min() method of the given comparator.
 * @param {!lf.index.SimpleComparator} c
 */
function checkMinWithNull(c) {
  assertEquals(favor.RHS, c.min(null, 1));
  assertEquals(favor.LHS, c.min(1, null));
  assertEquals(favor.TIE, c.min(null, null));
}


/**
 * Checks the max() method of the given comparator.
 * @param {!lf.index.SimpleComparator} c
 */
function checkMax(c) {
  assertEquals(favor.TIE, c.max(0, 0));
  assertEquals(favor.TIE, c.max('', ''));
  assertEquals(favor.TIE, c.max(888.88, 888.88));
  assertEquals(favor.TIE, c.max('ab', 'ab'));

  assertEquals(favor.LHS, c.max(1, 0));
  assertEquals(favor.RHS, c.max(0, 1));
  assertEquals(favor.LHS, c.max(888.88, 888.87));
  assertEquals(favor.RHS, c.max(888.87, 888.88));

  assertEquals(favor.LHS, c.max('b', 'a'));
  assertEquals(favor.RHS, c.max('a', 'b'));
  assertEquals(favor.LHS, c.max('bbb', 'bba'));
  assertEquals(favor.RHS, c.max('bba', 'bbb'));
}


/**
 * Checks the max() method of the given comparator.
 * @param {!lf.index.SimpleComparator} c
 */
function checkMaxWithNull(c) {
  assertEquals(favor.RHS, c.max(null, 1));
  assertEquals(favor.LHS, c.max(1, null));
  assertEquals(favor.TIE, c.max(null, null));
}


function testOrderRange() {
  var ranges = [
    new lf.index.SingleKeyRange(1, 5, false, true),
    new lf.index.SingleKeyRange(6, 7, false, false),
    lf.index.SingleKeyRange.only(5),
    new lf.index.SingleKeyRange(-1, 1, false, true)
  ];

  var expectationAsc = [
    '[-1, 1)',
    '[1, 5)',
    '[5, 5]',
    '[6, 7]'
  ];

  var dupe = ranges.slice();
  var actual = dupe.sort(lf.index.SimpleComparator.orderRangeAscending).map(
      function(range) {
        return range.toString();
      });
  assertArrayEquals(expectationAsc, actual);

  var expectationDesc = [
    '[6, 7]',
    '[5, 5]',
    '[1, 5)',
    '[-1, 1)'
  ];

  dupe = ranges.slice();
  actual = dupe.sort(lf.index.SimpleComparator.orderRangeDescending).map(
      function(range) {
        return range.toString();
      });
  assertArrayEquals(expectationDesc, actual);
}


function checkIsInRange(c) {
  assertTrue(c.isInRange(2, lf.index.SingleKeyRange.all()));
  assertTrue(c.isInRange(2, lf.index.SingleKeyRange.lowerBound(2)));
  assertFalse(c.isInRange(2, lf.index.SingleKeyRange.lowerBound(2, true)));
  assertTrue(c.isInRange(2, lf.index.SingleKeyRange.upperBound(2)));
  assertFalse(c.isInRange(2, lf.index.SingleKeyRange.upperBound(2, true)));
  assertTrue(c.isInRange(2, lf.index.SingleKeyRange.only(2)));
  assertFalse(c.isInRange(2, lf.index.SingleKeyRange.only(3)));
}


function testIsInRange() {
  var c1 = new lf.index.SimpleComparator(lf.Order.ASC);
  checkIsInRange(c1);

  var c2 = new lf.index.SimpleComparatorWithNull(lf.Order.DESC);
  checkIsInRange(c2);

  // Null specific
  assertTrue(c2.isInRange(null, lf.index.SingleKeyRange.all()));
  var ranges = [
    lf.index.SingleKeyRange.lowerBound(2),
    lf.index.SingleKeyRange.lowerBound(2, true),
    lf.index.SingleKeyRange.upperBound(2),
    lf.index.SingleKeyRange.upperBound(2, true),
    lf.index.SingleKeyRange.only(2)
  ];
  ranges.forEach(function(range) {
    assertFalse(c2.isInRange(null, range));
  });
}


function testSortKeyRanges() {
  var c1 = new lf.index.SimpleComparator(lf.Order.ASC);
  var c2 = new lf.index.SimpleComparator(lf.Order.DESC);

  var keyRanges = [
    lf.index.SingleKeyRange.lowerBound(5, true),
    lf.index.SingleKeyRange.upperBound(5, true),
    lf.index.SingleKeyRange.only(5)
  ];

  var expectations1 = [
    '[unbound, 5)',
    '[5, 5]',
    '(5, unbound]'
  ];

  var expectations2 = [
    '(5, unbound]',
    '[5, 5]',
    '[unbound, 5)'
  ];

  /**
   * @param {!lf.index.SimpleComparator} c
   * @param {!Array<!lf.index.SingleKeyRange>} range
   * @return {!Array<string>}
   */
  var getActual = function(c, range) {
    return c.sortKeyRanges(range).map(function(range) {
      return range.toString();
    });
  };

  assertArrayEquals(expectations1, getActual(c1, keyRanges));
  assertArrayEquals(expectations2, getActual(c2, keyRanges));
}


function testCompareRange() {
  var c = new lf.index.SimpleComparator(lf.Order.ASC);
  assertArrayEquals([true, true],
      c.compareRange(2, lf.index.SingleKeyRange.all()));
  assertArrayEquals([true, true],
      c.compareRange(2, lf.index.SingleKeyRange.only(2)));
  assertArrayEquals([false, true],
      c.compareRange(2, lf.index.SingleKeyRange.only(3)));
  assertArrayEquals([true, false],
      c.compareRange(2, lf.index.SingleKeyRange.only(1)));
  assertArrayEquals([true, true],
      c.compareRange(2, lf.index.SingleKeyRange.lowerBound(2)));
  assertArrayEquals([false, true],
      c.compareRange(2, lf.index.SingleKeyRange.lowerBound(2, true)));
  assertArrayEquals([true, true],
      c.compareRange(2, lf.index.SingleKeyRange.upperBound(2)));
  assertArrayEquals([true, false],
      c.compareRange(2, lf.index.SingleKeyRange.upperBound(2, true)));
}
