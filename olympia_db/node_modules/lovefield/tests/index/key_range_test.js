/**
 * @license
 * Copyright 2014 Google Inc. All Rights Reserved.
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
/** @suppress {extraRequire} */
goog.require('lf.index.Index');
goog.require('lf.index.KeyRange');


/**
 * Tests KeyRange#complement() for the case where the original key range has
 * specified bounds on both sides.
 */
function testComplement_WithBounds() {
  // Testing case where both lower and upper bound are included.
  var keyRange = new lf.index.KeyRange(10, 20, false, false);
  var complementKeyRanges = keyRange.complement();
  assertEquals(2, complementKeyRanges.length);
  assertEquals('[unbound, 10)', complementKeyRanges[0].toString());
  assertEquals('(20, unbound]', complementKeyRanges[1].toString());

  // Testing case where lower bound is excluded.
  keyRange = new lf.index.KeyRange(10, 20, true, false);
  complementKeyRanges = keyRange.complement();
  assertEquals(2, complementKeyRanges.length);
  assertEquals('[unbound, 10]', complementKeyRanges[0].toString());
  assertEquals('(20, unbound]', complementKeyRanges[1].toString());

  // Testing case where upper bound is excluded.
  keyRange = new lf.index.KeyRange(10, 20, false, true);
  complementKeyRanges = keyRange.complement();
  assertEquals(2, complementKeyRanges.length);
  assertEquals('[unbound, 10)', complementKeyRanges[0].toString());
  assertEquals('[20, unbound]', complementKeyRanges[1].toString());

  // Testing case where both lower and upper bound are excluded.
  keyRange = new lf.index.KeyRange(10, 20, true, true);
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
  var keyRange = new lf.index.KeyRange(null, 20, false, false);
  var complementKeyRanges = keyRange.complement();
  assertEquals(1, complementKeyRanges.length);
  assertEquals('(20, unbound]', complementKeyRanges[0].toString());

  keyRange = new lf.index.KeyRange(null, 20, false, true);
  complementKeyRanges = keyRange.complement();
  assertEquals(1, complementKeyRanges.length);
  assertEquals('[20, unbound]', complementKeyRanges[0].toString());
}


/**
 * Tests KeyRange#complement() for the case where the original key range only
 * has an lower bound.
 */
function testComplement_LowerBoundOnly() {
  var keyRange = new lf.index.KeyRange(20, null, false, false);
  var complementKeyRanges = keyRange.complement();
  assertEquals(1, complementKeyRanges.length);
  assertEquals('[unbound, 20)', complementKeyRanges[0].toString());

  keyRange = new lf.index.KeyRange(20, null, true, false);
  complementKeyRanges = keyRange.complement();
  assertEquals(1, complementKeyRanges.length);
  assertEquals('[unbound, 20]', complementKeyRanges[0].toString());
}


/**
 * Tests KeyRange#complement() for the case where the original key range is not
 * bounded on either side.
 */
function testComplement_NoBound() {
  var keyRange = lf.index.KeyRange.all();
  // The complement of a completely unbounded key range is the empty key range.
  assertEquals(0, keyRange.complement().length);
}


/**
 * Tests KeyRange#complement() for the case where the original key range
 * includes a single value.
 */
function testComplement_OnlyOneValue() {
  var keyRange = lf.index.KeyRange.only(20);
  var complementKeyRanges = keyRange.complement();
  assertEquals(2, complementKeyRanges.length);
  assertEquals('[unbound, 20)', complementKeyRanges[0].toString());
  assertEquals('(20, unbound]', complementKeyRanges[1].toString());
}
