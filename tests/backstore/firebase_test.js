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


/** @const {string} */
var FB_URL = 'https://torrid-inferno-8867.firebaseIO.com/test';


/** @const {string} */
var FB_TOKEN = '';


/** @type {boolean} */
var manualMode;


/** @return {!IThenable<!Firebase>} */
function getFirebaseRef() {
  var resolver = goog.Promise.withResolver();

  var ref = new Firebase(FB_URL);
  ref.authWithCustomToken(FB_TOKEN, function(err, authData) {
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

function setUp() {
  if (!manualMode) {
    return;
  }

  asyncTestCase.waitForAsync('setUp');

  cache = new lf.cache.DefaultCache();
  indexStore = new lf.index.MemoryIndexStore();
  schema = lf.testing.getSchemaBuilder('mock_schema').getSchema();

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
  var tx = db.createTx(lf.TransactionType.READ_WRITE, journal);
  tx.commit().then(function() {
    checkRows([row0, row1]);
    journal = createJournal([t2]);
    journal.update(t2, [new lf.Row(2, CONTENTS2)]);
    tx = db.createTx(lf.TransactionType.READ_WRITE, journal);
    return tx.commit();
  }).then(function() {
    checkRows([row0, row2]);
    journal = createJournal([t2]);
    journal.remove(t2, [row0]);
    tx = db.createTx(lf.TransactionType.READ_WRITE, journal);
    return tx.commit();
  }).then(function() {
    checkRows([row2]);
    journal = createJournal([t2]);
    journal.insert(t2, [row0]);
    tx = db.createTx(lf.TransactionType.READ_WRITE, journal);
    return tx.commit();
  }).then(function() {
    checkRows([row0, row2]);
    journal = createJournal([t2]);
    journal.remove(t2, [row0, row2]);
    tx = db.createTx(lf.TransactionType.READ_WRITE, journal);
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
