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
goog.require('lf.testing.MockSchema');


/** @type {!lf.schema.Database} */
var schema;


function setUpPage() {
  schema = new lf.testing.MockSchema();
}


/**
 * Tests the case where indices exist for a given column.
 */
function testGetIndices() {
  var table = schema.getTables()[0];

  var idIndices = table.id.getIndices();
  assertEquals(1, idIndices.length);
  assertTrue(idIndices[0].columnNames.indexOf(table.id.getName()) != -1);

  var nameIndices = table.name.getIndices();
  assertEquals(1, nameIndices.length);
  assertTrue(nameIndices[0].columnNames.indexOf(table.name.getName()) != -1);
}


/**
 * Tests the case where no indices exist for a given column.
 */
function testGetIndices_NoIndicesExist() {
  var tableWithNoIndices = schema.getTables()[2];
  assertEquals(0, tableWithNoIndices.id.getIndices().length);
  assertEquals(0, tableWithNoIndices.name.getIndices().length);
}

