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
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('lf.backstore.Memory');
goog.require('lf.testing.MockSchema');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'MemoryBackStore');


/** @type {!lf.backstore.Memory} */
var store;


/** @type {!lf.schema.Database} */
var schema;


function setUp() {
  asyncTestCase.waitForAsync('setUp');

  schema = new lf.testing.MockSchema();
  store = new lf.backstore.Memory(schema);

  store.init().then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that the backstore.Memory is instantiated according to the schema
 * instance that is passed into its constructor.
 */
function testConstruction() {
  assertTrue(schema.getTables().length > 0);

  schema.getTables().forEach(
      function(table) {
        assertNotNull(store.getTableInternal(table.getName()));
      });
}


function testCreateTable() {
  var tableNames = [];
  for (var i = 0; i < 10; i++) {
    tableNames.push('myTable' + i.toString());
  }

  tableNames.forEach(function(tableName) {
    store.createTable(tableName);
  });

  tableNames.forEach(function(tableName) {
    assertNotNull(store.getTableInternal(tableName));
  });
}


function testGetTable_NonExisting() {
  assertThrows(
      goog.bind(store.getTableInternal, store, 'nonExistingTableName'));
}
