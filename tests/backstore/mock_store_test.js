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
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('lf.Global');
goog.require('lf.TransactionType');
goog.require('lf.backstore.ObservableStore');
goog.require('lf.backstore.TableType');
goog.require('lf.cache.DefaultCache');
goog.require('lf.cache.Journal');
goog.require('lf.index.MemoryIndexStore');
goog.require('lf.service');
goog.require('lf.structs.set');
goog.require('lf.testing.backstore.MockStore');
goog.require('lf.testing.backstore.ScudTester');
goog.require('lf.testing.getSchemaBuilder');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'MockStoreTest');


/** @type {!lf.backstore.ObservableStore} */
var actualStore;


/** @type {!lf.testing.backstore.MockStore} */
var mockStore;


/** @type {!lf.cache.Cache} */
var cache;


/** @type {!lf.schema.Database} */
var schema;


function setUp() {
  asyncTestCase.waitForAsync('setUp');

  var indexStore = new lf.index.MemoryIndexStore();
  schema = lf.testing.getSchemaBuilder().getSchema();
  cache = new lf.cache.DefaultCache(schema);

  var global = lf.Global.get();
  global.registerService(lf.service.CACHE, cache);
  global.registerService(lf.service.INDEX_STORE, indexStore);
  global.registerService(lf.service.SCHEMA, schema);

  actualStore = new lf.backstore.ObservableStore(schema);
  mockStore = new lf.testing.backstore.MockStore(actualStore);

  mockStore.init().then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that the testing.backstore.MockStore is instantiated according to the
 * schema instance that is passed into its constructor.
 */
function testConstruction() {
  assertTrue(schema.tables().length > 0);

  schema.tables().forEach(
      function(table) {
        assertNotNull(mockStore.getTableInternal(table.getName()));
      });
}


function testGetTable_NonExisting() {
  assertThrows(function() {
    mockStore.getTableInternal('nonExistingTableName');
  });
}


function testSCUD() {
  var scudTester = new lf.testing.backstore.ScudTester(
      mockStore, lf.Global.get());

  scudTester.run().then(function() {
    asyncTestCase.continueTesting();
  });

  asyncTestCase.waitForAsync('testSCUD');
}


/**
 * Tests that when a backstore change is submitted via the MockStore interface,
 * observers of the actual backstore (the one registered in lf.Global) are
 * notified.
 */
function testSimulateExternalChange() {
  asyncTestCase.waitForAsync('testSimulateExternalChange');

  var tableSchema = schema.table('tableA');
  var rows = new Array(10);
  for (var i = 0; i < rows.length; i++) {
    rows[i] = tableSchema.createRow({
      'id': 'id' + i.toString(),
      'name': 'name' + i.toString()
    });
  }

  // Adding an observer in the actual backstore (the one that is registered in
  // lf.Global).
  actualStore.subscribe(function(tableDiffs) {
    assertEquals(1, tableDiffs.length);
    assertEquals(tableSchema.getName(), tableDiffs[0].getName());
    assertEquals(5, tableDiffs[0].getAdded().size);
    assertEquals(0, tableDiffs[0].getModified().size);
    assertEquals(0, tableDiffs[0].getDeleted().size);

    asyncTestCase.continueTesting();
  });

  // Using the MockStore to simulate an external backstore change. Changes that
  // are triggered via the MockStore should result in events firing on the
  // actual backing store observers.
  var tx = mockStore.createTx(
      lf.TransactionType.READ_WRITE, [tableSchema],
      new lf.cache.Journal(
          lf.Global.get(), lf.structs.set.create([tableSchema])));
  var table = tx.getTable(
      tableSchema.getName(),
      tableSchema.deserializeRow.bind(tableSchema),
      lf.backstore.TableType.DATA);

  // Insert 10 rows.
  table.put(rows).then(function() {
    // Delete the last 5 rows.
    var rowIds = rows.slice(rows.length / 2).map(function(row) {
      return row.id();
    });
    return table.remove(rowIds);
  }).then(function() {
    tx.commit();
  });
}
