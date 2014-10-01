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
goog.require('goog.testing.recordFunction');
goog.require('lf.Row');
goog.require('lf.Type');
goog.require('lf.backstore.IndexedDB');
goog.require('lf.backstore.IndexedDBRawBackStore');
goog.require('lf.schema.BaseColumn');
goog.require('lf.schema.Constraint');
goog.require('lf.schema.Database');
goog.require('lf.schema.Table');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('IndexedDB');


/** @type {!lf.schema.Database} */
var schema;


/** @const {!Object} */
var CONTENTS = {'id': 'hello', 'name': 'world'};


/** @const {!Object} */
var CONTENTS2 = {'id': 'hello2', 'name': 'world2'};


function setUp() {
  schema = new Schema_();
}


function testConvert() {
  var date = new Date();
  var buffer = new ArrayBuffer(8);
  var view = new Uint8Array(buffer);
  for (var i = 0; i < 8; ++i) {
    view[i] = i;
  }

  var convert = lf.backstore.IndexedDBRawBackStore.convert;
  assertEquals(date.getTime(), convert(date));
  assertEquals('0001020304050607', convert(buffer));
  assertEquals(2, convert(2));
  assertEquals(3.3, convert(3.3));
  assertFalse(convert(false));
  assertTrue(convert(true));
  assertEquals('quick fox', convert('quick fox'));
}


// Tests that onUpgrade function is still called with version 0 for a new DB
// instance.
function testNewDBInstance() {
  asyncTestCase.waitForAsync('testNewDBInstance');

  /**
   * @param {!lf.raw.BackStore} rawDb
   * @return {!IThenable}
   */
  var onUpgrade = goog.testing.recordFunction(function(rawDb) {
    assertEquals(0, rawDb.getVersion());
    return goog.Promise.resolve();
  });

  var db = new lf.backstore.IndexedDB(schema);
  db.init(onUpgrade).then(function() {
    onUpgrade.assertCallCount(1);
    asyncTestCase.continueTesting();
  });
}


/**
 * @param {!IDBDatabase} db
 * @param {string} tableName
 * @return {!IThenable.<!Array.<!lf.Row>>}
 */
function dumpTable(db, tableName) {
  return new goog.Promise(function(resolve, reject) {
    var results = [];
    var tx = db.transaction([tableName], 'readonly');
    var req = tx.objectStore(tableName).openCursor();
    req.onsuccess = function(ev) {
      var cursor = req.result;
      if (cursor) {
        results.push(lf.Row.deserialize(cursor.value));
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = reject;
  });
}


/**
 * @param {!Date} date
 * @param {!lf.raw.BackStore} dbInterface
 * @return {!IThenable}
 */
function upgradeAddTableColumn(date, dbInterface) {
  // Cast for test coverage tool.
  var db = /** @type {!lf.backstore.IndexedDBRawBackStore} */ (dbInterface);
  assertEquals(1, db.getVersion());
  return db.addTableColumn('tableA_', 'dob', date);
}


function testAddTableColumn() {
  asyncTestCase.waitForAsync('testAddTableColumn');

  var db = new lf.backstore.IndexedDB(schema);
  var row = lf.Row.create(CONTENTS);
  var row2 = lf.Row.create(CONTENTS);
  var date = new Date();

  db.init().then(function(rawDb) {
    // Use raw database here to bypass transactions and journal setup.
    // Insert two rows into tableA_.
    return new goog.Promise(function(resolve, reject) {
      var tx = rawDb.transaction(['tableA_'], 'readwrite');
      var store = tx.objectStore('tableA_');
      store.put(row.serialize());
      store.put(row2.serialize());
      tx.oncomplete = resolve;
      tx.onabort = reject;
    });
  }).then(function() {
    db.close();
    db = null;
    schema.version = 2;
    db = new lf.backstore.IndexedDB(schema);
    return db.init(goog.partial(upgradeAddTableColumn, date));
  }).then(function(newDb) {
    return dumpTable(newDb, 'tableA_');
  }).then(function(results) {
    assertEquals(2, results.length);
    assertEquals(date.getTime(), results[0].payload()['dob']);
    assertEquals(date.getTime(), results[1].payload()['dob']);
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * @param {!lf.raw.BackStore} dbInterface
 * @return {!IThenable}
 */
function upgradeDropTableColumn(dbInterface) {
  // Cast for test coverage tool.
  var db = /** @type {!lf.backstore.IndexedDBRawBackStore} */ (dbInterface);
  assertEquals(1, db.getVersion());
  return db.dropTableColumn('tableA_', 'name');
}


function testDropTableColumn() {
  asyncTestCase.waitForAsync('testDropTableColumn');

  var db = new lf.backstore.IndexedDB(schema);
  var row = lf.Row.create(CONTENTS);
  var row2 = lf.Row.create(CONTENTS);

  db.init().then(function(rawDb) {
    // Use raw database here to bypass transactions and journal setup.
    // Insert two rows into tableA_.
    return new goog.Promise(function(resolve, reject) {
      var tx = rawDb.transaction(['tableA_'], 'readwrite');
      var store = tx.objectStore('tableA_');
      store.put(row.serialize());
      store.put(row2.serialize());
      tx.oncomplete = resolve;
      tx.onabort = reject;
    });
  }).then(function() {
    db.close();
    db = null;
    schema.version = 2;
    db = new lf.backstore.IndexedDB(schema);
    return db.init(upgradeDropTableColumn);
  }).then(function(newDb) {
    return dumpTable(newDb, 'tableA_');
  }).then(function(results) {
    assertEquals(2, results.length);
    assertFalse(results[0].payload().hasOwnProperty('name'));
    assertFalse(results[1].payload().hasOwnProperty('name'));
    asyncTestCase.continueTesting();
  });
}


/**
 * @param {!lf.raw.BackStore} dbInterface
 * @return {!IThenable}
 */
function upgradeDropTable(dbInterface) {
  // Cast for test coverage tool.
  var db = /** @type {!lf.backstore.IndexedDBRawBackStore} */ (dbInterface);
  assertEquals(1, db.getVersion());
  return db.dropTable('tableB_');
}


function testDropTable() {
  asyncTestCase.waitForAsync('testDropTable');

  var db = new lf.backstore.IndexedDB(schema);
  db.init().then(function(rawDb) {
    assertEquals(2, rawDb.objectStoreNames.length);
    db.close();
    db = null;
    schema.version = 2;
    db = new lf.backstore.IndexedDB(schema);
    return db.init(upgradeDropTable);
  }, fail).then(function(rawDb) {
    assertEquals(1, rawDb.objectStoreNames.length);
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * @param {!lf.raw.BackStore} dbInterface
 * @return {!IThenable}
 */
function upgradeDumping(dbInterface) {
  // Cast for test coverage tool.
  var db = /** @type {!lf.backstore.IndexedDBRawBackStore} */ (dbInterface);
  assertEquals(1, db.getVersion());
  return db.dump().then(function(results) {
    assertArrayEquals([CONTENTS, CONTENTS2], results['tableA_']);
    assertArrayEquals([], results['tableB_']);
  });
}


function testDump() {
  asyncTestCase.waitForAsync('testDump');

  var db = new lf.backstore.IndexedDB(schema);
  var row = lf.Row.create(CONTENTS);
  var row2 = lf.Row.create(CONTENTS2);

  db.init().then(function(rawDb) {
    // Use raw database here to bypass transactions and journal setup.
    // Insert two rows into tableA_.
    return new goog.Promise(function(resolve, reject) {
      var tx = rawDb.transaction(['tableA_'], 'readwrite');
      var store = tx.objectStore('tableA_');
      store.put(row.serialize());
      store.put(row2.serialize());
      tx.oncomplete = resolve;
      tx.onabort = reject;
    });
  }, fail).then(function() {
    db.close();
    db = null;
    schema.version = 2;
    db = new lf.backstore.IndexedDB(schema);
    return db.init(upgradeDumping);
  }, fail).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}



/**
 * Controllable schema used for this test.
 * @implements {lf.schema.Database}
 * @constructor
 * @private
 */
var Schema_ = function() {
  /** @private {string} */
  this.name_ = 'schema' + goog.now();

  /** @type {number} */
  this.version = 1;

  /** @private {!lf.schema.Table} */
  this.tableA_ = new Table_('tableA_');

  /** @private {!lf.schema.Table} */
  this.tableB_ = new Table_('tableB_');
};


/** @override */
Schema_.prototype.getTables = function() {
  return (this.version == 1) ? [this.tableA_, this.tableB_] : [this.tableA_];
};


/** @override */
Schema_.prototype.getName = function() {
  return this.name_;
};


/** @override */
Schema_.prototype.getVersion = function() {
  return this.version;
};



/**
 * Dummy table implementation to be used in tests.
 * @implements {lf.schema.Table}
 * @constructor
 * @private
 *
 * @param {string} tableName The name of this table.
 */
var Table_ = function(tableName) {
  /** @private {string} */
  this.tableName_ = tableName;

  /** @type {!lf.schema.Column.<string>} */
  this.id = new lf.schema.BaseColumn(this, 'id', false, lf.Type.STRING);

  /** @type {!lf.schema.Column.<string>} */
  this.name = new lf.schema.BaseColumn(this, 'name', false, lf.Type.STRING);
};


/** @override */
Table_.prototype.getName = function() {
  return this.tableName_;
};


/** @override */
Table_.prototype.createRow = function(value) {
  return lf.Row.create({
    'id': value['id'],
    'name': value['name']
  });
};


/** @override */
Table_.prototype.deserializeRow = function(dbPayload) {
  return lf.Row.deserialize(dbPayload);
};


/** @override */
Table_.prototype.getIndices = function() {
  return [];
};


/** @override */
Table_.prototype.getConstraint = function() {
  return new lf.schema.Constraint(null, [], [], []);
};
