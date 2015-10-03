/**
 * @license
 * Copyright 2014 The Lovefield Project Authors. All Rights Reserved.
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
goog.require('goog.functions');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('lf.Capability');
goog.require('lf.Global');
goog.require('lf.Row');
goog.require('lf.TransactionType');
goog.require('lf.backstore.IndexedDB');
goog.require('lf.backstore.TableType');
goog.require('lf.cache.DefaultCache');
goog.require('lf.cache.Journal');
goog.require('lf.index.MemoryIndexStore');
goog.require('lf.service');
goog.require('lf.structs.set');
goog.require('lf.testing.backstore.MockSchema');
goog.require('lf.testing.backstore.ScudTester');
goog.require('lf.testing.util');


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


/** @type {!lf.Capability} */
var capability;


function setUpPage() {
  propertyReplacer = new goog.testing.PropertyReplacer();
  capability = lf.Capability.get();
}


function setUp() {
  if (!capability.indexedDb) {
    return;
  }

  schema = new lf.testing.backstore.MockSchema();
  cache = new lf.cache.DefaultCache(schema);
  indexStore = new lf.index.MemoryIndexStore();
  var global = lf.Global.get();
  global.registerService(lf.service.CACHE, cache);
  global.registerService(lf.service.INDEX_STORE, indexStore);
  global.registerService(lf.service.SCHEMA, schema);
}


function tearDown() {
  if (!capability.indexedDb) {
    return;
  }

  propertyReplacer.reset();
  asyncTestCase.waitForAsync('tearDown');

  // Clearing all tables.
  var promises = schema.tables().map(
      function(table) {
        var tx = db.createTx(
            lf.TransactionType.READ_WRITE, [table], createJournal([table]));
        var store = /** @type {!lf.backstore.ObjectStore} */ (
            tx.getTable(
                table.getName(),
                table.deserializeRow.bind(table),
                lf.backstore.TableType.DATA));

        store.remove([]);
        return tx.commit();
      });

  goog.Promise.all(promises).then(
      function() {
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * @param {!Array<!lf.schema.Table>} tables
 * @return {!lf.cache.Journal}
 */
function createJournal(tables) {
  return new lf.cache.Journal(lf.Global.get(), lf.structs.set.create(tables));
}


function testSCUD() {
  if (!capability.indexedDb) {
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
  if (!capability.indexedDb) {
    return;
  }

  schema.setName(schema.name() + '_bundled');
  schema.setBundledMode(true);
  db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
  var scudTester = new lf.testing.backstore.ScudTester(db, lf.Global.get());

  scudTester.run().then(function() {
    asyncTestCase.continueTesting();
  });

  asyncTestCase.waitForAsync('testSCUD_Bundled');
}


function testTwoTableInserts_Bundled() {
  if (!capability.indexedDb) {
    return;
  }

  var global = lf.Global.get();
  schema.setName(schema.name() + '_b2');
  schema.setBundledMode(true);
  db = new lf.backstore.IndexedDB(global, schema);
  global.registerService(lf.service.BACK_STORE, db);

  /** @const {!Object} */
  var CONTENTS = {'id': 'hello', 'name': 'world'};
  /** @const {!Object} */
  var CONTENTS2 = {'id': 'hello2', 'name': 'world2'};

  var tableA = schema.table('tableA');
  var tableB = schema.table('tableB');
  var row = lf.Row.create(CONTENTS);
  var row2 = lf.Row.create(CONTENTS);
  var row3 = lf.Row.create(CONTENTS2);
  var row4 = new lf.Row(row.id(), CONTENTS2);

  /**
   * @param {!lf.backstore.Tx} tx
   * @return {!lf.backstore.ObjectStore}
   */
  var getTableA = function(tx) {
    return /** @type {!lf.backstore.ObjectStore} */ (tx.getTable(
        tableA.getName(),
        tableA.deserializeRow.bind(tableA),
        lf.backstore.TableType.DATA));
  };

  /**
   * @param {!lf.backstore.Tx} tx
   * @return {!lf.backstore.ObjectStore}
   */
  var getTableB = function(tx) {
    return /** @type {!lf.backstore.ObjectStore} */ (tx.getTable(
        tableB.getName(),
        tableB.deserializeRow.bind(tableB),
        lf.backstore.TableType.DATA));
  };

  asyncTestCase.waitForAsync('testTwoTableInserts_Bundled');
  return db.init().then(function() {
    var tx = db.createTx(
        lf.TransactionType.READ_WRITE, [tableA], createJournal([tableA]));
    var store = getTableA(tx);

    // insert row1 into table A
    store.put([row]);
    return tx.commit();
  }).then(function() {
    var tx = db.createTx(
        lf.TransactionType.READ_WRITE, [tableB], createJournal([tableB]));
    var store = getTableB(tx);

    // insert row2 into table B
    store.put([row2]);
    return tx.commit();
  }).then(function() {
    var tx = db.createTx(lf.TransactionType.READ_ONLY, [tableB]);
    var store = getTableB(tx);

    // get row2 from table B
    return store.get([row2.id()]);
  }).then(function(results) {
    assertEquals(1, results.length);
    assertEquals(row2.id(), results[0].id());
    assertObjectEquals(CONTENTS, results[0].payload());

    var tx = db.createTx(
        lf.TransactionType.READ_WRITE, [tableA], createJournal([tableA]));
    var store = getTableA(tx);

    // update row1, insert row3 into table A
    store.put([row4, row3]);
    return tx.commit();
  }).then(function() {
    return lf.testing.util.selectAll(global, tableA);
  }).then(function(results) {
    assertEquals(2, results.length);
    assertEquals(row4.id(), results[0].id());
    assertObjectEquals(CONTENTS2, results[0].payload());
    assertEquals(row3.id(), results[1].id());
    assertObjectEquals(CONTENTS2, results[1].payload());

    // Update cache, otherwise the bundled operation will fail.
    cache.setMany(tableA.getName(), [row4, row3]);

    var tx = db.createTx(
        lf.TransactionType.READ_WRITE, [tableA], createJournal([tableA]));
    var store = getTableA(tx);

    // remove row1
    store.remove([row3.id()]);
    return tx.commit();
  }).then(function() {
    return lf.testing.util.selectAll(global, tableA);
  }).then(function(results) {
    assertEquals(1, results.length);
    assertEquals(row4.id(), results[0].id());
    assertObjectEquals(CONTENTS2, results[0].payload());
    asyncTestCase.continueTesting();
  });
}


/** @suppress {accessControls} */
function testScanRowId() {
  if (!capability.indexedDb) {
    return;
  }

  /**
   * Generates a set of rows where they are on purpose not sorted with respect
   * to the row ID and with the larger rowID in position 0.
   * @return {!Array<!lf.Row>}
   */
  var generateRows = function() {
    var rowIds = [
      200, 9, 1, 3, 2, 20, 100
    ];
    var CONTENTS = {'scan': 'rowid'};
    return rowIds.map(function(rowId) {
      return new lf.Row(rowId, CONTENTS);
    });
  };

  /**
   * @param {!Array<!lf.Row>} rows
   * @return {!IThenable}
   */
  var insertIntoTable = function(rows) {
    var table = schema.table('tableA');
    var tx = db.createTx(
        lf.TransactionType.READ_WRITE, [table], createJournal([table]));
    var store = /** @type {!lf.backstore.ObjectStore} */ (
        tx.getTable(
            table.getName(),
            table.deserializeRow.bind(table),
            lf.backstore.TableType.DATA));
    store.put(rows);
    return tx.commit();
  };

  db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
  var rows = generateRows();
  db.init().then(function() {
    assertEquals(lf.Row.nextId_, 1);
    return insertIntoTable(rows);
  }).then(function() {
    db.close();
    return db.init();
  }).then(function() {
    assertEquals(lf.Row.nextId_, rows[0].id() + 1);
    asyncTestCase.continueTesting();
  });

  asyncTestCase.waitForAsync('testScanRowId');
}


/**
 * Tests scanRowId() for the case where all tables are empty.
 * @suppress {accessControls}
 */
function testScanRowId_Empty() {
  if (!capability.indexedDb) {
    return;
  }

  db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
  db.init().then(function() {
    assertEquals(1, lf.Row.nextId_);
    asyncTestCase.continueTesting();
  });

  asyncTestCase.waitForAsync('testScanRowId');
}


/** @suppress {accessControls} */
function testScanRowId_BundledDB() {
  if (!capability.indexedDb) {
    return;
  }

  /** @return {!IThenable} */
  var insertIntoTable = function() {
    var CONTENTS = {'scan': 'rowid'};
    var rows = [];
    for (var i = 0; i <= 2048; i += 256) {
      rows.push(new lf.Row(i, CONTENTS));
    }

    var table = schema.table('tableA');
    var tx = db.createTx(
        lf.TransactionType.READ_WRITE, [table], createJournal([table]));
    var store = /** @type {!lf.backstore.ObjectStore} */ (
        tx.getTable(
            table.getName(),
            table.deserializeRow.bind(table),
            lf.backstore.TableType.DATA));

    store.put(rows);
    return tx.commit();
  };

  schema.setBundledMode(true);
  db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
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
 * @suppress {accessControls}
 * @return {!Array<string>}
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
  if (!capability.indexedDb) {
    return;
  }

  // Randomize schema name to ensure upgrade test works.
  var name = schema.name() + goog.now();
  schema.setName(name);

  // Modifying tableA to use persisted indices.
  propertyReplacer.replace(
      schema.table('tableA'), 'persistentIndex', goog.functions.TRUE);

  db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
  db.init().then(function() {
    // Verify that index tables are created.
    var tables = filterTableA();
    assertTrue(tables.length > 1);
    db.close();
    propertyReplacer.reset();
    setUp();  // reset the environment
    schema.setVersion(2);
    schema.setName(name);
    db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
    return db.init();
  }).then(function() {
    var tables = filterTableA();
    assertEquals(1, tables.length);
    var table = schema.tables().slice(-1)[0];
    assertEquals('tablePlusOne', table.getName());
    var tx = db.createTx(
        lf.TransactionType.READ_WRITE, [table], createJournal([table]));
    var store = /** @type {!lf.backstore.ObjectStore} */ (
        tx.getTable(
            table.getName(),
            table.deserializeRow.bind(table),
            lf.backstore.TableType.DATA));
    assertNotNull(store);
    asyncTestCase.continueTesting();
  });

  asyncTestCase.waitForAsync('testUpgrade');
}
