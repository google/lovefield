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
goog.require('goog.userAgent.product');
goog.require('hr.db');
goog.require('lf.Row');
goog.require('lf.TransactionType');
goog.require('lf.cache.Journal');
goog.require('lf.schema.DataStoreType');
goog.require('lf.service');
goog.require('lf.testing.hrSchemaSampleData');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase =
    goog.testing.AsyncTestCase.createAndInstall('ConversionTest');


/** @type {!lf.Database} */
var db;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  var options = {
    storeType: goog.userAgent.product.SAFARI ? lf.schema.DataStoreType.MEMORY :
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

  var employeeRow =
      lf.testing.hrSchemaSampleData.generateSampleEmployeeData(db);
  var employee = db.getSchema().getEmployee();

  /**
   * Inserts a records to the database.
   * @return {!IThenable}
   */
  var insertFn = function() {
    return db.
        insert().
        into(employee).
        values([employeeRow]).
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
    var tableSchema = db.getSchema().getEmployee();
    var tx = backStore.createTx(
        lf.TransactionType.READ_ONLY,
        new lf.cache.Journal(hr.db.getGlobal(), [tableSchema]));
    var store = /** @type {!lf.backstore.ObjectStore} */ (
        tx.getTable(tableSchema.getName(), tableSchema.deserializeRow));
    return store.get([]);
  };

  insertFn().then(
      function() {
        return selectWithoutCacheFn();
      }).then(
      function(result) {
        assertEquals(1, result.length);
        assertTrue(result[0] instanceof hr.db.row.Employee);

        var insertedRow = employeeRow.payload();
        var retrievedRow = result[0].payload();
        // Checking string conversion.
        assertEquals(insertedRow.id, retrievedRow.id);
        // Checking number conversion.
        assertEquals(
            insertedRow.commissionPercent,
            retrievedRow.commissionPercent);
        // Checking Date conversion.
        assertEquals(
            insertedRow.hireDate.getTime(),
            retrievedRow.hireDate.getTime());

        // Checking ArrayBuffer conversion.
        assertEquals(
            lf.Row.binToHex(insertedRow.photo),
            lf.Row.binToHex(retrievedRow.photo));

        asyncTestCase.continueTesting();
      }, fail);
}
