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
goog.require('goog.Promise');
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
goog.require('lf.structs.map');
goog.require('lf.structs.set');
goog.require('lf.testing.getSchemaBuilder');
goog.require('lf.testing.util');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('Firebase');


// Firebase WebSocket timeout is 30 seconds, so make sure this timeout is
// greater than that value, otherwise it can flake.
/** @type {number} */
asyncTestCase.stepTimeout = 40000;  // Raise the timeout to 40 seconds


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


/** @type {boolean} */
var manualMode;


/** @return {!IThenable<!Firebase>} */
function getFirebaseRef() {
  var resolver = goog.Promise.withResolver();

  var ref = new Firebase(window['FIREBASE_URL']);
  ref.authWithCustomToken(window['FIREBASE_TOKEN'], function(err, authData) {
    if (err) {
      resolver.reject(err);
    } else {
      resolver.resolve(ref);
    }
  });

  return resolver.promise;
}


/**
 * @param {!Array<!lf.schema.Table>} tables
 * @return {!lf.cache.Journal}
 */
function createJournal(tables) {
  return new lf.cache.Journal(global, lf.structs.set.create(tables));
}


function setUpPage() {
  manualMode = window['MANUAL_MODE'] || false;
  if (!manualMode) {
    return;
  }

  asyncTestCase.waitForAsync('setUpPage');
  getFirebaseRef().then(function(ref) {
    fb = ref;
    asyncTestCase.continueTesting();
  });
}

function tearDown() {
  manualMode = window['MANUAL_MODE'] || false;
  if (!manualMode || !goog.isDefAndNotNull(fb)) {
    return;
  }

  fb.child(schema.name()).remove();
}

function setUp() {
  if (!manualMode) {
    return;
  }

  asyncTestCase.waitForAsync('setUp');

  indexStore = new lf.index.MemoryIndexStore();
  var schemaName = 'msfb' + Date.now().toString() +
      Math.floor(Math.random() * 1000).toString();
  schema = lf.testing.getSchemaBuilder(schemaName).getSchema();
  cache = new lf.cache.DefaultCache(schema);

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
  if (!manualMode) {
    return;
  }

  assertTrue(schema.tables().length > 0);

  schema.tables().forEach(
      function(table) {
        assertNotNull(db.getTableInternal(table.getName()));
      });
}


function testGetTable_NonExisting() {
  if (!manualMode) {
    return;
  }

  assertThrows(
      goog.bind(db.getTableInternal, db, 'nonExistingTableName'));
}


// Can't use lf.testing.backstore.ScudTester since Firebase backstore is a
// wrapper itself, and does not really change backstore until commit() is hit.
function testSCUD() {
  if (!manualMode) {
    return;
  }

  asyncTestCase.waitForAsync('testSCUD');

  // Use tableC, which has no indices.
  var t2 = schema.table('tableC');
  var rowIdIndex = new lf.index.RowId(t2.getRowIdIndexName());
  indexStore.set(t2.getName(), rowIdIndex);

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
      var matched = false;
      expected.forEach(function(fact) {
        if (fact.id() == row.id()) {
          assertObjectEquals(fact.payload(), row.payload());
          matched = true;
        }
      });
      assertTrue(matched);
    });
  };

  var journal = createJournal([t2]);
  journal.insertOrReplace(t2, [row0, row1]);
  var tx = db.createTx(lf.TransactionType.READ_WRITE, [t2.getName()], journal);
  tx.commit().then(function() {
    checkRows([row0, row1]);
    journal = createJournal([t2]);
    journal.update(t2, [new lf.Row(2, CONTENTS2)]);
    tx = db.createTx(lf.TransactionType.READ_WRITE, [t2.getName()], journal);
    return tx.commit();
  }).then(function() {
    checkRows([row0, row2]);
    journal = createJournal([t2]);
    journal.remove(t2, [row0]);
    tx = db.createTx(lf.TransactionType.READ_WRITE, [t2.getName()], journal);
    return tx.commit();
  }).then(function() {
    checkRows([row2]);
    journal = createJournal([t2]);
    journal.insert(t2, [row0]);
    tx = db.createTx(lf.TransactionType.READ_WRITE, [t2.getName()], journal);
    return tx.commit();
  }).then(function() {
    checkRows([row0, row2]);
    journal = createJournal([t2]);
    journal.remove(t2, [row0, row2]);
    tx = db.createTx(lf.TransactionType.READ_WRITE, [t2.getName()], journal);
    return tx.commit();
  }).then(function() {
    tx = db.createTx(lf.TransactionType.READ_ONLY, [t2.getName()]);
    return tx.commit();
  }).then(function() {
    checkRows([]);
    asyncTestCase.continueTesting();
  });
}


/**
 * @param {!function(!Object): !Object} callback
 * @return {!IThenable}
 */
function updateFirebase(callback) {
  var resolver = goog.Promise.withResolver();
  var resolver2 = goog.Promise.withResolver();
  var dbRef;
  getFirebaseRef().then(function(ref) {
    dbRef = ref.child(schema.name());
    dbRef.on('value', function(data) {
      var data2 = callback(/** @type {!Object} */ (data.val()));
      resolver2.resolve(data2);
    });
    resolver2.promise.then(function(data) {
      dbRef.transaction(function() {
        return data;
      }, function(error, committed, snapshot) {
        if (error || !committed) {
          resolver.reject(error);
        }
        resolver.resolve();
      });
    });
  });
  return resolver.promise;
}


function testExternalChange() {
  if (!manualMode) {
    return;
  }

  asyncTestCase.waitForAsync('testExternalChange');

  var CONTENTS0 = {'id': 'hello0', 'name': 'world0'};
  var CONTENTS1 = {'id': 'hello1', 'name': 'world1'};
  var CONTENTS2 = {'id': 'hello1', 'name': 'world2'};

  var testAdd = function() {
    var resolver = goog.Promise.withResolver();
    var handler1 = function(diffs) {
      assertEquals(1, diffs.length);
      assertEquals('tableC', diffs[0].getName());
      assertEquals(2, diffs[0].getAdded().size);
      assertEquals(0, diffs[0].getModified().size);
      assertEquals(0, diffs[0].getDeleted().size);
      assertObjectEquals(CONTENTS0, diffs[0].getAdded().get(1).payload());
      assertObjectEquals(CONTENTS1, diffs[0].getAdded().get(2).payload());
      resolver.resolve();
    };

    db.subscribe(handler1);
    updateFirebase(function(data) {
      var rev = data['@rev']['R'];
      data['@rev']['R'] = rev + 1;
      data['1'] = { 'R': rev + 1, 'T': 2, 'P': CONTENTS0 };
      data['2'] = { 'R': rev + 1, 'T': 2, 'P': CONTENTS1 };
      return data;
    }).thenCatch(resolver.reject.bind(resolver));

    return resolver.promise;
  };

  var testModify = function() {
    var resolver = goog.Promise.withResolver();
    var handler2 = function(diffs) {
      assertEquals(1, diffs.length);
      assertEquals('tableC', diffs[0].getName());
      assertEquals(0, diffs[0].getAdded().size);
      assertEquals(1, diffs[0].getModified().size);
      assertEquals(0, diffs[0].getDeleted().size);
      assertObjectEquals(CONTENTS2, diffs[0].getModified().get(2)[1].payload());
      resolver.resolve();
    };

    db.subscribe(handler2);
    updateFirebase(function(data) {
      var rev = data['@rev']['R'];
      data['@rev']['R'] = rev + 1;
      data['2'] = { 'R': rev + 1, 'T': 2, 'P': CONTENTS2 };
      return data;
    }).thenCatch(resolver.reject.bind(resolver));

    return resolver.promise;
  };

  var testDelete = function() {
    var resolver = goog.Promise.withResolver();
    var handler3 = function(diffs) {
      assertEquals(1, diffs.length);
      assertEquals('tableC', diffs[0].getName());
      assertEquals(0, diffs[0].getAdded().size);
      assertEquals(0, diffs[0].getModified().size);
      assertEquals(2, diffs[0].getDeleted().size);
      assertArrayEquals([1, 2], lf.structs.map.keys(diffs[0].getDeleted()));
      resolver.resolve();
    };

    db.subscribe(handler3);

    updateFirebase(function(data) {
      var rev = data['@rev']['R'];
      data['@rev']['R'] = rev + 1;
      data['1'] = null;
      data['2'] = null;
      return data;
    }).thenCatch(resolver.reject.bind(resolver));

    return resolver.promise;
  };

  testAdd().then(function() {
    db.unsubscribe();
    return testModify();
  }).then(function() {
    db.unsubscribe();
    return testDelete();
  }).then(function() {
    db.unsubscribe();
    asyncTestCase.continueTesting();
  });
}

function testReload() {
  if (!manualMode) {
    return;
  }

  asyncTestCase.waitForAsync('testReload');

  // Remove the DB created by setUp because we don't need it.
  fb.child(schema.name()).remove();

  var mydb;
  var options = {
    storeType: lf.schema.DataStoreType.FIREBASE,
    firebase: fb
  };

  var t;
  var CONTENTS0 = {'id': 'hello0', 'name': 'world0'};
  var CONTENTS1 = {'id': 'hello1', 'name': 'world1'};
  var schemaName = 'msfb' + Date.now().toString() +
      Math.floor(Math.random() * 1000).toString();
  var builder = lf.testing.getSchemaBuilder(schemaName);
  schema = builder.getSchema();  // So that it can be properly cleared.

  builder.connect(options).then(function(database) {
    mydb = database;
    t = mydb.getSchema().table('tableA');
    var row0 = t.createRow(CONTENTS0);
    var row1 = t.createRow(CONTENTS1);
    return mydb.insert().into(t).values([row0, row1]).exec();
  }).then(function() {
    return mydb.select().from(t).orderBy(t['id']).exec();
  }).then(function(results) {
    assertArrayEquals([CONTENTS0, CONTENTS1], results);
    mydb.close();
    t = null;
    return lf.testing.getSchemaBuilder(schemaName).connect(options);
  }).then(function(database2) {
    assertTrue(database2 != mydb);
    mydb = database2;
    t = mydb.getSchema().table('tableA');
    return mydb.select().from(t).exec();
  }).then(function(results) {
    assertEquals(2, results.length);
    var row0 = t.createRow({'id': 'hello0', 'name': 'world0'});
    var q = mydb.insert().into(t).values([row0]);
    return lf.testing.util.assertThrowsErrorAsync(201, q.exec.bind(q));
  }).then(function() {
    asyncTestCase.continueTesting();
  });
}
