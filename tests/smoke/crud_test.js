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
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.Capability');
goog.require('lf.TransactionType');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.SmokeTester');
goog.require('lf.testing.util');


/** @type {!lf.testing.SmokeTester} */
var tester;


/** @type {!lf.Capability} */
var capability;


/** @type {!lf.Database} */
var db;


function setUpPage() {
  // Need longer timeout for Safari on SauceLabs.
  goog.testing.TestCase.getActiveTestCase().promiseTimeout = 40 * 1000;  // 40s
}


function setUp() {
  capability = lf.Capability.get();

  var options = {
    'storeType': !capability.indexedDb ? lf.schema.DataStoreType.MEMORY :
        lf.schema.DataStoreType.INDEXED_DB
  };
  return hr.db.connect(options).then(function(database) {
    db = database;
    tester = new lf.testing.SmokeTester(hr.db.getGlobal(), database);
    // Delete any left-overs from previous tests.
    return tester.clearDb();
  });
}


function tearDown() {
  db.close();
}


function testCRUD() {
  return tester.testCRUD();
}


function testOverlappingScope_MultipleInserts() {
  return tester.testOverlappingScope_MultipleInserts();
}


function testTransaction() {
  return tester.testTransaction();
}


function testSerialization() {
  var dummy = db.getSchema().table('DummyTable');
  var row = dummy.createRow({
    arraybuffer: null,
    boolean: false,
    integer: 1,
    number: 2,
    string: 'A',
    string2: 'B'
  });

  var expected = {
    arraybuffer: null,
    boolean: false,
    datetime: null,
    integer: 1,
    number: 2,
    string: 'A',
    string2: 'B',
    proto: null
  };
  assertObjectEquals(expected, row.toDbPayload());
  assertObjectEquals(expected, dummy.deserializeRow(row.serialize()).payload());
}


function testReplaceRow() {
  // This is a regression test for a bug that lovefield had with IndexedDb
  // backstore. The bug manifested when a single transaction had a delete for
  // an entire table, along with an insert to the same table. The bug was that
  // the insert would not stick, because the remove/put calls were racing and
  // the remove would result in a clear call for the entire object store after
  // the put happened.

  capability = lf.Capability.get();
  // The test is only relevant for indexedDb.
  if (!capability.indexedDb) {
    return;
  }

  var table = db.getSchema().table('Region');
  var originalRow = table.createRow({id: '1', name: 'North America'});
  var replacementRow = table.createRow({id: '2', name: 'Central America'});

  // First insert a single record into a table.
  var tx = db.createTransaction(lf.TransactionType.READ_WRITE);
  var insert = db.insert().into(table).values([originalRow]);
  return tx
      .exec([insert])
      // Read the entire table directly from IndexedDb and verify that the
      // original record is in place.
      .then(() => {
        return lf.testing.util.selectAll(hr.db.getGlobal(), table);
      })
      .then((results) => {
        assertEquals(1, results.length);
        assertObjectEquals(originalRow.payload(), results[0].payload());
      })
      // Now execute a transaction that removes the single row and inserts a
      // replacement.
      .then(() => {
        var tx = db.createTransaction(lf.TransactionType.READ_WRITE);
        return tx.exec([
          db.delete().from(table),
          db.insert().into(table).values([replacementRow])
        ]);
      })
      // Read the entire table, verify that we have a single row present (not
      // zero rows), and that it is the replacement, not the original.
      .then(() => {
        return lf.testing.util.selectAll(hr.db.getGlobal(), table);
      })
      .then((results) => {
        assertEquals(1, results.length);
        assertObjectEquals(replacementRow.payload(), results[0].payload());
      });
}
