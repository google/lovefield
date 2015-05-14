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
goog.require('order.db');


function testKeyOfIndex_CrossColumnKey() {
  var table = order.db.getSchema().getDummyTable();
  var row = table.createRow({
    'boolean': true,
    'datetime': new Date(999),
    'integer': 2,
    'number': 3,
    'string': 'bar'
  });
  assertEquals(row.id(), row.keyOfIndex(table.getRowIdIndexName()));

  var indices = table.getIndices();
  var pkIndexSchema = indices[0];
  assertArrayEquals(
      ['bar', 2],
      row.keyOfIndex(pkIndexSchema.getNormalizedName()));

  var numberStringIndexSchema = indices[1];
  assertArrayEquals(
      [3, 2],
      row.keyOfIndex(numberStringIndexSchema.getNormalizedName()));

  var numberIntegerStringIndexSchema = indices[2];
  assertArrayEquals(
      [3, 2, 'bar'],
      row.keyOfIndex(numberIntegerStringIndexSchema.getNormalizedName()));

  var dateTimeStringIndexSchema = indices[3];
  assertArrayEquals(
      [999, 'bar'],
      row.keyOfIndex(dateTimeStringIndexSchema.getNormalizedName()));

  var booleanStringIndexSchema = indices[4];
  assertArrayEquals(
      [1, 'bar'],
      row.keyOfIndex(booleanStringIndexSchema.getNormalizedName()));
}


/**
 * Tests that keyOfIndex() is correctly handling nullable fields for a
 * statically generated schema.
 */
function testKeyOfIndex_NullableKey() {
  var table = order.db.getSchema().getNullableTable();
  var row = table.createRow();
  table.getIndices().forEach(function(indexSchema) {
    assertNull(row.keyOfIndex(indexSchema.getNormalizedName()));
  });
}
