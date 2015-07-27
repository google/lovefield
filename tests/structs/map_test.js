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
goog.require('lf.structs.map');


function testSmoke() {
  var map = lf.structs.map.create();
  map.set(1, 2);
  assertEquals(2, map.get(1));
  assertEquals(1, map.size);
  assertTrue(map.delete(1));
  assertEquals(0, map.size);

  for (var i = 0; i < 10; ++i) {
    map.set(i, i * 10);
  }
  assertTrue(map.has(1));
  assertFalse(map.has(100));

  map.forEach(function(value, key) {
    assertEquals(value, key * 10);
  });
}

function testMapUtilsForInteger() {
  var map = lf.structs.map.create();
  map.set(1, 2);
  assertEquals(2, map.get(1));
  assertEquals(1, map.size);
  assertTrue(map.delete(1));
  assertEquals(0, map.size);

  for (var i = 0; i < 10; ++i) {
    map.set(i, i * 10);
  }
  assertTrue(map.has(1));

  map.set(10, null);
  map.set(11, undefined);
  var keys = lf.structs.map.keys(map);
  for (var i = 0; i < 12; ++i) {
    assertEquals(i, keys[i]);
  }

  var values = lf.structs.map.values(map);
  for (var i = 0; i < 10; ++i) {
    assertEquals(i * 10, values[i]);
  }
  assertEquals(null, values[10]);
  assertEquals(undefined, values[11]);
}

function testMapUtilsForString() {
  var map = lf.structs.map.create();
  map.set(1, 2 + '-str');
  assertEquals(2 + '-str', map.get(1));
  assertEquals(1, map.size);
  assertTrue(map.delete(1));
  assertEquals(0, map.size);

  for (var i = 0; i < 10; ++i) {
    map.set(i, i * 10 + '-str');
  }
  assertTrue(map.has(1));

  map.set(10, '');
  map.set(11, null);
  map.set(12, undefined);
  assertEquals(13, map.size);

  var keys = lf.structs.map.keys(map);
  for (var i = 0; i < 13; ++i) {
    assertEquals(i, keys[i]);
  }

  var values = lf.structs.map.values(map);
  for (var i = 0; i < 10; ++i) {
    assertEquals(i * 10 + '-str', values[i]);
  }
  assertEquals('', values[10]);
  assertEquals(null, values[11]);
  assertEquals(undefined, values[12]);
}

function testMapUtilsForObjects() {
  var rows = new Array(10);
  var map = lf.structs.map.create();
  for (var i = 0; i < 10; ++i) {
    rows[i] = {id: i, name: i + '-string'};
  }

  map.set(1, rows[1]);
  assertEquals(rows[1], map.get(1));
  assertEquals(1, map.size);
  assertTrue(map.delete(1));
  assertEquals(0, map.size);

  for (var i = 0; i < 10; ++i) {
    map.set(i, rows[i]);
  }
  assertTrue(map.has(1));

  map.set(10, null);
  assertEquals(11, map.size);

  var keys = lf.structs.map.keys(map);
  for (var i = 0; i < 11; ++i) {
    assertEquals(i, keys[i]);
  }

  var values = lf.structs.map.values(map);
  for (var i = 0; i < 10; ++i) {
    assertEquals(rows[i], values[i]);
  }
  assertEquals(null, values[10]);
}
