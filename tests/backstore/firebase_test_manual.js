/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
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
goog.require('lf.Row');
goog.require('lf.TransactionType');
goog.require('lf.backstore.Firebase');
goog.require('lf.cache.DefaultCache');
goog.require('lf.cache.Journal');
goog.require('lf.index.MemoryIndexStore');
goog.require('lf.index.RowId');
goog.require('lf.service');
goog.require('lf.testing.MockSchema');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('Firebase');


/** @type {!Firebase} */
var fb;


/** @type {!lf.backstore.Firebase} */
var db;


/** @type {!lf.Global} */
var global;


/** @type {!lf.index.MemoryIndexStore} */
var indexStore;


/** @type {!lf.cache.Cache} */
var cache;


/** @type {!lf.schema.Database} */
var schema;


function setUpPage() {
  // Assumes only one writer in all following tests.
  // To add more writers, one must create different Firebase mocks.
  fb = new Firebase('https://torrid-inferno-8867.firebaseIO.com/test');
}

function setUp() {
  asyncTestCase.waitForAsync('setUp');

  cache = new lf.cache.DefaultCache();
  indexStore = new lf.index.MemoryIndexStore();
  schema = new lf.testing.MockSchema();

  global = lf.Global.get();
  global.registerService(lf.service.CACHE, cache);
  global.registerService(lf.service.INDEX_STORE, indexStore);
  global.registerService(lf.service.SCHEMA, schema);

  db = new lf.backstore.Firebase(schema, fb);
  db.init().then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that the backstore.Memory is instantiated according to the schema
 * instance that is passed into its constructor.
 */
function testConstruction() {
  assertTrue(schema.tables().length > 0);

  schema.tables().forEach(
      function(table) {
        assertNotNull(db.getTableInternal(table.getName()));
      });
}


function testGetTable_NonExisting() {
  assertThrows(
      goog.bind(db.getTableInternal, db, 'nonExistingTableName'));
}


// Can't use lf.testing.backstore.ScudTester since Firebase backstore is a
// wrapper itself, and does not really change backstore until commit() is hit.
function testSCUD() {
  asyncTestCase.waitForAsync('testSCUD');

  // Use tableC, which has no indices.
  var t2 = schema.tables()[2];
  var rowIdIndex = new lf.index.RowId(t2.getRowIdIndexName());
  indexStore.set(rowIdIndex);

  var CONTENTS0 = {'id': 'hello0', 'name': 'world0'};
  var CONTENTS1 = {'id': 'hello1', 'name': 'world1'};
  var CONTENTS2 = {'id': 'hello1', 'name': 'world2'};
  var row0 = new lf.Row(1, CONTENTS0);
  var row1 = new lf.Row(2, CONTENTS1);
  var row2 = new lf.Row(2, CONTENTS2);

  var checkRows = function(expected) {
    var actual = db.getTableInternal(t2.getName()).getSync([]);
    assertEquals(expected.length, actual.length);
    actual.forEach(function(row, index) {
      var expectedRow = expected[index];
      assertEquals(expectedRow.id(), row.id());
      assertObjectEquals(expectedRow.payload(), row.payload());
    });
  };

  var journal = new lf.cache.Journal(global, [t2]);
  journal.insertOrReplace(t2, [row0, row1]);
  var tx = db.createTx(lf.TransactionType.READ_WRITE, journal);
  tx.commit().then(function() {
    return db.reloadTable(t2.getName());
  }).then(function() {
    checkRows([row0, row1]);
    journal = new lf.cache.Journal(global, [t2]);
    journal.update(t2, [new lf.Row(2, CONTENTS2)]);
    tx = db.createTx(lf.TransactionType.READ_WRITE, journal);
    return tx.commit();
  }).then(function() {
    return db.reloadTable(t2.getName());
  }).then(function() {
    checkRows([row0, row2]);
    journal = new lf.cache.Journal(global, [t2]);
    journal.remove(t2, [row0, row2]);
    tx = db.createTx(lf.TransactionType.READ_WRITE, journal);
    return tx.commit();
  }).then(function() {
    return db.reloadTable(t2.getName());
  }).then(function() {
    checkRows([]);
    asyncTestCase.continueTesting();
  });
}
