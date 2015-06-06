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
goog.require('lf.structs.Set');
goog.require('lf.structs.set');


function testSmoke() {
  var set = new lf.structs.Set();
  set.add(1);
  assertEquals(1, set.size);

  set.delete(1);
  assertEquals(0, set.size);

  for (var i = 0; i < 10; ++i) {
    set.add(i * 10);
  }
  assertTrue(set.has(10));
  assertFalse(set.has(100));

  set.clear();
  assertEquals(0, set.size);

  for (var i = 0; i < 10; ++i) {
    set.add(i * 10);
  }
  set.add(1000);
  assertEquals(11, set.size);
}

function testSetUtilsForInteger() {
  var set = new lf.structs.Set();
  for (var i = 0; i < 10; ++i) {
    set.add(i * 10);
  }
  set.add(1000);
  set.add(null);
  var undefinedVar;
  set.add(undefinedVar);
  assertEquals(13, set.size);

  var values = lf.structs.set.values(set);
  for (var i = 0; i < 10; ++i) {
    assertEquals(i * 10, values[i]);
  }
  assertEquals(1000, values[10]);
  assertEquals(null, values[11]);
  assertEquals(undefinedVar, values[12]);

  var set2 = new lf.structs.Set();
  for (var i = 0; i < 10; ++i) {
    set2.add(i * 10);
  }
  var diffSet = lf.structs.set.diff(set, set2);
  assertEquals(3, diffSet.size);
  assertTrue(diffSet.has(1000));
  assertTrue(diffSet.has(undefined));
  assertTrue(diffSet.has(null));
}

function testSetUtilsForString() {
  var set = new lf.structs.Set();
  for (var i = 0; i < 10; ++i) {
    set.add(i * 10 + '-string');
  }
  set.add(1000 + '-string');
  set.add('');
  assertEquals(12, set.size);

  var values = lf.structs.set.values(set);
  for (var i = 0; i < 10; ++i) {
    assertEquals(i * 10 + '-string', values[i]);
  }
  assertEquals(1000 + '-string', values[10]);
  assertEquals('', values[11]);

  var set2 = new lf.structs.Set();
  for (var i = 0; i < 10; ++i) {
    set2.add(i * 10 + '-string');
  }
  var diffSet = lf.structs.set.diff(set, set2);
  assertEquals(2, diffSet.size);
  assertTrue(diffSet.has(1000 + '-string'));
  assertTrue(diffSet.has(''));
}

function testSetUtilsForObjects() {
  var rows = new Array(10);
  var set = new lf.structs.Set();
  for (var i = 0; i < 10; ++i) {
    rows[i] = new Object();
    rows[i].id = i;
    rows[i].name = i + '-string';
    set.add(rows[i]);
  }
  set.add(null);
  assertEquals(11, set.size);

  var values = lf.structs.set.values(set);
  for (var i = 0; i < 10; ++i) {
    assertEquals(rows[i], values[i]);
  }
  assertEquals(null, values[10]);

  var set2 = new lf.structs.Set();
  for (var i = 0; i < 10; ++i) {
    set2.add(rows[i]);
  }

  var diffSet = lf.structs.set.diff(set, set2);
  assertEquals(1, diffSet.size);
  assertTrue(diffSet.has(null));
}
