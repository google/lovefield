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
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');
goog.require('lf.Capability');
goog.require('lf.Global');
goog.require('lf.Row');
goog.require('lf.Type');
goog.require('lf.backstore.IndexedDB');
goog.require('lf.backstore.IndexedDBRawBackStore');
goog.require('lf.backstore.Page');
goog.require('lf.cache.DefaultCache');
goog.require('lf.schema.BaseColumn');
goog.require('lf.schema.Constraint');
goog.require('lf.schema.Database');
goog.require('lf.schema.Info');
goog.require('lf.schema.Table');
goog.require('lf.service');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('IndexedDBRaw');


/** @type {!lf.schema.Database} */
var schema;


/** @const {!Object} */
var CONTENTS = {'id': 'hello', 'name': 'world'};


/** @const {!Object} */
var CONTENTS2 = {'id': 'hello2', 'name': 'world2'};


/** @const {number} */
var MAGIC = Math.pow(2, lf.backstore.Page.BUNDLE_EXPONENT);


/** @type {!lf.Capability} */
var capability;


function setUpPage() {
  capability = lf.Capability.get();
}


function setUp() {
  if (!capability.indexedDb) {
    return;
  }

  schema = new Schema_();

  var global = lf.Global.get();
  var cache = new lf.cache.DefaultCache(schema);
  global.registerService(lf.service.CACHE, cache);
  capability = lf.Capability.get();
}

function testConvert() {
  if (!capability.indexedDb) {
    return;
  }

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
  if (!capability.indexedDb) {
    return;
  }

  asyncTestCase.waitForAsync('testNewDBInstance');

  /**
   * @param {!lf.raw.BackStore} rawDb
   * @return {!IThenable}
   */
  var onUpgrade = goog.testing.recordFunction(function(rawDb) {
    assertEquals(0, rawDb.getVersion());
    return goog.Promise.resolve();
  });

  var db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
  db.init(onUpgrade).then(function() {
    onUpgrade.assertCallCount(1);
    asyncTestCase.continueTesting();
  });
}


/**
 * @param {!IDBDatabase} db
 * @param {string} tableName
 * @param {function(!lf.Row.Raw): !T} fn
 * @template T
 * @return {!IThenable<!Array<!T>>}
 */
function dumpDB(db, tableName, fn) {
  return new goog.Promise(function(resolve, reject) {
    var results = [];
    var tx = db.transaction([tableName], 'readonly');
    var req = tx.objectStore(tableName).openCursor();
    req.onsuccess = function(ev) {
      var cursor = req.result;
      if (cursor) {
        results.push(fn(cursor.value));
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = reject;
  });
}


/**
 * @param {!IDBDatabase} db
 * @param {string} tableName
 * @return {!IThenable<!Array<!lf.Row>>}
 */
function dumpTable(db, tableName) {
  return dumpDB(db, tableName, lf.Row.deserialize);
}


/**
 * @param {!IDBDatabase} db
 * @param {string} tableName
 * @return {!IThenable<!Array<!lf.backstore.Page>>}
 */
function dumpTableBundled(db, tableName) {
  return dumpDB(db, tableName, lf.backstore.Page.deserialize);
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


/**
 * @param {!IDBDatabase} db
 * @return {!IThenable}
 */
function prepareTxForTableA(db) {
  var row = lf.Row.create(CONTENTS);
  var row2 = lf.Row.create(CONTENTS2);
  return new goog.Promise(function(resolve, reject) {
    var tx = db.transaction(['tableA_'], 'readwrite');
    var store = tx.objectStore('tableA_');
    store.put(row.serialize());
    store.put(row2.serialize());
    tx.oncomplete = resolve;
    tx.onabort = reject;
  });
}


/**
 * @param {!IDBDatabase} db
 * @return {!IThenable}
 */
function prepareBundledTxForTableA(db) {
  var row = new lf.Row(0, CONTENTS);
  var row2 = new lf.Row(MAGIC, CONTENTS2);
  var page = new lf.backstore.Page(0);
  var page2 = new lf.backstore.Page(1);
  page.setRows([row]);
  page2.setRows([row2]);

  return new goog.Promise(function(resolve, reject) {
    var tx = db.transaction(['tableA_'], 'readwrite');
    var store = tx.objectStore('tableA_');
    store.put(page.serialize());
    store.put(page2.serialize());
    tx.oncomplete = resolve;
    tx.onabort = reject;
  });
}


function testAddTableColumn() {
  if (!capability.indexedDb) {
    return;
  }

  asyncTestCase.waitForAsync('testAddTableColumn');

  var db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
  var date = new Date();

  db.init().then(function(rawDb) {
    return prepareTxForTableA(rawDb);
  }).then(function() {
    db.close();
    db = null;
    schema.setVersion(2);
    db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
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


function testAddTableColumn_Bundled() {
  if (!capability.indexedDb) {
    return;
  }

  asyncTestCase.waitForAsync('testAddTableColumn_Bundled');

  schema.setBundledMode(true);
  var db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
  var date = new Date();

  db.init().then(function(rawDb) {
    return prepareBundledTxForTableA(rawDb);
  }).then(function() {
    db.close();
    db = null;
    schema.setVersion(2);
    db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
    return db.init(goog.partial(upgradeAddTableColumn, date));
  }).then(function(newDb) {
    return dumpTableBundled(newDb, 'tableA_');
  }).then(function(results) {
    assertEquals(2, results.length);
    var newRow = lf.Row.deserialize(results[0].getPayload()[0]);
    var newRow2 = lf.Row.deserialize(results[1].getPayload()[MAGIC]);
    assertEquals(date.getTime(), newRow.payload()['dob']);
    assertEquals(date.getTime(), newRow2.payload()['dob']);
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
  if (!capability.indexedDb) {
    return;
  }

  asyncTestCase.waitForAsync('testDropTableColumn');

  var db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
  db.init().then(function(rawDb) {
    return prepareTxForTableA(rawDb);
  }).then(function() {
    db.close();
    db = null;
    schema.setVersion(2);
    db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
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


function testDropTableColumn_Bundled() {
  if (!capability.indexedDb) {
    return;
  }

  asyncTestCase.waitForAsync('testDropTableColumn_Bundled');

  schema.setBundledMode(true);
  var db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
  db.init().then(function(rawDb) {
    return prepareBundledTxForTableA(rawDb);
  }).then(function() {
    db.close();
    db = null;
    schema.setVersion(2);
    db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
    return db.init(upgradeDropTableColumn);
  }).then(function(newDb) {
    return dumpTableBundled(newDb, 'tableA_');
  }).then(function(results) {
    assertEquals(2, results.length);
    var newRow = lf.Row.deserialize(results[0].getPayload()[0]);
    var newRow2 = lf.Row.deserialize(results[1].getPayload()[MAGIC]);
    assertFalse(newRow.hasOwnProperty('name'));
    assertFalse(newRow2.hasOwnProperty('name'));
    asyncTestCase.continueTesting();
  });
}


/**
 * @param {!lf.raw.BackStore} dbInterface
 * @return {!IThenable}
 */
function upgradeRenameTableColumn(dbInterface) {
  // Cast for test coverage tool.
  var db = /** @type {!lf.backstore.IndexedDBRawBackStore} */ (dbInterface);
  assertEquals(1, db.getVersion());
  return db.renameTableColumn('tableA_', 'name', 'username');
}


function testRenameTableColumn() {
  if (!capability.indexedDb) {
    return;
  }

  asyncTestCase.waitForAsync('testRenameTableColumn');

  var db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
  db.init().then(function(rawDb) {
    return prepareTxForTableA(rawDb);
  }).then(function() {
    db.close();
    db = null;
    schema.setVersion(2);
    db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
    return db.init(upgradeRenameTableColumn);
  }).then(function(newDb) {
    return dumpTable(newDb, 'tableA_');
  }).then(function(results) {
    assertEquals(2, results.length);
    assertFalse(results[0].payload().hasOwnProperty('name'));
    assertFalse(results[1].payload().hasOwnProperty('name'));
    assertEquals('world', results[0].payload()['username']);
    assertEquals('world2', results[1].payload()['username']);
    asyncTestCase.continueTesting();
  });
}


function testRenameTableColumn_Bundled() {
  if (!capability.indexedDb) {
    return;
  }

  asyncTestCase.waitForAsync('testRenameTableColumn_Bundled');

  schema.setBundledMode(true);
  var db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
  db.init().then(function(rawDb) {
    return prepareBundledTxForTableA(rawDb);
  }).then(function() {
    db.close();
    db = null;
    schema.setVersion(2);
    db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
    return db.init(upgradeRenameTableColumn);
  }).then(function(newDb) {
    return dumpTableBundled(newDb, 'tableA_');
  }).then(function(results) {
    assertEquals(2, results.length);
    var newRow = lf.Row.deserialize(results[0].getPayload()[0]);
    var newRow2 = lf.Row.deserialize(results[1].getPayload()[MAGIC]);
    assertFalse(newRow.hasOwnProperty('name'));
    assertFalse(newRow2.hasOwnProperty('name'));
    assertEquals('world', newRow.payload()['username']);
    assertEquals('world2', newRow2.payload()['username']);
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
  if (!capability.indexedDb) {
    return;
  }

  asyncTestCase.waitForAsync('testDropTable');

  var db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
  db.init().then(function(rawDb) {
    assertEquals(2, rawDb.objectStoreNames.length);
    db.close();
    db = null;
    schema.setVersion(2);
    db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
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
  if (!capability.indexedDb) {
    return;
  }

  asyncTestCase.waitForAsync('testDump');

  var db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
  db.init().then(function(rawDb) {
    return prepareTxForTableA(rawDb);
  }, fail).then(function() {
    db.close();
    db = null;
    schema.setVersion(2);
    db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
    return db.init(upgradeDumping);
  }, fail).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


function testDump_Bundled() {
  if (!capability.indexedDb) {
    return;
  }

  asyncTestCase.waitForAsync('testDump_Bundled');

  schema.setBundledMode(true);
  var db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
  db.init().then(function(rawDb) {
    return prepareBundledTxForTableA(rawDb);
  }, fail).then(function() {
    db.close();
    db = null;
    schema.setVersion(2);
    db = new lf.backstore.IndexedDB(lf.Global.get(), schema);
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

  /** @private {number} */
  this.version_ = 1;

  /** @private {!lf.schema.Table} */
  this.tableA_ = new Table_('tableA_');

  /** @private {!lf.schema.Table} */
  this.tableB_ = new Table_('tableB_');

  /** @private {!lf.schema.Database.Pragma} */
  this.pragma_ = {
    enableBundledMode: false
  };

  /** @private {!lf.schema.Info} */
  this.info_;
};


/** @override */
Schema_.prototype.tables = function() {
  return (this.version_ == 1) ? [this.tableA_, this.tableB_] : [this.tableA_];
};


/** @override */
Schema_.prototype.name = function() {
  return this.name_;
};


/** @override */
Schema_.prototype.version = function() {
  return this.version_;
};


/** @override */
Schema_.prototype.table = function(tableName) {
  var map = {
    'tableA': this.tableA_,
    'tableB': this.tableB_
  };
  return map[tableName] || null;
};


/** @override */
Schema_.prototype.pragma = function() {
  return this.pragma_;
};


/** @param {number} version */
Schema_.prototype.setVersion = function(version) {
  this.version_ = version;
};


/** @param {boolean} mode */
Schema_.prototype.setBundledMode = function(mode) {
  this.pragma_.enableBundledMode = mode;
};


/** @override */
Schema_.prototype.info = function() {
  if (!this.info_) {
    this.info_ = new lf.schema.Info(this);
  }
  return this.info_;
};



/**
 * Dummy table implementation to be used in tests.
 * @extends {lf.schema.Table}
 * @constructor
 * @private
 *
 * @param {string} tableName The name of this table.
 */
var Table_ = function(tableName) {
  /** @type {!lf.schema.Column.<string>} */
  this.id = new lf.schema.BaseColumn(this, 'id', false, false, lf.Type.STRING);

  /** @type {!lf.schema.Column.<string>} */
  this.name = new lf.schema.BaseColumn(
      this, 'name', false, false, lf.Type.STRING);

  Table_.base(this, 'constructor',
      tableName, [this.id, this.name], [], false);
};
goog.inherits(Table_, lf.schema.Table);


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
Table_.prototype.getConstraint = function() {
  return new lf.schema.Constraint(null, [], []);
};
