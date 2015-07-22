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
goog.require('lf.index.RowId');
goog.require('lf.index.SingleKeyRange');


/**
 * Creates a new Index pre-populated with dummy data to be used for tests.
 * @param {number} rowCount
 * @return {!lf.index.Index}
 */
function getSampleIndex(rowCount) {
  var index = new lf.index.RowId('dummyName');

  for (var i = 0; i < rowCount; ++i) {
    index.set(i, i * 100);
  }

  return index;
}


/**
 * Performs a series of getRange() tests on the given index.
 * @param {!lf.index.Index} index
 */
function checkGetRange(index) {
  assertEquals(10, index.getRange().length);

  var result = index.getRange();
  assertEquals(10, result.length);
  result = index.getRange([lf.index.SingleKeyRange.lowerBound(1)]);
  assertEquals(9, result.length);
  assertEquals(1, result[0]);
  result = index.getRange([new lf.index.SingleKeyRange(1, 1, false, false)]);
  assertEquals(1, result.length);
  assertEquals(1, result[0]);
  result = index.getRange([new lf.index.SingleKeyRange(1, 2, false, false)]);
  assertEquals(2, result.length);
  assertEquals(1, result[0]);
  assertEquals(2, result[1]);
}


function testConstruction() {
  checkGetRange(getSampleIndex(10));
}


function testRemove() {
  var index = getSampleIndex(10);
  index.remove(2, 2);
  assertArrayEquals([], index.get(2));
  assertArrayEquals([], index.getRange([lf.index.SingleKeyRange.only(2)]));
  assertEquals(9, index.cost(new lf.index.SingleKeyRange(1, 3, false, false)));
}


/**
 * Tests that serializing and deserializing produces the original index.
 */
function testSerialize() {
  var index = getSampleIndex(10);

  var serialized = index.serialize();
  assertEquals(1, serialized.length);
  assertEquals(lf.index.RowId.ROW_ID, serialized[0].id());

  var deserialized = lf.index.RowId.deserialize('dummyName', serialized);
  checkGetRange(deserialized);
}


function testMinMax() {
  var index1 = new lf.index.RowId('dummyName');
  assertNull(index1.min());
  assertNull(index1.max());
  var rowCount = 7;
  var index2 = getSampleIndex(rowCount);
  assertArrayEquals([0, [0]], index2.min());
  assertArrayEquals([rowCount - 1, [rowCount - 1]], index2.max());
}


function testStats() {
  var index = new lf.index.RowId('dummyName');
  assertEquals(0, index.stats().totalRows);

  index.add(1, 1);
  index.add(2, 2);
  index.add(3, 3);
  assertEquals(3, index.stats().totalRows);

  index.remove(1, 1);
  assertEquals(2, index.stats().totalRows);

  index.remove(4, 4);
  assertEquals(2, index.stats().totalRows);

  index.remove(4, 4);
  assertEquals(2, index.stats().totalRows);

  index.clear();
  assertEquals(0, index.stats().totalRows);
}
