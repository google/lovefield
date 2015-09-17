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
goog.require('lf.index.SingleKeyRange');


var favor = lf.index.Favor;

function testOrderAsc() {
  var comparator = new lf.index.SimpleComparator(lf.Order.ASC);
  var c = goog.bind(comparator.compare, comparator);

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


function testOrderDesc() {
  var comparator = new lf.index.SimpleComparator(lf.Order.DESC);
  var c = goog.bind(comparator.compare, comparator);

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


function testMin() {
  var c1 = new lf.index.SimpleComparator(lf.Order.DESC);
  checkMin(c1);

  // Ensuring that Comparator#min() is not be affected by the order.
  var c2 = new lf.index.SimpleComparator(lf.Order.ASC);
  checkMin(c2);
}


function testMax() {
  var c1 = new lf.index.SimpleComparator(lf.Order.DESC);
  checkMax(c1);

  // Ensuring that Comparator#max() is not be affected by the order.
  var c2 = new lf.index.SimpleComparator(lf.Order.ASC);
  checkMax(c2);
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


function testIsInRange() {
  var c = new lf.index.SimpleComparator(lf.Order.ASC);
  assertTrue(c.isInRange(2, lf.index.SingleKeyRange.all()));
  assertTrue(c.isInRange(2, lf.index.SingleKeyRange.lowerBound(2)));
  assertFalse(c.isInRange(2, lf.index.SingleKeyRange.lowerBound(2, true)));
  assertTrue(c.isInRange(2, lf.index.SingleKeyRange.upperBound(2)));
  assertFalse(c.isInRange(2, lf.index.SingleKeyRange.upperBound(2, true)));
  assertTrue(c.isInRange(2, lf.index.SingleKeyRange.only(2)));
  assertFalse(c.isInRange(2, lf.index.SingleKeyRange.only(3)));
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
