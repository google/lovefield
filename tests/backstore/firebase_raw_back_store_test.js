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
goog.require('goog.testing.recordFunction');
goog.require('lf.Global');
goog.require('lf.backstore.Firebase');
goog.require('lf.backstore.FirebaseRawBackStore');
goog.require('lf.cache.DefaultCache');
goog.require('lf.index.MemoryIndexStore');
goog.require('lf.service');
goog.require('lf.testing.backstore.MockSchema');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'FirebaseRawBackStore');


// Firebase WebSocket timeout is 30 seconds, so make sure this timeout is
// greater than that value, otherwise it can flake.
/** @type {number} */
asyncTestCase.stepTimeout = 40000;  // Raise the timeout to 40 seconds


/** @type {!Firebase} */
var fb;


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


/** @const {!Object} */
var CONTENTS = {'id': 'hello', 'name': 'world'};


/** @const {!Object} */
var CONTENTS2 = {'id': 'hello2', 'name': 'world2'};


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

  indexStore = new lf.index.MemoryIndexStore();
  schema = new lf.testing.backstore.MockSchema();
  schema.setName('msfr' + Date.now().toString() +
      Math.floor(Math.random() * 1000).toString());
  cache = new lf.cache.DefaultCache(schema);

  global = lf.Global.get();
  global.registerService(lf.service.CACHE, cache);
  global.registerService(lf.service.INDEX_STORE, indexStore);
  global.registerService(lf.service.SCHEMA, schema);
}


function tearDown() {
  if (!manualMode) {
    return;
  }

  fb.child(schema.name()).remove();
}


// Tests that onUpgrade function is still called with version 0 for a new DB
// instance.
function testNewDBInstance() {
  if (!manualMode) {
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

  var db = new lf.backstore.Firebase(schema, fb);
  db.init(onUpgrade).then(function() {
    onUpgrade.assertCallCount(1);
    asyncTestCase.continueTesting();
  });
}


// Tests new tables are created automatically
function testAddTable() {
  if (!manualMode) {
    return;
  }

  asyncTestCase.waitForAsync('testAddTable');

  var db = new lf.backstore.Firebase(schema, fb);
  var validate = function(tables) {
    var tableNames = schema.tables().map(function(table) {
      return table.getName();
    }).sort();
    assertArrayEquals(tableNames, Object.keys(tables).sort());
  };
  var numTables = 0;

  db.init().then(function() {
    return lf.backstore.FirebaseRawBackStore.getValue(db.getRef(), '@table');
  }).then(function(tables) {
    numTables = Object.keys(tables).length;
    assertTrue(numTables != 0);
    validate(tables);
    db.close();
    schema.setVersion(2);
    db = new lf.backstore.Firebase(schema, fb);
    return db.init();
  }).then(function() {
    return lf.backstore.FirebaseRawBackStore.getValue(db.getRef(), '@table');
  }).then(function(tables) {
    assertEquals(numTables + 1, Object.keys(tables).length);
    validate(tables);
    asyncTestCase.continueTesting();
  });
}


function testDump() {
  if (!manualMode) {
    return;
  }

  asyncTestCase.waitForAsync('testDump');
  var dump;
  var onUpgrade = function(rawDb) {
    assertEquals(1, rawDb.getVersion());
    return rawDb.dump().then(function(contents) {
      dump = contents;
    });
  };

  var db = new lf.backstore.Firebase(schema, fb);
  db.init().then(function() {
    var row1 = { 'R': 1, 'T': 0, 'P': CONTENTS };
    var row2 = { 'R': 1, 'T': 1, 'P': CONTENTS2 };
    return goog.Promise.all([
      lf.backstore.FirebaseRawBackStore.setValue(db.getRef().child(1), row1),
      lf.backstore.FirebaseRawBackStore.setValue(db.getRef().child(2), row2)
    ]);
  }).then(function() {
    db.close();
    schema.setVersion(2);
    db = new lf.backstore.Firebase(schema, fb);
    return db.init(onUpgrade);
  }).then(function() {
    assertObjectEquals(dump['tableA'][0], CONTENTS);
    assertObjectEquals(dump['tableB'][0], CONTENTS2);
    asyncTestCase.continueTesting();
  });
}


/** @return {IThenable<!lf.backstore.Firebase>} */
function commonSetUp() {
  var db = new lf.backstore.Firebase(schema, fb);
  return db.init().then(function() {
    var row1 = { 'R': 1, 'T': 0, 'P': CONTENTS };
    var row2 = { 'R': 1, 'T': 0, 'P': CONTENTS2 };
    return goog.Promise.all([
      lf.backstore.FirebaseRawBackStore.setValue(db.getRef().child('1'), row1),
      lf.backstore.FirebaseRawBackStore.setValue(db.getRef().child('2'), row2)
    ]);
  }).then(function() {
    return db;
  });
}


/**
 * @param {!lf.backstore.Firebase} db
 * @param {!function(number, !Object)} verify
 * @return {IThenable}
 */
function commonVerify(db, verify) {
  return goog.Promise.all([
    lf.backstore.FirebaseRawBackStore.getValue(db.getRef(), '1'),
    lf.backstore.FirebaseRawBackStore.getValue(db.getRef(), '2')
  ]).then(function(results) {
    results.forEach(function(result, index) {
      verify(index, result);
    });
  });
}


function testDropTable() {
  if (!manualMode) {
    return;
  }

  asyncTestCase.waitForAsync('testDropTable');
  var onUpgrade = function(rawDb) {
    assertEquals(1, rawDb.getVersion());
    return rawDb.dropTable('tableA');
  };

  var db;
  commonSetUp().then(function(instance) {
    db = instance;
    db.close();
    schema.setVersion(2);
    schema.setDropTableA(true);
    db = new lf.backstore.Firebase(schema, fb);
    return db.init(onUpgrade);
  }).then(function() {
    db.getRef().orderByKey().once('value', function(snapshot) {
      assertFalse(snapshot.hasChild('1'));
      assertFalse(snapshot.hasChild('2'));
      assertTrue(snapshot.hasChild('@table'));
      assertFalse(snapshot.child('@table').hasChild('tableA'));
      asyncTestCase.continueTesting();
    });
  });
}


function testAddTableColumn() {
  if (!manualMode) {
    return;
  }

  asyncTestCase.waitForAsync('testAddTableColumn');
  var onUpgrade = function(rawDb) {
    assertEquals(1, rawDb.getVersion());
    return rawDb.addTableColumn('tableA', 'foo', 23);
  };

  var db;
  /**
   * @param {number} index
   * @param {!Object} row
   */
  var verify = function(index, row) {
    var expected = (index == 0) ? CONTENTS : CONTENTS2;
    assertEquals(2, row['R']);
    assertEquals(0, row['T']);
    assertEquals(23, row['P']['foo']);
    assertEquals(expected['id'], row['P']['id']);
    assertEquals(expected['name'], row['P']['name']);
  };

  commonSetUp().then(function(instance) {
    db = instance;
    db.close();
    schema.setVersion(2);
    db = new lf.backstore.Firebase(schema, fb);
    return db.init(onUpgrade);
  }).then(function() {
    return commonVerify(db, verify);
  }).then(asyncTestCase.continueTesting.bind(asyncTestCase));
}


function testDropTableColumn() {
  if (!manualMode) {
    return;
  }

  asyncTestCase.waitForAsync('testDropTableColumn');
  var onUpgrade = function(rawDb) {
    assertEquals(1, rawDb.getVersion());
    return rawDb.dropTableColumn('tableA', 'name');
  };

  var db;
  /**
   * @param {number} index
   * @param {!Object} row
   */
  var verify = function(index, row) {
    var expected = (index == 0) ? CONTENTS : CONTENTS2;
    assertEquals(2, row['R']);
    assertEquals(0, row['T']);
    assertEquals(expected['id'], row['P']['id']);
    assertEquals(undefined, row['P']['name']);
  };

  commonSetUp().then(function(instance) {
    db = instance;
    db.close();
    schema.setVersion(2);
    db = new lf.backstore.Firebase(schema, fb);
    return db.init(onUpgrade);
  }).then(function() {
    return commonVerify(db, verify);
  }).then(asyncTestCase.continueTesting.bind(asyncTestCase));
}


function testRenameTableColumn() {
  if (!manualMode) {
    return;
  }

  asyncTestCase.waitForAsync('testAddTableColumn');
  var onUpgrade = function(rawDb) {
    assertEquals(1, rawDb.getVersion());
    return rawDb.renameTableColumn('tableA', 'name', 'nick');
  };

  var db;
  /**
   * @param {number} index
   * @param {!Object} row
   */
  var verify = function(index, row) {
    var expected = (index == 0) ? CONTENTS : CONTENTS2;
    assertEquals(2, row['R']);
    assertEquals(0, row['T']);
    assertEquals(expected['id'], row['P']['id']);
    assertEquals(expected['name'], row['P']['nick']);
  };

  commonSetUp().then(function(instance) {
    db = instance;
    db.close();
    schema.setVersion(2);
    db = new lf.backstore.Firebase(schema, fb);
    return db.init(onUpgrade);
  }).then(function() {
    return commonVerify(db, verify);
  }).then(asyncTestCase.continueTesting.bind(asyncTestCase));
}
