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
goog.require('lf.Row');
goog.require('lf.index.KeyRange');
goog.require('lf.index.RowId');


function testRowId() {
  var map = new lf.index.RowId();

  var rows = [];
  for (var i = 0; i < 10; ++i) {
    rows.push(new lf.Row(i, {id: i * 100}));
    map.set(i, rows[i]);
  }

  assertEquals(10, map.getRange().length);

  // Test getRange
  var result = map.getRange();
  assertEquals(10, result.length);
  result = map.getRange(lf.index.KeyRange.lowerBound(1));
  assertEquals(9, result.length);
  assertEquals(1, result[0]);
  result = map.getRange(new lf.index.KeyRange(1, 1, false, false));
  assertEquals(1, result.length);
  assertEquals(1, result[0]);
  result = map.getRange(new lf.index.KeyRange(1, 2, false, false));
  assertEquals(2, result.length);
  assertEquals(1, result[0]);
  assertEquals(2, result[1]);

  // Test getRange after remove
  map.remove(2, 2);
  assertArrayEquals([], map.get(2));
  assertArrayEquals([], map.getRange(lf.index.KeyRange.only(2)));

  // Test cost
  assertEquals(9, map.cost(new lf.index.KeyRange(1, 3, false, false)));
}
