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
goog.require('lf.index');


function testHashCode() {
  assertEquals(0, lf.index.hashCode(''));

  // Space char's ASCII code is 32.
  // Hash function is hash = hash * 31 + c, so hash code of 32 is 32,
  // and hash code of two 32's are 32 * 32 = 1024
  assertEquals(32, lf.index.hashCode(' '));
  assertEquals(1024, lf.index.hashCode('  '));
}

function testHashArray() {
  assertEquals('', lf.index.hashArray([]));
  assertEquals('', lf.index.hashArray([null]));
  assertEquals('0_', lf.index.hashArray(['', null]));
  assertEquals('10', lf.index.hashArray([' ']));
  assertEquals('10_10', lf.index.hashArray([' ', ' ']));
}


/**
 * Tests the case where lf.index.slice() is called with an explicit ASC order.
 */
function testSlice_Asc() {
  checkSlice(false);
}


/**
 * Tests the case where lf.index.slice() is called with an explicit DESC order.
 */
function testSlice_Desc() {
  checkSlice(true);
}


/** @param {boolean} reverseOrder */
function checkSlice(reverseOrder) {
  /** @const {!Array<number>} */
  var ARRAY = [0, 1, 2, 3, 4];
  /** @const {!Array<number>} */
  var REVERSE_ARRAY = ARRAY.slice().reverse();

  assertArrayEquals(
      !reverseOrder ? ARRAY : REVERSE_ARRAY,
      lf.index.slice(ARRAY.slice(), reverseOrder));

  // Test empty array
  assertArrayEquals([], lf.index.slice([]));
  assertArrayEquals([], lf.index.slice([], reverseOrder, 1));
  assertArrayEquals([], lf.index.slice([], reverseOrder, undefined, 1));

  // Test LIMIT
  assertArrayEquals(
      !reverseOrder ? [ARRAY[0]] : [REVERSE_ARRAY[0]],
      lf.index.slice(ARRAY.slice(), reverseOrder, 1));
  assertArrayEquals(
      !reverseOrder ? ARRAY : REVERSE_ARRAY,
      lf.index.slice(ARRAY.slice(), reverseOrder, ARRAY.length));
  assertArrayEquals(
      !reverseOrder ? ARRAY : REVERSE_ARRAY,
      lf.index.slice(ARRAY.slice(), reverseOrder, ARRAY.length + 1));

  // Test SKIP
  assertArrayEquals(
      !reverseOrder ? ARRAY : REVERSE_ARRAY,
      lf.index.slice(ARRAY.slice(), reverseOrder, undefined, 0));
  assertArrayEquals(
      !reverseOrder ? ARRAY : REVERSE_ARRAY,
      lf.index.slice(ARRAY.slice(), reverseOrder, ARRAY.length, 0));

  for (var i = 0; i < ARRAY.length; ++i) {
    assertArrayEquals(
        !reverseOrder ? [ARRAY[i]] : [REVERSE_ARRAY[i]],
        lf.index.slice(ARRAY.slice(), reverseOrder, 1, i));
  }
}
