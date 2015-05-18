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
goog.module('map.test');
goog.setTestOnly('map.test');

var jsunit = goog.require('goog.testing.jsunit');
var Map = goog.require('lf.structs.Map');
var testSuite = goog.require('goog.testing.testSuite');


exports.testSmoke = function() {
  var map = new Map();
  map.set(1, 2);
  assertEquals(2, map.get(1));
  assertEquals(1, map.size);
  map.delete(1);
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


testSuite(exports);
