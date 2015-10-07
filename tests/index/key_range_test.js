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
goog.setTestOnly();
goog.require('goog.testing.jsunit');
goog.require('lf.index.Favor');
goog.require('lf.index.SingleKeyRange');


/**
 * Tests KeyRange#complement() for the case where the original key range has
 * specified bounds on both sides.
 */
function testComplement_WithBounds() {
  // Testing case where both lower and upper bound are included.
  var keyRange = new lf.index.SingleKeyRange(10, 20, false, false);
  var complementKeyRanges = keyRange.complement();
  assertEquals(2, complementKeyRanges.length);
  assertEquals('[unbound, 10)', complementKeyRanges[0].toString());
  assertEquals('(20, unbound]', complementKeyRanges[1].toString());

  // Testing case where lower bound is excluded.
  keyRange = new lf.index.SingleKeyRange(10, 20, true, false);
  complementKeyRanges = keyRange.complement();
  assertEquals(2, complementKeyRanges.length);
  assertEquals('[unbound, 10]', complementKeyRanges[0].toString());
  assertEquals('(20, unbound]', complementKeyRanges[1].toString());

  // Testing case where upper bound is excluded.
  keyRange = new lf.index.SingleKeyRange(10, 20, false, true);
  complementKeyRanges = keyRange.complement();
  assertEquals(2, complementKeyRanges.length);
  assertEquals('[unbound, 10)', complementKeyRanges[0].toString());
  assertEquals('[20, unbound]', complementKeyRanges[1].toString());

  // Testing case where both lower and upper bound are excluded.
  keyRange = new lf.index.SingleKeyRange(10, 20, true, true);
  complementKeyRanges = keyRange.complement();
  assertEquals(2, complementKeyRanges.length);
  assertEquals('[unbound, 10]', complementKeyRanges[0].toString());
  assertEquals('[20, unbound]', complementKeyRanges[1].toString());
}


/**
 * Tests KeyRange#complement() for the case where the original key range only
 * has an upper bound.
 */
function testComplement_UpperBoundOnly() {
  var keyRange = lf.index.SingleKeyRange.upperBound(20);
  var complementKeyRanges = keyRange.complement();
  assertEquals(1, complementKeyRanges.length);
  assertEquals('(20, unbound]', complementKeyRanges[0].toString());

  keyRange = lf.index.SingleKeyRange.upperBound(20, true);
  complementKeyRanges = keyRange.complement();
  assertEquals(1, complementKeyRanges.length);
  assertEquals('[20, unbound]', complementKeyRanges[0].toString());
}


/**
 * Tests KeyRange#complement() for the case where the original key range only
 * has an lower bound.
 */
function testComplement_LowerBoundOnly() {
  var keyRange = lf.index.SingleKeyRange.lowerBound(20);
  var complementKeyRanges = keyRange.complement();
  assertEquals(1, complementKeyRanges.length);
  assertEquals('[unbound, 20)', complementKeyRanges[0].toString());

  keyRange = lf.index.SingleKeyRange.lowerBound(20, true);
  complementKeyRanges = keyRange.complement();
  assertEquals(1, complementKeyRanges.length);
  assertEquals('[unbound, 20]', complementKeyRanges[0].toString());
}


/**
 * Tests KeyRange#complement() for the case where the original key range is not
 * bounded on either side.
 */
function testComplement_NoBound() {
  var keyRange = lf.index.SingleKeyRange.all();
  // The complement of a completely unbounded key range is the empty key range.
  assertEquals(0, keyRange.complement().length);
}


/**
 * Tests KeyRange#complement() for the case where the original key range
 * includes a single value.
 */
function testComplement_OnlyOneValue() {
  var keyRange = lf.index.SingleKeyRange.only(20);
  var complementKeyRanges = keyRange.complement();
  assertEquals(2, complementKeyRanges.length);
  assertEquals('[unbound, 20)', complementKeyRanges[0].toString());
  assertEquals('(20, unbound]', complementKeyRanges[1].toString());
}


/**
 * Tests the static KeyRange#complement() which accepts multiple key ranges.
 */
function testComplement_MultipleKeyRanges() {
  var complementKeyRanges = lf.index.SingleKeyRange.complement([]);
  assertEquals(0, complementKeyRanges.length);

  var keyRange1 = lf.index.SingleKeyRange.only(20);
  complementKeyRanges = lf.index.SingleKeyRange.complement([keyRange1]);
  assertEquals('[unbound, 20),(20, unbound]', complementKeyRanges.join(','));

  var keyRange2 = lf.index.SingleKeyRange.only(40);
  complementKeyRanges = lf.index.SingleKeyRange.complement(
      [keyRange1, keyRange2]);
  assertEquals(
      '[unbound, 20),(20, 40),(40, unbound]',
      complementKeyRanges.join(','));

  complementKeyRanges = lf.index.SingleKeyRange.complement(
      [keyRange2, keyRange1]);
  assertEquals(
      '[unbound, 20),(20, 40),(40, unbound]',
      complementKeyRanges.join(','));
}


/**
 * Tests KeyRange#isOnly().
 */
function test_IsOnly() {
  assertFalse(lf.index.SingleKeyRange.upperBound(20).isOnly());
  assertFalse(lf.index.SingleKeyRange.all().isOnly());
  assertTrue(lf.index.SingleKeyRange.only(20).isOnly());
}


/**
 * Tests KeyRange#isAll().
 */
function test_IsAll() {
  assertFalse(lf.index.SingleKeyRange.only(20).isAll());
  assertFalse(lf.index.SingleKeyRange.upperBound(20).isAll());
  assertTrue(lf.index.SingleKeyRange.all().isAll());
}


function testReverse() {
  var keyRange = lf.index.SingleKeyRange.only(20);
  assertEquals('[20, 20]' , keyRange.toString());
  assertEquals('[20, 20]', keyRange.reverse().toString());

  keyRange = lf.index.SingleKeyRange.upperBound(20);
  assertEquals('[unbound, 20]' , keyRange.toString());
  assertEquals('[20, unbound]' , keyRange.reverse().toString());

  keyRange = lf.index.SingleKeyRange.lowerBound(20);
  assertEquals('[20, unbound]' , keyRange.toString());
  assertEquals('[unbound, 20]' , keyRange.reverse().toString());

  keyRange = lf.index.SingleKeyRange.all();
  assertEquals('[unbound, unbound]' , keyRange.toString());
  assertEquals('[unbound, unbound]' , keyRange.reverse().toString());

  keyRange = new lf.index.SingleKeyRange(20, 50, false, true);
  assertEquals('[20, 50)' , keyRange.toString());
  assertEquals('(50, 20]' , keyRange.reverse().toString());
}


function testContains() {
  var range = new lf.index.SingleKeyRange(0, 10, true, true);
  assertFalse(range.contains(-1));
  assertFalse(range.contains(0));
  assertTrue(range.contains(5));
  assertFalse(range.contains(10));
  assertFalse(range.contains(11));

  range = new lf.index.SingleKeyRange('B', 'D', false, false);
  assertFalse(range.contains('A'));
  assertTrue(range.contains('B'));
  assertTrue(range.contains('C'));
  assertTrue(range.contains('D'));
  assertFalse(range.contains('E'));
}


function testGetBounded() {
  var range = new lf.index.SingleKeyRange(1, 10, true, true);
  var bound = function(min, max) {
    var r = range.getBounded(min, max);
    return goog.isNull(r) ? 'null' : r.toString();
  };

  assertEquals('(1, 10)', bound(0, 11));
  assertEquals('(1, 10)', bound(1, 10));
  assertEquals('(1, 2]', bound(0, 2));
  assertEquals('[2, 10)', bound(2, 11));
  assertEquals('[2, 3]', bound(2, 3));
  assertEquals('null', bound(-1, 0));
  assertEquals('null', bound(11, 12));
}


function testEquals() {
  assertTrue(lf.index.SingleKeyRange.all().equals(
      lf.index.SingleKeyRange.all()));
  assertTrue(lf.index.SingleKeyRange.only(1).equals(
      lf.index.SingleKeyRange.only(1)));
  assertTrue(new lf.index.SingleKeyRange(1, 2, true, false).equals(
      new lf.index.SingleKeyRange(1, 2, true, false)));
  assertFalse(new lf.index.SingleKeyRange(1, 2, false, false).equals(
      new lf.index.SingleKeyRange(1, 2, true, false)));
}


function testXor() {
  var xor = lf.index.SingleKeyRange.xor;
  assertFalse(xor(true, true));
  assertTrue(xor(true, false));
  assertTrue(xor(false, true));
  assertFalse(xor(false, false));
}


function generateTestRanges() {
  return {
    all: lf.index.SingleKeyRange.all(),
    upTo1: lf.index.SingleKeyRange.upperBound(1),
    upTo1Ex: lf.index.SingleKeyRange.upperBound(1, true),
    upTo2: lf.index.SingleKeyRange.upperBound(2),
    upTo2Ex: lf.index.SingleKeyRange.upperBound(2, true),
    atLeast1: lf.index.SingleKeyRange.lowerBound(1),
    atLeast1Ex: lf.index.SingleKeyRange.lowerBound(1, true),
    atLeast2: lf.index.SingleKeyRange.lowerBound(2),
    atLeast2Ex: lf.index.SingleKeyRange.lowerBound(2, true),
    only1: lf.index.SingleKeyRange.only(1),
    only2: lf.index.SingleKeyRange.only(2),
    r1: new lf.index.SingleKeyRange(5, 10, false, false),
    r2: new lf.index.SingleKeyRange(5, 10, true, false),
    r3: new lf.index.SingleKeyRange(5, 10, false, true),
    r4: new lf.index.SingleKeyRange(5, 10, true, true),
    r5: new lf.index.SingleKeyRange(10, 11, false, false),
    r6: new lf.index.SingleKeyRange(1, 5, false, false),
    r7: new lf.index.SingleKeyRange(-1, 0, false, false)
  };
}


function testCompare() {
  var c = lf.index.SingleKeyRange.compare;

  var r = generateTestRanges();

  var cases = [
    r.all,
    r.upTo1, r.upTo1Ex,
    r.atLeast1, r.atLeast1Ex,
    r.only1,
    r.r1, r.r2, r.r3, r.r4
  ];
  cases.forEach(function(r) {
    assertEquals(lf.index.Favor.TIE, c(r, r));
  });

  // Test pairs that RHS always wins.
  var pairs = [
    [r.upTo1, r.all],
    [r.all, r.atLeast1],
    [r.all, r.only1],
    [r.atLeast1, r.atLeast2],
    [r.upTo1, r.upTo2],
    [r.atLeast1, r.atLeast1Ex],
    [r.upTo1Ex, r.upTo1],
    [r.r1, r.r2],
    [r.r3, r.r1],
    [r.r1, r.r4],
    [r.r3, r.r2],
    [r.r1, r.r5],
    [r.r6, r.r1],
    [r.only1, r.only2]
  ];

  pairs.forEach(function(pair) {
    assertEquals(lf.index.Favor.RHS, c(pair[0], pair[1]));
    assertEquals(lf.index.Favor.LHS, c(pair[1], pair[0]));
  });
}


function testOverlaps() {
  var r = generateTestRanges();

  var cases = [
    r.all,
    r.upTo1, r.upTo1Ex,
    r.atLeast1, r.atLeast1Ex,
    r.only1,
    r.r1, r.r2, r.r3, r.r4
  ];
  cases.forEach(function(range) {
    assertTrue(range.overlaps(range));
    assertTrue(range.overlaps(r.all));
    assertTrue(r.all.overlaps(range));
  });

  var overlapping = [
    [r.upTo1, r.upTo1Ex],
    [r.upTo1, r.upTo2],
    [r.upTo1, r.only1],
    [r.upTo1, r.atLeast1],
    [r.upTo1, r.r6],
    [r.upTo1Ex, r.upTo2],
    [r.atLeast1, r.only1],
    [r.atLeast1, r.only2],
    [r.atLeast1, r.r1],
    [r.atLeast1, r.r6],
    [r.r1, r.r2],
    [r.r1, r.r3],
    [r.r1, r.r4],
    [r.r1, r.r5],
    [r.r1, r.r6],
    [r.r2, r.r3],
    [r.r2, r.r4]
  ];
  overlapping.forEach(function(pair) {
    assertTrue(pair[0].overlaps(pair[1]));
    assertTrue(pair[1].overlaps(pair[0]));
  });

  var excluding = [
    [r.upTo1, r.only2],
    [r.upTo1Ex, r.r6],
    [r.upTo1, r.atLeast1Ex],
    [r.upTo1, r.atLeast2],
    [r.upTo1Ex, r.atLeast1Ex],
    [r.upTo1Ex, r.only1],
    [r.upTo1Ex, r.only2],
    [r.only1, r.atLeast1Ex],
    [r.only1, r.atLeast2],
    [r.r3, r.r5],
    [r.r4, r.r5],
    [r.r2, r.r6],
    [r.r4, r.r6]
  ];
  excluding.forEach(function(pair) {
    assertFalse(pair[0].overlaps(pair[1]));
    assertFalse(pair[1].overlaps(pair[0]));
  });
}

function testGetBoundingRange() {
  var r = generateTestRanges();
  var check = function(expected, r1, r2) {
    assertTrue(expected.equals(
        lf.index.SingleKeyRange.getBoundingRange(r1, r2)));
    assertTrue(expected.equals(
        lf.index.SingleKeyRange.getBoundingRange(r2, r1)));
  };

  // Self and or with r.all.
  check(r.all, r.all, r.all);
  var cases = [
    r.upTo1,
    r.upTo1Ex,
    r.atLeast1,
    r.atLeast1Ex,
    r.only1,
    r.r1,
    r.r2,
    r.r3,
    r.r4
  ];
  cases.forEach(function(range) {
    check(range, range, range);
    check(r.all, range, r.all);
  });

  // Overlapping test cases.
  check(r.upTo1, r.upTo1, r.upTo1Ex);
  check(r.upTo2, r.upTo1, r.upTo2);
  check(r.upTo1, r.upTo1, r.only1);
  check(r.upTo2Ex, r.upTo1, r.upTo2Ex);
  check(r.all, r.upTo1, r.atLeast1);
  check(lf.index.SingleKeyRange.upperBound(5), r.upTo1, r.r6);
  check(r.upTo2, r.upTo1Ex, r.upTo2);
  check(r.atLeast1, r.atLeast1, r.only1);
  check(r.atLeast1, r.atLeast1, r.only2);
  check(r.atLeast1, r.atLeast1, r.r1);
  check(r.atLeast1, r.atLeast1, r.r6);
  check(r.atLeast1Ex, r.atLeast1Ex, r.atLeast2);
  check(r.r1, r.r1, r.r2);
  check(r.r1, r.r1, r.r3);
  check(r.r1, r.r1, r.r4);
  check(new lf.index.SingleKeyRange(5, 11, false, false), r.r1, r.r5);
  check(new lf.index.SingleKeyRange(1, 10, false, false), r.r1, r.r6);
  check(r.r1, r.r2, r.r3);
  check(r.r2, r.r2, r.r4);

  // Non-overlapping test cases.
  check(r.all, r.upTo1Ex, r.atLeast1Ex);
  check(r.upTo1, r.upTo1Ex, r.only1);
  check(r.atLeast1, r.atLeast1Ex, r.only1);
  check(new lf.index.SingleKeyRange(-1, 10, false, true), r.r7, r.r3);
}


function testAnd() {
  var r = generateTestRanges();
  var check = function(expected, r1, r2) {
    assertTrue(expected.equals(lf.index.SingleKeyRange.and(r1, r2)));
    assertTrue(expected.equals(lf.index.SingleKeyRange.and(r2, r1)));
  };

  // Self and or with r.all.
  check(r.all, r.all, r.all);
  var cases = [
    r.upTo1,
    r.upTo1Ex,
    r.atLeast1,
    r.atLeast1Ex,
    r.only1,
    r.r1,
    r.r2,
    r.r3,
    r.r4
  ];
  cases.forEach(function(range) {
    check(range, range, range);
    check(range, range, r.all);
  });

  // Overlapping test cases.
  check(r.upTo1Ex, r.upTo1, r.upTo1Ex);
  check(r.upTo1, r.upTo1, r.upTo2);
  check(r.only1, r.upTo1, r.only1);
  check(r.upTo1, r.upTo1, r.upTo2Ex);
  check(r.only1, r.upTo1, r.atLeast1);
  check(r.only1, r.upTo1, r.r6);
  check(r.upTo1Ex, r.upTo1Ex, r.upTo2);
  check(r.only1, r.atLeast1, r.only1);
  check(r.r1, r.atLeast1, r.r1);
  check(r.r6, r.atLeast1, r.r6);
  check(r.atLeast2, r.atLeast1Ex, r.atLeast2);
  check(r.r2, r.r1, r.r2);
  check(r.r3, r.r1, r.r3);
  check(r.r4, r.r1, r.r4);
  check(lf.index.SingleKeyRange.only(10), r.r1, r.r5);
  check(lf.index.SingleKeyRange.only(5), r.r1, r.r6);
  check(r.r4, r.r2, r.r3);
  check(r.r4, r.r2, r.r4);

  // Excluding shall return null.
  var excluding = [
    [r.upTo1, r.only2],
    [r.upTo1Ex, r.r6],
    [r.upTo1, r.atLeast1Ex],
    [r.upTo1, r.atLeast2],
    [r.upTo1Ex, r.only1],
    [r.upTo1Ex, r.only2],
    [r.only1, r.atLeast1Ex],
    [r.only1, r.atLeast2],
    [r.r3, r.r5],
    [r.r4, r.r5],
    [r.r6, r.r2],
    [r.r6, r.r4]
  ];
  excluding.forEach(function(pair) {
    assertNull(lf.index.SingleKeyRange.and(pair[0], pair[1]));
    assertNull(lf.index.SingleKeyRange.and(pair[1], pair[0]));
  });
}
