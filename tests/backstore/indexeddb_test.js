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
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('goog.userAgent.product');
goog.require('lf.Global');
goog.require('lf.Row');
goog.require('lf.TransactionType');
goog.require('lf.backstore.IndexedDB');
goog.require('lf.cache.DefaultCache');
goog.require('lf.cache.Journal');
goog.require('lf.index.MemoryIndexStore');
goog.require('lf.service');
goog.require('lf.testing.MockSchema');
goog.require('lf.testing.backstore.ScudTester');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('IndexedDB');


/** @type {!goog.testing.PropertyReplacer} */
var propertyReplacer;


/** @type {!lf.cache.Cache} */
var cache;


/** @type {!lf.index.IndexStore} */
var indexStore;


/** @type {!lf.schema.Database} */
var schema;


/** @type {!lf.backstore.IndexedDB} */
var db;


function setUpPage() {
  propertyReplacer = new goog.testing.PropertyReplacer();
}

function setUp() {
  if (goog.userAgent.product.SAFARI) {
    return;
  }

  cache = new lf.cache.DefaultCache();
  schema = new lf.testing.MockSchema();
  indexStore = new lf.index.MemoryIndexStore();
  var global = lf.Global.get();
  global.registerService(lf.service.CACHE, cache);
  global.registerService(lf.service.INDEX_STORE, indexStore);
  global.registerService(lf.service.SCHEMA, schema);
}


function tearDown() {
  if (goog.userAgent.product.SAFARI) {
    return;
  }

  propertyReplacer.reset();
  asyncTestCase.waitForAsync('tearDown');

  // Clearing all tables.
  var promises = schema.getTables().map(
      function(table) {
        var tx = db.createTx(
            lf.TransactionType.READ_WRITE,
            new lf.cache.Journal(lf.Global.get(), [table]));
        var store = /** @type {!lf.backstore.ObjectStore} */ (
            tx.getTable(table.getName(), table.deserializeRow));

        store.remove([]);
        return tx.finished();
      });

  goog.Promise.all(promises).then(
      function() {
        asyncTestCase.continueTesting();
      }, fail);
}


function testSCUD() {
  if (goog.userAgent.product.SAFARI) {
    return;
  }

  db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
  var scudTester = new lf.testing.backstore.ScudTester(db, lf.Global.get());

  scudTester.run().then(function() {
    asyncTestCase.continueTesting();
  });

  asyncTestCase.waitForAsync('testSCUD');
}


function testSCUD_Bundled() {
  if (goog.userAgent.product.SAFARI) {
    return;
  }

  schema.name = schema.name + '_bundled';
  db = new lf.backstore.IndexedDB(lf.Global.get(), schema, true);
  var scudTester = new lf.testing.backstore.ScudTester(db, lf.Global.get());

  scudTester.run().then(function() {
    asyncTestCase.continueTesting();
  });

  asyncTestCase.waitForAsync('testSCUD_Bundled');
}


function testTwoTableInserts_Bundled() {
  if (goog.userAgent.product.SAFARI) {
    return;
  }

  schema.name = schema.name + '_b2';
  db = new lf.backstore.IndexedDB(lf.Global.get(), schema, true);

  /** @const {!Object} */
  var CONTENTS = {'id': 'hello', 'name': 'world'};
  /** @const {!Object} */
  var CONTENTS2 = {'id': 'hello2', 'name': 'world2'};

  var tableA = schema.getTables()[0];
  var tableB = schema.getTables()[1];
  var row = lf.Row.create(CONTENTS);
  var row2 = lf.Row.create(CONTENTS);
  var row3 = lf.Row.create(CONTENTS2);
  var row4 = new lf.Row(row.id(), CONTENTS2);

  asyncTestCase.waitForAsync('testTwoTableInserts_Bundled');
  return db.init().then(function() {
    var tx = db.createTx(
        lf.TransactionType.READ_WRITE,
        new lf.cache.Journal(lf.Global.get(), [tableA]));
    var store = /** @type {!lf.backstore.ObjectStore} */ (
        tx.getTable(tableA.getName(), tableA.deserializeRow));

    // insert row1 into table A
    store.put([row]);
    return tx.finished();
  }).then(function() {
    var tx = db.createTx(
        lf.TransactionType.READ_WRITE,
        new lf.cache.Journal(lf.Global.get(), [tableB]));
    var store = /** @type {!lf.backstore.ObjectStore} */ (
        tx.getTable(tableB.getName(), tableB.deserializeRow));

    // insert row2 into table B
    store.put([row2]);
    return tx.finished();
  }).then(function() {
    var tx = db.createTx(
        lf.TransactionType.READ_ONLY,
        new lf.cache.Journal(lf.Global.get(), [tableB]));
    var store = /** @type {!lf.backstore.ObjectStore} */ (
        tx.getTable(tableB.getName(), tableB.deserializeRow));

    // get row2 from table B
    return store.get([row2.id()]);
  }).then(function(results) {
    assertEquals(1, results.length);
    assertEquals(row2.id(), results[0].id());
    assertObjectEquals(CONTENTS, results[0].payload());

    var tx = db.createTx(
        lf.TransactionType.READ_WRITE,
        new lf.cache.Journal(lf.Global.get(), [tableA]));
    var store = /** @type {!lf.backstore.ObjectStore} */ (
        tx.getTable(tableA.getName(), tableA.deserializeRow));

    // update row1, insert row3 into table A
    store.put([row4, row3]);
    return tx.finished();
  }).then(function() {
    return selectAll();
  }).then(function(results) {
    assertEquals(2, results.length);
    assertEquals(row4.id(), results[0].id());
    assertObjectEquals(CONTENTS2, results[0].payload());
    assertEquals(row3.id(), results[1].id());
    assertObjectEquals(CONTENTS2, results[1].payload());

    // Update cache, otherwise the bundled operation will fail.
    cache.set(tableA.getName(), [row4, row3]);

    var tx = db.createTx(
        lf.TransactionType.READ_WRITE,
        new lf.cache.Journal(lf.Global.get(), [tableA]));
    var store = /** @type {!lf.backstore.ObjectStore} */ (
        tx.getTable(tableA.getName(), tableA.deserializeRow));

    // remove row1
    store.remove([row3.id()]);
    return tx.finished();
  }).then(function() {
    return selectAll();
  }).then(function(results) {
    assertEquals(1, results.length);
    assertEquals(row4.id(), results[0].id());
    assertObjectEquals(CONTENTS2, results[0].payload());
    asyncTestCase.continueTesting();
  });
}


/** @suppress {accessControls} */
function testScanRowId() {
  if (goog.userAgent.product.SAFARI) {
    return;
  }

  /** @return {!IThenable} */
  var insertIntoTable = function() {
    var CONTENTS = {'scan': 'rowid'};
    var rows = [];
    for (var i = 0; i < 10; ++i) {
      rows.push(lf.Row.create(CONTENTS));
    }

    var table = schema.getTables()[0];
    var tx = db.createTx(
        lf.TransactionType.READ_WRITE,
        new lf.cache.Journal(lf.Global.get(), [table]));
    var store = /** @type {!lf.backstore.ObjectStore} */ (
        tx.getTable(table.getName(), table.deserializeRow));

    store.put(rows);
    return tx.finished();
  };

  db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
  db.init().then(function() {
    return insertIntoTable();
  }).then(function() {
    return db.scanRowId_();
  }).then(function(rowId) {
    assertEquals(lf.Row.getNextId() - 1, rowId);
    return insertIntoTable();
  }).then(function() {
    return db.scanRowId_();
  }).then(function(rowId) {
    assertEquals(lf.Row.getNextId() - 1, rowId);
    asyncTestCase.continueTesting();
  });

  asyncTestCase.waitForAsync('testScanRowId');
}


/** @suppress {accessControls} */
function testScanRowId_BundledDB() {
  if (goog.userAgent.product.SAFARI) {
    return;
  }

  /** @return {!IThenable} */
  var insertIntoTable = function() {
    var CONTENTS = {'scan': 'rowid'};
    var rows = [];
    for (var i = 0; i <= 2048; i += 256) {
      rows.push(new lf.Row(i, CONTENTS));
    }

    var table = schema.getTables()[0];
    var tx = db.createTx(
        lf.TransactionType.READ_WRITE,
        new lf.cache.Journal(lf.Global.get(), [table]));
    var store = /** @type {!lf.backstore.ObjectStore} */ (
        tx.getTable(table.getName(), table.deserializeRow));

    store.put(rows);
    return tx.finished();
  };

  db = new lf.backstore.IndexedDB(lf.Global.get(), schema, true);
  db.init().then(function() {
    return insertIntoTable();
  }).then(function() {
    return db.scanRowId_();
  }).then(function(rowId) {
    assertEquals(2048, rowId);
    asyncTestCase.continueTesting();
  });

  asyncTestCase.waitForAsync('testScanRowId_BundledDB');
}


/**
 * Selects all entries from the database (skips the cache).
 * @return {!IThenable}
 */
function selectAll() {
  var tableSchema = schema.getTables()[0];
  var tx = db.createTx(
      lf.TransactionType.READ_ONLY,
      new lf.cache.Journal(lf.Global.get(), [tableSchema]));
  var table = tx.getTable(tableSchema.getName(), tableSchema.deserializeRow);
  return table.get([]);
}


/**
 * @suppress {accessControls}
 * @return {!Array.<string>}
 */
function filterTableA() {
  var list = db.db_.objectStoreNames;
  var results = [];
  for (var i = 0; i < list.length; ++i) {
    var name = list.item(i);
    if (name.indexOf('tableA') != -1) {
      results.push(list.item(i));
    }
  }
  return results;
}

function testUpgrade() {
  if (goog.userAgent.product.SAFARI) {
    return;
  }

  // Randomize schema name to ensure upgrade test works.
  var name = schema.name + goog.now();
  schema.name = name;

  // Modifying tableA to use persisted indices.
  propertyReplacer.replace(
      schema.getTables()[0], 'persistentIndex', goog.functions.TRUE);

  db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
  db.init().then(function() {
    // Verify that index tables are created.
    var tables = filterTableA();
    assertTrue(tables.length > 1);
    db.close();
    propertyReplacer.reset();
    setUp();  // reset the environment
    schema.version = 2;
    schema.name = name;
    db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
    return db.init();
  }).then(function() {
    var tables = filterTableA();
    assertEquals(1, tables.length);
    var table = schema.getTables().slice(-1)[0];
    assertEquals('tablePlusOne', table.getName());
    var tx = db.createTx(
        lf.TransactionType.READ_WRITE,
        new lf.cache.Journal(lf.Global.get(), [table]));
    var store = /** @type {!lf.backstore.ObjectStore} */ (
        tx.getTable(table.getName(), table.deserializeRow));
    assertNotNull(store);
    asyncTestCase.continueTesting();
  });

  asyncTestCase.waitForAsync('testUpgrade');
}
