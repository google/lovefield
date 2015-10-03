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
goog.require('hr.db');
goog.require('lf.Capability');
goog.require('lf.Row');
goog.require('lf.TransactionType');
goog.require('lf.backstore.TableType');
goog.require('lf.schema.DataStoreType');
goog.require('lf.service');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase =
    goog.testing.AsyncTestCase.createAndInstall('ConversionTest');


/** @type {!lf.Database} */
var db;


/** @type {!lf.Capability} */
var capability;


function setUp() {
  capability = lf.Capability.get();
  asyncTestCase.waitForAsync('setUp');
  var options = {
    storeType: !capability.indexedDb ? lf.schema.DataStoreType.MEMORY :
        lf.schema.DataStoreType.INDEXED_DB
  };
  hr.db.connect(options).then(
      function(database) {
        db = database;

        // Delete any left-overs from previous tests.
        return clearDb();
      }).then(
      function() {
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Deletes the contents of all tables.
 * @return {!IThenable}
 */
function clearDb() {
  var tables = db.getSchema().tables();
  var deletePromises = tables.map(function(table) {
    return db.delete().from(table).exec();
  });

  return goog.Promise.all(deletePromises);
}


function testConversions() {
  asyncTestCase.waitForAsync('testConversions');

  var tableSchema = db.getSchema().getDummyTable();
  var row = tableSchema.createRow({
    arrayBuffer: new ArrayBuffer(0),
    boolean: false,
    datetime: new Date(),
    integer: 3,
    number: Math.PI,
    string: 'dummystring',
    string2: 'dummystring2'
  });


  /**
   * Inserts a record to the database.
   * @return {!IThenable}
   */
  var insertFn = function() {
    return db.
        insert().
        into(tableSchema).
        values([row]).
        exec();
  };

  /**
   * Selects the sample record from the database, skipping the cache, to ensure
   * that deserialization is working when reading a record from the backstore.
   * @return {!IThenable}
   */
  var selectWithoutCacheFn = function() {
    var backStore = /** @type {!lf.BackStore} */ (
        hr.db.getGlobal().getService(lf.service.BACK_STORE));
    var tx = backStore.createTx(lf.TransactionType.READ_ONLY, [tableSchema]);
    var store = /** @type {!lf.backstore.ObjectStore} */ (
        tx.getTable(
            tableSchema.getName(),
            tableSchema.deserializeRow,
            lf.backstore.TableType.DATA));
    return store.get([]);
  };

  insertFn().then(
      function() {
        return selectWithoutCacheFn();
      }).then(
      function(result) {
        assertEquals(1, result.length);
        assertTrue(result[0] instanceof hr.db.row.DummyTable);

        var insertedRow = row.payload();
        var retrievedRow = result[0].payload();
        assertEquals(insertedRow.boolean, retrievedRow.boolean);
        assertEquals(insertedRow.string, retrievedRow.string);
        assertEquals(insertedRow.number, retrievedRow.number);
        assertEquals(insertedRow.integer, retrievedRow.integer);
        assertEquals(
            insertedRow.datetime.getTime(), retrievedRow.datetime.getTime());
        assertEquals(
            lf.Row.binToHex(insertedRow.arraybuffer),
            lf.Row.binToHex(retrievedRow.arraybuffer));

        asyncTestCase.continueTesting();
      }, fail);
}
