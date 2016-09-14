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
goog.require('goog.testing.TestCase');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.Capability');
goog.require('lf.schema');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.SmokeTester');
goog.require('order.db');


/** @type {!lf.Capability} */
var capability;


function setUpPage() {
  goog.testing.TestCase.getActiveTestCase().promiseTimeout = 5 * 1000;  // 5s
  capability = lf.Capability.get();
}

function runTestsForDb(database) {
  var options = {
    storeType: !capability.indexedDb ? lf.schema.DataStoreType.MEMORY :
        lf.schema.DataStoreType.INDEXED_DB
  };

  var tester = null;
  return database.connect(options).then(function(db) {
    tester = new lf.testing.SmokeTester(database.getGlobal(), db);
    return tester.clearDb();
  }).then(function() {
    return tester.testCRUD();
  });
}


/** @return {!IThenable} */
function testCRUD() {
  // Running both tests in parallel on purpose, since this simulates closer a
  // real-world scenario.
  return goog.Promise.all([
    runTestsForDb(hr.db), runTestsForDb(order.db)
  ]);
}


/**
 * Tests that connecting to a 2nd database does not cause lf.Row.nextId_ to be
 * overwritten with a smaller value (which guarantees that row IDs will remain
 * unique).
 * @return {!IThenable}
 * @suppress {accessControls}
 */
function testRowIdsUnique() {
  if (!capability.indexedDb)
    return Promise.resolve();

  lf.Row.setNextId(0);

  var schemaBuilder1 = lf.schema.create('db1', 1);
  schemaBuilder1.createTable('TableA').
      addColumn('name', lf.Type.STRING);

  var schemaBuilder2 = lf.schema.create('db2', 1);
  schemaBuilder2.createTable('TableB').
      addColumn('name', lf.Type.STRING);

  /** @return {!Array<!lf.Row>} */
  function createNewTableARows() {
    var rows = [];
    var tableA = schemaBuilder1.getSchema().table('TableA');
    for (var i = 0; i < 3; i++) {
      rows.push(tableA.createRow({'name': 'name_' + i}));
    }
    return rows;
  }

  var options = {storeType: lf.schema.DataStoreType.INDEXED_DB};
  return schemaBuilder1.connect(options).then(function() {
    var rows = createNewTableARows();
    assertArrayEquals(
        [1, 2, 3],
        rows.map(function(r) { return r.id(); }));
  }).then(function() {
    return schemaBuilder2.connect(options);
  }).then(function() {
    var rows = createNewTableARows();
    assertArrayEquals(
        [4, 5, 6],
        rows.map(function(r) { return r.id(); }));
  });
}
