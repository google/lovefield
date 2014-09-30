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
goog.require('goog.Promise');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('lf.Global');
goog.require('lf.Row');
goog.require('lf.TransactionType');
goog.require('lf.backstore.IndexedDB');
goog.require('lf.cache.DefaultCache');
goog.require('lf.cache.Journal');
goog.require('lf.index.MemoryIndexStore');
goog.require('lf.service');
goog.require('lf.testing.MockSchema');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('IndexedDB');


/** @type {!lf.cache.Cache} */
var cache;


/** @type {!lf.index.IndexStore} */
var indexStore;


/** @type {!lf.schema.Database} */
var schema;


/** @type {!lf.backstore.IndexedDB} */
var db;


function setUp() {
  cache = new lf.cache.DefaultCache();
  schema = new lf.testing.MockSchema();
  indexStore = new lf.index.MemoryIndexStore();
  var global = lf.Global.get();
  global.registerService(lf.service.CACHE, cache);
  global.registerService(lf.service.INDEX_STORE, indexStore);
}


function tearDown() {
  asyncTestCase.waitForAsync('tearDown');

  // Clearing all tables.
  var promises = schema.getTables().map(
      function(table) {
        var tx = db.createTx(
            lf.TransactionType.READ_WRITE,
            new lf.cache.Journal([table]));
        var store = /** @type {!lf.backstore.ObjectStore} */ (
            tx.getTable(table));

        store.remove([]);
        return tx.finished();
      });

  goog.Promise.all(promises).then(
      function() {
        asyncTestCase.continueTesting();
      }, fail);
}


function testSCUD() {
  /** @const {!Object} */
  var CONTENTS = {'id': 'hello', 'name': 'world'};
  /** @const {!Object} */
  var CONTENTS2 = {'id': 'hello2', 'name': 'world2'};

  var table = schema.getTables()[0];
  var row = lf.Row.create(CONTENTS);
  var row2 = lf.Row.create(CONTENTS);
  var row3 = new lf.Row(row.id(), CONTENTS2);

  db = new lf.backstore.IndexedDB(schema);
  db.init().then(function() {
    var tx = db.createTx(
        lf.TransactionType.READ_WRITE,
        new lf.cache.Journal([table]));
    var store = /** @type {!lf.backstore.ObjectStore} */ (
        tx.getTable(table));

    // insert row1
    store.put([row]);
    return tx.finished();
  }).then(function() {
    var tx = db.createTx(
        lf.TransactionType.READ_ONLY,
        new lf.cache.Journal([table]));
    var store = /** @type {!lf.backstore.ObjectStore} */ (
        tx.getTable(table));

    // select row1
    return store.get([row.id()]);
  }).then(function(results) {
    assertEquals(1, results.length);
    assertEquals(row.id(), results[0].id());
    assertObjectEquals(CONTENTS, results[0].payload());

    var tx = db.createTx(
        lf.TransactionType.READ_WRITE,
        new lf.cache.Journal([table]));
    var store = /** @type {!lf.backstore.ObjectStore} */ (
        tx.getTable(table));

    // insert row2, update row1
    store.put([row2, row3]);
    return tx.finished();
  }).then(function() {
    return selectAll();
  }).then(function(results) {
    assertEquals(2, results.length);
    assertEquals(row3.id(), results[0].id());
    assertObjectEquals(CONTENTS2, results[0].payload());
    assertEquals(row2.id(), results[1].id());
    assertObjectEquals(CONTENTS, results[1].payload());

    var tx = db.createTx(
        lf.TransactionType.READ_WRITE,
        new lf.cache.Journal([table]));
    var store = /** @type {!lf.backstore.ObjectStore} */ (
        tx.getTable(table));

    // remove row1
    store.remove([row.id()]);
    return tx.finished();
  }).then(function() {
    return selectAll();
  }).then(function(results) {
    assertEquals(1, results.length);
    assertEquals(row2.id(), results[0].id());
    assertObjectEquals(CONTENTS, results[0].payload());

    var tx = db.createTx(
        lf.TransactionType.READ_WRITE,
        new lf.cache.Journal([table]));
    var store = /** @type {!lf.backstore.ObjectStore} */ (
        tx.getTable(table));

    // remove all
    store.remove([]);
    return tx.finished();
  }).then(function() {
    return selectAll();
  }).then(function(results) {
    assertEquals(0, results.length);
    asyncTestCase.continueTesting();
  });

  asyncTestCase.waitForAsync('testSCUD');
}


/** @suppress {accessControls} */
function testScanRowId() {
  /**
   * @param {number} index
   * @return {!IThenable}
   */
  var insertIntoTable = function(index) {
    var CONTENTS = {'scan': 'rowid'};
    var rows = [];
    for (var i = 0; i < 10; ++i) {
      rows.push(lf.Row.create(CONTENTS));
    }

    var table = schema.getTables()[0];
    var tx = db.createTx(
        lf.TransactionType.READ_WRITE,
        new lf.cache.Journal([table]));
    var store = /** @type {!lf.backstore.ObjectStore} */ (
        tx.getTable(table));

    store.put(rows);
    return tx.finished();
  };

  db = new lf.backstore.IndexedDB(schema);
  db.init().then(function() {
    return insertIntoTable(1);
  }).then(function() {
    return db.scanRowId_();
  }).then(function(rowId) {
    assertEquals(lf.Row.getNextId() - 1, rowId);
    return insertIntoTable(0);
  }).then(function() {
    return db.scanRowId_();
  }).then(function(rowId) {
    assertEquals(lf.Row.getNextId() - 1, rowId);
    asyncTestCase.continueTesting();
  });

  asyncTestCase.waitForAsync('testScanRowId');
}


/**
 * Selects all entries from the database (skips the cache).
 * @return {!IThenable}
 */
function selectAll() {
  var tableSchema = schema.getTables()[0];
  var tx = db.createTx(
      lf.TransactionType.READ_ONLY,
      new lf.cache.Journal([tableSchema]));
  var table = tx.getTable(tableSchema);
  return table.get([]);
}

function testUpgrade() {
  // Randomize schema name to ensure upgrade test works.
  var name = schema.name + goog.now();
  schema.name = name;

  db = new lf.backstore.IndexedDB(schema);
  db.init().then(function() {
    db.close();
    setUp();  // reset the environment
    schema.version = 2;
    schema.name = name;
    db = new lf.backstore.IndexedDB(schema);
    return db.init();
  }).then(function() {
    var table = schema.getTables().slice(-1)[0];
    assertEquals('tablePlusOne', table.getName());
    var tx = db.createTx(
        lf.TransactionType.READ_WRITE,
        new lf.cache.Journal([table]));
    var store = /** @type {!lf.backstore.ObjectStore} */ (
        tx.getTable(table));
    assertNotNull(store);
    asyncTestCase.continueTesting();
  });

  asyncTestCase.waitForAsync('testUpgrade');
}
