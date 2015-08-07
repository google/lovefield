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


/** @type {!lf.structs.MapSet<number, number>} */ var mapSet;

function setUp() {
  mapSet = new lf.structs.MapSet();
}

function populateMap() {
  mapSet.set(10, 11);
  mapSet.set(10, 12);
  mapSet.set(20, 21);
  mapSet.set(20, 25);
  mapSet.set(30, 39);
}

function testSet() {
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
  populateMap();

  assertTrue(mapSet.delete(10, 12));
  assertEquals(4, mapSet.size);

  // Test that removing a non-existing value does not modify the map.
  assertFalse(mapSet.delete(10, 13));
  assertEquals(4, mapSet.size);

  assertTrue(mapSet.delete(10, 11));
  assertNull(mapSet.get(10));
}

function testGet() {
  populateMap();

  assertArrayEquals([11, 12], mapSet.get(10));
  assertArrayEquals([21, 25], mapSet.get(20));
  assertArrayEquals([39], mapSet.get(30));
  assertNull(mapSet.get(40));
}

function testSize() {
  assertEquals(0, mapSet.size);
  populateMap();

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
  populateMap();

  assertEquals(5, mapSet.size);

  mapSet.clear();
  assertEquals(0, mapSet.size);
}

function testKeys() {
  assertArrayEquals([], mapSet.keys());
  populateMap();
  assertArrayEquals([10, 20, 30], mapSet.keys());
}

function testValues() {
  assertArrayEquals([], mapSet.values());
  populateMap();
  assertArrayEquals([11, 12, 21, 25, 39], mapSet.values());
}
