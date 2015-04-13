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
goog.setTestOnly();
goog.require('goog.testing.jsunit');
goog.require('lf.Order');
goog.require('lf.index.Favor');
goog.require('lf.index.MultiKeyComparator');
goog.require('lf.index.SimpleComparator');
goog.require('lf.index.SingleKeyRange');


var favor = lf.index.Favor;

function testSimpleComparator_Asc() {
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


function testSimpleComparator_Desc() {
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


function testSimpleComparator_Min() {
  var c1 = new lf.index.SimpleComparator(lf.Order.DESC);
  checkSimpleComparator_Min(c1);

  // Ensuring that Comparator#min() is not be affected by the order.
  var c2 = new lf.index.SimpleComparator(lf.Order.ASC);
  checkSimpleComparator_Min(c2);
}


function testSimpleComparator_Max() {
  var c1 = new lf.index.SimpleComparator(lf.Order.DESC);
  checkSimpleComparator_Max(c1);

  // Ensuring that Comparator#max() is not be affected by the order.
  var c2 = new lf.index.SimpleComparator(lf.Order.ASC);
  checkSimpleComparator_Max(c2);
}


/**
 * Checks the min() method of the given comparator.
 * @param {!lf.index.SimpleComparator} c
 */
function checkSimpleComparator_Min(c) {
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
function checkSimpleComparator_Max(c) {
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


function testMultiKeyComparator_Min() {
  var c1 = new lf.index.MultiKeyComparator([lf.Order.DESC, lf.Order.ASC]);
  checkMultiKeyComparator_Min(c1);

  var c2 = new lf.index.MultiKeyComparator([lf.Order.DESC, lf.Order.DESC]);
  checkMultiKeyComparator_Min(c2);

  var c3 = new lf.index.MultiKeyComparator([lf.Order.ASC, lf.Order.DESC]);
  checkMultiKeyComparator_Min(c3);

  var c4 = new lf.index.MultiKeyComparator([lf.Order.ASC, lf.Order.ASC]);
  checkMultiKeyComparator_Min(c4);
}


function testMultiKeyComparator_Max() {
  var c1 = new lf.index.MultiKeyComparator([lf.Order.DESC, lf.Order.ASC]);
  checkMultiKeyComparator_Max(c1);

  var c2 = new lf.index.MultiKeyComparator([lf.Order.DESC, lf.Order.DESC]);
  checkMultiKeyComparator_Max(c2);

  var c3 = new lf.index.MultiKeyComparator([lf.Order.ASC, lf.Order.DESC]);
  checkMultiKeyComparator_Max(c3);

  var c4 = new lf.index.MultiKeyComparator([lf.Order.ASC, lf.Order.ASC]);
  checkMultiKeyComparator_Max(c4);
}


/**
 * Checks the min() method of the given comparator.
 * @param {!lf.index.MultiKeyComparator} c
 */
function checkMultiKeyComparator_Min(c) {
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
function checkMultiKeyComparator_Max(c) {
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


function testSimpleComparator_OrderRange() {
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


function testSimpleComparator_BindKeyRange() {
  var c = new lf.index.SimpleComparator(lf.Order.ASC);

  /**
   * @param {string} expected
   * @param {!lf.index.SingleKeyRange=} opt_range
   */
  var check = function(expected, opt_range) {
    assertEquals(expected, c.bindKeyRange(-100, 100, opt_range).toString());
  };

  check('[-100, 100]', undefined);
  check('[-100, 100]', lf.index.SingleKeyRange.all());
  check('[-100, 100]', new lf.index.SingleKeyRange(-100, 100, false, false));
  check('[0, 0]', lf.index.SingleKeyRange.only(0));

  check('[-100, 100]', lf.index.SingleKeyRange.upperBound(200));
  check('[-100, 0]', lf.index.SingleKeyRange.upperBound(0));
  check('[-100, 100]', lf.index.SingleKeyRange.lowerBound(-200));
  check('[0, 100]', lf.index.SingleKeyRange.lowerBound(0));

  check('[-100, 100]', new lf.index.SingleKeyRange(-200, 200, false, false));
  check('[-10, 10]', new lf.index.SingleKeyRange(-10, 10, false, false));
  check('(-100, 100)', new lf.index.SingleKeyRange(-100, 100, true, true));

  /** @param {!lf.index.SingleKeyRange} range */
  var checkNull = function(range) {
    assertNull(c.bindKeyRange(-100, 100, range));
  };

  checkNull(lf.index.SingleKeyRange.upperBound(-100, true));
  checkNull(lf.index.SingleKeyRange.lowerBound(100, true));
  checkNull(new lf.index.SingleKeyRange(-200, -150, false, false));
  checkNull(new lf.index.SingleKeyRange(150, 200, false, false));
  checkNull(new lf.index.SingleKeyRange(50, 10, false, false));
}


function testMultiKeyComparator_DefaultOrder() {
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

function testMultiKeyComparator_CustomOrder() {
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


function testSimpleComparator_isInRange() {
  var c = new lf.index.SimpleComparator(lf.Order.ASC);
  assertTrue(c.isInRange(2, lf.index.SingleKeyRange.all()));
  assertTrue(c.isInRange(2, lf.index.SingleKeyRange.lowerBound(2)));
  assertFalse(c.isInRange(2, lf.index.SingleKeyRange.lowerBound(2, true)));
  assertTrue(c.isInRange(2, lf.index.SingleKeyRange.upperBound(2)));
  assertFalse(c.isInRange(2, lf.index.SingleKeyRange.upperBound(2, true)));
  assertTrue(c.isInRange(2, lf.index.SingleKeyRange.only(2)));
  assertFalse(c.isInRange(2, lf.index.SingleKeyRange.only(3)));
}


function testMultiKeyComparator_isInRange() {
  // The orders do not really affect the judgement for this test, therefore
  // two random orders are picked to make this test shorter.
  var c = new lf.index.MultiKeyComparator([lf.Order.ASC, lf.Order.DESC]);
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


function testSimpleComparator_BindAndSortKeyRanges() {
  var c1 = new lf.index.SimpleComparator(lf.Order.ASC);
  var c2 = new lf.index.SimpleComparator(lf.Order.DESC);

  var leftMostKey = 1;
  var rightMostKey = 100;

  var keyRanges = [
    lf.index.SingleKeyRange.lowerBound(5, true),
    lf.index.SingleKeyRange.upperBound(5, true),
    lf.index.SingleKeyRange.only(5)
  ];

  var keyRangesOverflown = [
    new lf.index.SingleKeyRange(-100, 5, false, true),
    new lf.index.SingleKeyRange(5, 200, true, false),
    lf.index.SingleKeyRange.only(5)
  ];

  var expectations1 = [
    '[1, 5)',
    '[5, 5]',
    '(5, 100]'
  ];

  var expectations2 = [
    '(5, 100]',
    '[5, 5]',
    '[1, 5)'
  ];

  /**
   * @param {!lf.index.SimpleComparator} c
   * @param {!Array<!lf.index.SingleKeyRange>} range
   * @return {!Array<string>}
   */
  var getActual = function(c, range) {
    return c.bindAndSortKeyRanges(leftMostKey, rightMostKey, range).map(
        function(range) {
          return range.toString();
        });
  };

  assertArrayEquals(expectations1, getActual(c1, keyRanges));
  assertArrayEquals(expectations1, getActual(c1, keyRangesOverflown));
  assertArrayEquals(
      [new lf.index.SingleKeyRange(leftMostKey, rightMostKey, false, false)],
      c1.bindAndSortKeyRanges(leftMostKey, rightMostKey));

  assertArrayEquals(expectations2, getActual(c2, keyRanges));
  assertArrayEquals(expectations2, getActual(c2, keyRangesOverflown));
  assertArrayEquals(
      [new lf.index.SingleKeyRange(leftMostKey, rightMostKey, false, false)],
      c2.bindAndSortKeyRanges(leftMostKey, rightMostKey));
}


function testMultiKeyComparator_BindAndSortKeyRanges_Asc() {
  var c = new lf.index.MultiKeyComparator([lf.Order.ASC, lf.Order.ASC]);
  var leftMostKey = [1, 'A'];
  var rightMostKey = [100, 'Z'];

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
    '[1, 5),[A, D)',
    '[90, 90],[X, X]',
    '(90, 100],(X, Z]'
  ];

  var actual = c.bindAndSortKeyRanges(leftMostKey, rightMostKey, keyRanges).map(
      function(range) {
        return range.toString();
      });

  assertArrayEquals(expectations, actual);
  assertEquals(
      '[1, 100],[A, Z]',
      c.bindAndSortKeyRanges(leftMostKey, rightMostKey).toString());
}


function testMultiKeyComparator_BindAndSortKeyRanges_MixedOrder() {
  var c = new lf.index.MultiKeyComparator([lf.Order.ASC, lf.Order.DESC]);
  var leftMostKey = [0, 'Z'];
  var rightMostKey = [25, 'A'];

  // NOT(BETWEEN([2, 'X'], [24, 'B'])) OR [22, 'D']
  var keyRanges = [
    [
      new lf.index.SingleKeyRange(null, 2, false, true),
      new lf.index.SingleKeyRange(null, 'B', false, true)
    ],
    [
      new lf.index.SingleKeyRange(24, null, true, false),
      new lf.index.SingleKeyRange('X', null, true, false)
    ],
    [
      lf.index.SingleKeyRange.only(22),
      lf.index.SingleKeyRange.only('D')
    ]
  ];

  var expectations = [
    '[0, 2),(X, Z]',
    '[22, 22],[D, D]',
    '(24, 25],[A, B)'
  ];

  var actual = c.bindAndSortKeyRanges(leftMostKey, rightMostKey, keyRanges).map(
      function(range) {
        return range.toString();
      });

  assertArrayEquals(expectations, actual);
  assertEquals(
      '[0, 25],[A, Z]',
      c.bindAndSortKeyRanges(leftMostKey, rightMostKey).toString());
}


function testSimpleComparator_compareRange() {
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


function testMultiKeyComparator_compareRange() {
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
