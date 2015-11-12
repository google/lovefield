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
goog.require('lf.structs.MapSet');


/**
 * Creates a pre-populated MapSet for testing.
 * @return {!lf.structs.MapSet<number, number>}
 */
function getSampleMapSet() {
  var mapSet = new lf.structs.MapSet();
  mapSet.set(10, 11);
  mapSet.set(10, 12);
  mapSet.set(20, 21);
  mapSet.set(20, 25);
  mapSet.set(30, 39);
  return mapSet;
}


function testSet() {
  var mapSet = new lf.structs.MapSet();
  assertFalse(mapSet.has(10));
  mapSet.set(10, 11);
  assertEquals(1, mapSet.size);
  assertTrue(mapSet.has(10));

  // Set the same key/value shall not alter the map.
  mapSet.set(10, 11);
  assertEquals(1, mapSet.size);

  // Set new value of a key shall alter the map.
  mapSet.set(10, 12);
  assertEquals(2, mapSet.size);
}


function testDelete() {
  var mapSet = getSampleMapSet();

  assertTrue(mapSet.delete(10, 12));
  assertEquals(4, mapSet.size);

  // Test that removing a non-existing value for an existing key does not modify
  // the map.
  assertTrue(mapSet.has(10));
  assertFalse(mapSet.delete(10, 13));
  assertEquals(4, mapSet.size);

  // Test that removing a non-existing value for a non-existing key does not
  // modify the map or throw any errors.
  assertFalse(mapSet.has(100));
  assertFalse(mapSet.delete(100, 2000));
  assertEquals(4, mapSet.size);

  assertTrue(mapSet.delete(10, 11));
  assertNull(mapSet.get(10));
}


function testGet() {
  var mapSet = getSampleMapSet();

  assertArrayEquals([11, 12], mapSet.get(10));
  assertArrayEquals([21, 25], mapSet.get(20));
  assertArrayEquals([39], mapSet.get(30));
  assertNull(mapSet.get(40));
}


function testSize() {
  var emptyMapSet = new lf.structs.MapSet();
  assertEquals(0, emptyMapSet.size);

  var mapSet = getSampleMapSet();
  assertEquals(5, mapSet.size);
  mapSet.delete(10, 11);
  assertEquals(4, mapSet.size);
  mapSet.delete(10, 12);
  assertEquals(3, mapSet.size);
  mapSet.delete(20, 21);
  assertEquals(2, mapSet.size);
  mapSet.delete(20, 25);
  assertEquals(1, mapSet.size);
  mapSet.delete(30, 39);
  assertEquals(0, mapSet.size);
}


function testClear() {
  var mapSet = getSampleMapSet();
  assertEquals(5, mapSet.size);

  mapSet.clear();
  assertEquals(0, mapSet.size);
}


function testKeys() {
  var emptyMapSet = new lf.structs.MapSet();
  assertArrayEquals([], emptyMapSet.keys());

  var mapSet = getSampleMapSet();
  assertArrayEquals([10, 20, 30], mapSet.keys());
}


function testValues() {
  var emptyMapSet = new lf.structs.MapSet();
  assertArrayEquals([], emptyMapSet.values());

  var mapSet = getSampleMapSet();
  assertArrayEquals([11, 12, 21, 25, 39], mapSet.values());
}


function testMerge_Empty() {
  var m1 = new lf.structs.MapSet();
  var m2 = new lf.structs.MapSet();
  var merged = m1.merge(m2);
  assertEquals(merged, m1);
  assertEquals(0, m1.size);
}


function testMerge() {
  var mapSet1 = getSampleMapSet();
  assertEquals(5, mapSet1.size);
  var mapSet2 = new lf.structs.MapSet();
  mapSet2.set(10, 100);
  mapSet2.set(20, 200);
  mapSet2.set(40, 400);

  mapSet1.merge(mapSet2);
  assertEquals(5 + mapSet2.size, mapSet1.size);
  assertArrayEquals([11, 12, 100], mapSet1.get(10));
  assertArrayEquals([21, 25, 200], mapSet1.get(20));
  assertArrayEquals([39], mapSet1.get(30));
  assertArrayEquals([400], mapSet1.get(40));
}
