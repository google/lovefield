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
 *
 * @fileoverview Due to restrictions of WebSQL, the states of test cases will
 * interfere each other. As a result, the tests are organized in the following
 * way:
 *
 * test1AddTableColumn will add a new column to table A
 * test2DropTableColumn will remove a column from table A
 * test3RenameTableColumn will rename a column from table A
 * test4Dump will dump data in table A
 * test5DropTable will delete table A
 */
goog.setTestOnly();
goog.require('goog.Promise');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');
goog.require('lf.Capability');
goog.require('lf.Global');
goog.require('lf.Type');
goog.require('lf.backstore.WebSql');
goog.require('lf.cache.DefaultCache');
goog.require('lf.index.MemoryIndexStore');
goog.require('lf.schema');
goog.require('lf.schema.DataStoreType');
goog.require('lf.service');
goog.require('lf.service.ServiceId');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('WebSqlRaw');


/** @type {!lf.Capability} */
var capability;


/** @type {!goog.testing.PropertyReplacer} */
var stub;


/** @type {?Database} */
var upgradeDb;


/** @type {string} */
var upgradeDbName;


/** @type {!lf.Global} */
var upgradeGlobal;


function setUpPage() {
  capability = lf.Capability.get();
  if (!capability.webSql) {
    return;
  }

  stub = new goog.testing.PropertyReplacer();
  upgradeDbName = 'upgrade' + goog.now();
  upgradeDb = window.openDatabase(
      upgradeDbName, '', 'upgrade', 2 * 1024 * 1024);
}


function setUp() {
  if (!capability.webSql) {
    return;
  }

  var global = lf.Global.get();
  global.registerService(
      lf.service.INDEX_STORE, new lf.index.MemoryIndexStore());
  upgradeGlobal = new lf.Global();
  global.registerService(
      new lf.service.ServiceId('ns_' + upgradeDbName), upgradeGlobal);
  upgradeGlobal.registerService(
      lf.service.INDEX_STORE, new lf.index.MemoryIndexStore());
}


function tearDown() {
  if (!capability.webSql) {
    return;
  }

  lf.Global.get().clear();
  stub.reset();
}


/**
 * @param {string=} opt_name
 * @return {!lf.schema.Database}
 */
function getOldSchema(opt_name) {
  var builder = lf.schema.create(opt_name || 'test' + goog.now(), 1);
  builder.createTable('A').
      addColumn('id', lf.Type.STRING).
      addColumn('name', lf.Type.STRING);
  return builder.getSchema();
}


// Tests that onUpgrade function is still called with version 0 for a new DB
// instance.
function testNewDBInstance() {
  if (!capability.webSql) {
    return;
  }

  asyncTestCase.waitForAsync('testNewDBInstance');

  var schema = getOldSchema();
  lf.Global.get().registerService(lf.service.SCHEMA, schema);
  lf.Global.get().registerService(lf.service.CACHE,
      new lf.cache.DefaultCache(schema));

  /**
   * @param {!lf.raw.BackStore} rawDb
   * @return {!IThenable}
   */
  var onUpgrade = goog.testing.recordFunction(function(rawDb) {
    assertEquals(0, rawDb.getVersion());
    return goog.Promise.resolve();
  });

  var db = new lf.backstore.WebSql(lf.Global.get(), getOldSchema());
  db.init(onUpgrade).then(function() {
    onUpgrade.assertCallCount(1);
    asyncTestCase.continueTesting();
  });
}


/** @return {!IThenable} */
function populateOldData() {
  /** @const {!Object} */
  var CONTENTS = {'id': 'hello', 'name': 'world'};
  /** @const {!Object} */
  var CONTENTS2 = {'id': 'hello2', 'name': 'world2'};

  var builder = lf.schema.create(upgradeDbName, 1);
  builder.createTable('A').
      addColumn('id', lf.Type.STRING).
      addColumn('name', lf.Type.STRING);

  var db;
  var tableA;
  return builder.connect({
    storeType: lf.schema.DataStoreType.WEB_SQL
  }).then(function(dbRet) {
    db = dbRet;
    tableA = db.getSchema().tables()[0];
    var rows = [tableA.createRow(CONTENTS), tableA.createRow(CONTENTS2)];
    return db.insert().into(tableA).values(rows).exec();
  }).then(function() {
    return db.select().from(tableA).exec();
  }).then(function(results) {
    assertEquals(2, results.length);
    return goog.Promise.resolve();
  });
}


/**
 * @param {string} name
 * @param {string} version
 * @param {string} desc
 * @param {number} size
 * @param {!function(?Database)=} opt_callback
 * @return {?Database}
 */
function openDatabaseStub(name, version, desc, size, opt_callback) {
  if (goog.isDefAndNotNull(opt_callback)) {
    opt_callback(upgradeDb);
  }
  return upgradeDb;
}


/**
 * @param {!lf.schema.Builder} builder
 * @param {!function(!lf.raw.BackStore):!IThenable} onUpgrade
 * @param {!function(!Array<!Object>)} checker
 * @param {boolean=} opt_populateOldData
 * @return {!IThenable}
 */
function runTest(builder, onUpgrade, checker, opt_populateOldData) {
  stub.replace(window, 'openDatabase', openDatabaseStub);

  var promise = opt_populateOldData ?
      populateOldData() : goog.Promise.resolve();

  return promise.then(function() {
    // Re-register schema
    upgradeGlobal.registerService(lf.service.SCHEMA, builder.getSchema());
    upgradeGlobal.registerService(lf.service.CACHE,
        new lf.cache.DefaultCache(builder.getSchema()));
    return builder.connect({
      onUpgrade: onUpgrade,
      storeType: lf.schema.DataStoreType.WEB_SQL
    });
  }).then(function(db) {
    var tableA = db.getSchema().tables()[0];
    return db.select().from(tableA).exec();
  }).then(function(results) {
    checker(results);
    return goog.Promise.resolve();
  });
}


function test1AddTableColumn() {
  if (!capability.webSql) {
    return;
  }

  asyncTestCase.waitForAsync('test1AddTableColumn');
  var builder = lf.schema.create(upgradeDbName, 2);
  builder.createTable('A').
      addColumn('id', lf.Type.STRING).
      addColumn('name', lf.Type.STRING).
      addColumn('something', lf.Type.STRING);

  /**
   * @param {!lf.raw.BackStore} store
   * @return {!IThenable}
   */
  var onUpgrade = function(store) {
    return store.addTableColumn('A', 'something', 'nothing');
  };

  runTest(builder, onUpgrade, function(results) {
    assertEquals(2, results.length);
    assertEquals('nothing', results[0]['something']);
  }, true).then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


function test2DropTableColumn() {
  if (!capability.webSql) {
    return;
  }

  asyncTestCase.waitForAsync('test1AddTableColumn');
  var builder = lf.schema.create(upgradeDbName, 3);
  builder.createTable('A').
      addColumn('id', lf.Type.STRING).
      addColumn('name', lf.Type.STRING);

  /**
   * @param {!lf.raw.BackStore} store
   * @return {!IThenable}
   */
  var onUpgrade = function(store) {
    return store.dropTableColumn('A', 'something');
  };

  runTest(builder, onUpgrade, function(results) {
    assertEquals(2, results.length);
    var payload = results[0];
    assertTrue(payload.hasOwnProperty('id'));
    assertTrue(payload.hasOwnProperty('name'));
    assertFalse(payload.hasOwnProperty('something'));
  }).then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


function test3RenameTableColumn() {
  if (!capability.webSql) {
    return;
  }

  asyncTestCase.waitForAsync('test3RenameTableColumn');
  var builder = lf.schema.create(upgradeDbName, 4);
  builder.createTable('A').
      addColumn('id', lf.Type.STRING).
      addColumn('lastName', lf.Type.STRING);

  /**
   * @param {!lf.raw.BackStore} store
   * @return {!IThenable}
   */
  var onUpgrade = function(store) {
    return store.renameTableColumn('A', 'name', 'lastName');
  };

  runTest(builder, onUpgrade, function(results) {
    assertEquals(2, results.length);
    assertEquals('world', results[0]['lastName']);
  }).then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


function test4Dump() {
  if (!capability.webSql) {
    return;
  }

  asyncTestCase.waitForAsync('test4Dump');
  var builder = lf.schema.create(upgradeDbName, 5);
  builder.createTable('A').
      addColumn('id', lf.Type.STRING).
      addColumn('lastName', lf.Type.STRING);

  var dumpResult;

  /**
   * @param {!lf.raw.BackStore} store
   * @return {!IThenable}
   */
  var onUpgrade = function(store) {
    return store.dump().then(function(results) {
      dumpResult = results;
    });
  };

  runTest(builder, onUpgrade, function(results) {
    var rowsA = dumpResult['A'];
    assertEquals(2, rowsA.length);
    assertObjectEquals('world', rowsA[0]['value']['lastName']);
  }).then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


function test5DropTable() {
  if (!capability.webSql) {
    return;
  }

  asyncTestCase.waitForAsync('test5DropTable');
  var builder = lf.schema.create(upgradeDbName, 6);
  builder.createTable('B').
      addColumn('id', lf.Type.STRING).
      addColumn('lastName', lf.Type.STRING);

  /**
   * @param {!lf.raw.BackStore} store
   * @return {!IThenable}
   */
  var onUpgrade = function(store) {
    return store.dropTable('A');
  };

  runTest(builder, onUpgrade, function(results) {
    var resolver = goog.Promise.withResolver();
    upgradeDb.readTransaction(function(tx) {
      tx.executeSql(
          'SELECT tbl_name FROM sqlite_master WHERE type="table"',
          [],
          function(tx, rowsSet) {
            var results = [];
            for (var i = 0; i < rowsSet.rows.length; ++i) {
              results.push(rowsSet.rows.item(i)['tbl_name']);
            }
            assertTrue(results.indexOf('B') != -1);
            assertEquals(-1, results.indexOf('A'));
            resolver.resolve();
          },
          resolver.reject.bind(resolver));
    });
    return resolver.promise;
  }).then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}
