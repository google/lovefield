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
goog.require('lf.index.SingleKeyRange');
goog.require('lf.index.SingleKeyRangeSet');


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


function testAdd() {
  /**
   * @param {!Array<!lf.index.SingleKeyRange>} expected
   * @param {!Array<!lf.index.SingleKeyRange>} ranges
   */
  var check = function(expected, ranges) {
    var set = new lf.index.SingleKeyRangeSet();
    set.add(ranges);
    assertArrayEquals(expected, set.getValues());
  };
  var r = generateTestRanges();

  // Empty
  check([], []);

  // Self
  check([r.all], [r.all]);
  check([r.upTo1], [r.upTo1]);
  check([r.atLeast1], [r.atLeast1]);
  check([r.only1], [r.only1]);
  check([r.r1], [r.r1]);
  check([r.r2], [r.r2, r.r2]);
  check([r.r3], [r.r3, r.r3]);
  check([r.r4], [r.r4, r.r4]);

  // Merge to r.all
  check([r.all], [r.all, r.upTo1]);
  check([r.all], [r.all, r.r1, r.r5]);
  check([r.all], [r.only2, r.only1, r.all]);
  check([r.all], [r.r1, r.only2, r.atLeast1Ex, r.all]);

  // Overlapping test cases.
  check([r.upTo1], [r.upTo1, r.upTo1Ex]);
  check([r.upTo2], [r.upTo1, r.upTo2]);
  check([r.upTo1], [r.upTo1, r.only1]);
  check([r.all], [r.upTo1, r.atLeast1]);
  check([lf.index.SingleKeyRange.upperBound(5)], [r.upTo1, r.r6]);
  check([r.upTo2], [r.upTo1Ex, r.upTo2]);
  check([r.atLeast1], [r.atLeast1, r.only1]);
  check([r.atLeast1], [r.atLeast1, r.only2]);
  check([r.atLeast1], [r.atLeast1, r.r1]);
  check([r.atLeast1], [r.atLeast1, r.r6]);
  check([r.r1], [r.r1, r.r2]);
  check([r.r1], [r.r1, r.r3]);
  check([r.r1], [r.r1, r.r4]);
  check([new lf.index.SingleKeyRange(5, 11, false, false)], [r.r1, r.r5]);
  check([new lf.index.SingleKeyRange(1, 10, false, false)], [r.r1, r.r6]);
  check([r.r1], [r.r2, r.r3]);
  check([r.r2], [r.r2, r.r4]);
  check([r.r1], [r.r1, r.r2, r.r3, r.r4]);
  check(
      [new lf.index.SingleKeyRange(1, 11, false, false)],
      [r.r1, r.r2, r.r3, r.r4, r.r5, r.r6]);
  check([r.all], [r.atLeast1, r.r1, r.r5, r.r6, r.upTo1]);


  var excluding = [
    [r.upTo1, r.only2],
    [r.upTo1Ex, r.r6],
    [r.upTo1, r.atLeast1Ex],
    [r.upTo1, r.atLeast2],
    [r.upTo1Ex, r.only1],
    [r.upTo1Ex, r.only2],
    [r.upTo1Ex, r.atLeast1Ex],
    [r.upTo1Ex, r.atLeast2],
    [r.only1, r.atLeast1Ex],
    [r.only1, r.atLeast2],
    [r.r3, r.r5],
    [r.r4, r.r5],
    [r.r6, r.r2],
    [r.r6, r.r4]
  ];
  excluding.forEach(function(pair) {
    check(pair, pair);
  });
  check([r.r7, r.r6, r.r5], [r.r5, r.r7, r.r7, r.r6]);
  check([r.upTo1Ex, r.only1, r.r5], [r.upTo1Ex, r.only1, r.r5]);
}


function testBoundingRange() {
  /**
   * @param {!lf.index.SingleKeyRange} expected
   * @param {!Array<!lf.index.SingleKeyRange>} ranges
   */
  var check = function(expected, ranges) {
    var set = new lf.index.SingleKeyRangeSet(ranges);
    assertTrue(expected.equals(/** @type {!lf.index.SingleKeyRange} */ (
        set.getBoundingRange())));
  };
  var r = generateTestRanges();

  check(r.all, [r.only1, r.all]);
  check(r.all, [r.upTo1Ex, r.atLeast1]);
  check(r.all, [r.upTo1Ex, r.atLeast1Ex]);
  check(r.all, [r.upTo1, r.atLeast1]);
  check(new lf.index.SingleKeyRange(1, 11, false, false), [r.r5, r.r6]);
}


function testEquals() {
  var r = generateTestRanges();

  assertTrue(new lf.index.SingleKeyRangeSet().equals(
      new lf.index.SingleKeyRangeSet()));
  assertTrue(new lf.index.SingleKeyRangeSet([r.all]).equals(
      new lf.index.SingleKeyRangeSet([r.upTo1, r.atLeast1])));
  assertFalse(new lf.index.SingleKeyRangeSet([r.all]).equals(
      new lf.index.SingleKeyRangeSet([r.upTo1Ex, r.atLeast1])));
}

function testIntersect() {
  var r = generateTestRanges();

  /**
   * @param {!Array<!lf.index.SingleKeyRange>} expected
   * @param {!Array<!lf.index.SingleKeyRange>} ranges0
   * @param {!Array<!lf.index.SingleKeyRange>} ranges1
   */
  function check(expected, ranges0, ranges1) {
    var s0 = new lf.index.SingleKeyRangeSet(ranges0);
    var s1 = new lf.index.SingleKeyRangeSet(ranges1);
    var intersected = lf.index.SingleKeyRangeSet.intersect(s0, s1);
    assertTrue(new lf.index.SingleKeyRangeSet(expected).equals(intersected));
  }

  // Empty in empty out.
  check([], [], []);

  // No intersections.
  check([], [r.only1], [r.only2]);
  check([], [r.upTo1Ex, r.atLeast1Ex], [r.only1]);
  check([], [r.r5, r.r7], [r.r4]);

  // One overlap.
  check([r.only1], [r.upTo1], [r.atLeast1]);
  check([r.only1], [r.all], [r.only1]);
  check([r.only1], [r.r6], [r.upTo1]);
  check([new lf.index.SingleKeyRange(1, 5, true, false)],
      [r.r6], [r.atLeast1Ex]);

  // Two overlaps
  check([r.only1, new lf.index.SingleKeyRange(1, 5, true, false)],
      [r.r6], [r.upTo1, r.atLeast1Ex]);
  check([r.upTo1, r.atLeast2], [r.upTo2, r.atLeast1], [r.upTo1, r.atLeast2]);
  check([r.upTo1Ex, r.atLeast2],
      [r.upTo2, r.atLeast1], [r.upTo1Ex, r.atLeast2]);
  check([r.upTo1, r.atLeast2Ex],
      [r.upTo2Ex, r.atLeast1], [r.upTo1, r.atLeast2Ex]);
  check([r.only1, r.only2], [r.upTo1, r.atLeast2], [r.only1, r.only2]);

  // Three overlaps
  check([r.upTo1Ex, r.only2, r.r4],
      [r.upTo2Ex, r.only2, r.r1], [r.upTo1Ex, r.only2, r.r4]);
}
