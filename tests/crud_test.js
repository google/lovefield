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
goog.require('hr.db');
goog.require('lf.Exception');
goog.require('lf.Global');
goog.require('lf.TransactionType');
goog.require('lf.cache.Journal');
goog.require('lf.service');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('CRUDTest');


/** @type {!hr.db.Database} */
var db;


/** @type {!lf.BackStore} */
var backStore;


/** @type {!lf.schema.Table} */
var r;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.getInstance().then(
      function(database) {
        db = database;
        backStore = lf.Global.get().getService(lf.service.BACK_STORE);
        r = db.getSchema().getRegion();

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
  var tables = db.getSchema().getTables();
  var deletePromises = tables.map(function(table) {
    return db.delete().from(table).exec();
  });

  return goog.Promise.all(deletePromises);
}


/**
 * Smoke test for the most basic DB operations, Create, Read, Update, Delete.
 */
function testCRUD() {
  asyncTestCase.waitForAsync('testCRUD');

  var regionRows = generateSampleRows();

  /**
   * Inserts 5 records to the database.
   * @return {!IThenable}
   */
  var insertFn = function() {
    return db.
        insert().
        into(db.getSchema().getRegion()).
        values(regionRows).
        exec();
  };

  /**
   * Selects all records from the database.
   * @return {!IThenable}
   */
  var selectAllFn = function() {
    return db.
        select().
        from(db.getSchema().getRegion()).
        exec();
  };

  /**
   * Selects some records from the databse.
   * @param {!Array.<string>} ids
   * @return {!IThenable}
   */
  var selectFn = function(ids) {
    return db.
        select().
        from(r).
        where(r.id.in(ids)).
        exec();
  };

  /**
   * Upadates the 'name' field of two specific rows.
   * @return {!IThenable}
   */
  var updateFn = function() {
    return db.
        update(r).
        where(r.id.in(['1', '2'])).
        set(r.name, 'Mars').
        exec();
  };

  /**
   * Updates two specific records by replacing the entire row.
   * @return {!IThenable}
   */
  var replaceFn = function() {
    var regionRow0 = r.createRow({id: '1', name: 'Venus' });
    var regionRow1 = r.createRow({id: '2', name: 'Zeus' });

    return db.
        insertOrReplace().
        into(r).
        values([regionRow0, regionRow1]).
        exec();
  };

  /**
   * Deletes two specific records from the database.
   * @return {!IThenable}
   */
  var deleteFn = function() {
    return db.
        delete().
        from(r).
        where(r.id.in(['4', '5'])).
        exec();
  };


  insertFn().then(
      function() {
        return selectFn(['1', '5']);
      }).then(
      function(results) {
        assertEquals(2, results.length);
        assertObjectEquals({id: '1', name: 'North America'}, results[0]);
        assertObjectEquals({id: '5', name: 'Southern Europe'}, results[1]);

        return selectAllFn();
      }).then(
      function(results) {
        assertEquals(regionRows.length, results.length);

        return updateFn();
      }).then(
      function() {
        return selectFn(['1', '2']);
      }).then(
      function(results) {
        assertObjectEquals({id: '1', name: 'Mars'}, results[0]);
        assertObjectEquals({id: '2', name: 'Mars'}, results[1]);

        return replaceFn();
      }).then(
      function() {
        return selectFn(['1', '2']);
      }).then(
      function(results) {
        assertObjectEquals({id: '1', name: 'Venus'}, results[0]);
        assertObjectEquals({id: '2', name: 'Zeus'}, results[1]);
      }).then(
      function() {
        return deleteFn();
      }).then(
      function() {
        return selectAllFn();
      }).then(
      function(result) {
        assertEquals(regionRows.length - 2, result.length);

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests that queries that have overlapping scope are processed in a serialized
 * manner.
 */
function testOverlappingScope_MultipleInserts() {
  // TODO(user): add a new test case to test failure case.
  asyncTestCase.waitForAsync('testOverlappingScope_MultipleInserts');
  var rowCount = 3;
  var rows = generateSampleRowsWithSamePrimaryKey(3);
  var r = db.getSchema().getRegion();

  // Issuing multiple queries back to back (no waiting on the previous query to
  // finish). All rows to be inserted have the same primary key.
  var promises = rows.map(
      function(row) {
        return db.insertOrReplace().into(r).values([row]).exec();
      });

  goog.Promise.all(promises).then(
      function() {
        // The fact that this success callback executes is already a signal that
        // no exception was thrown during update of primary key index, which
        // proves that all insertOrReplace queries where not executed
        // simultaneously, instead the first query inserted the row, and
        // subsequent queries updated it.
        return selectAll();
      }).then(
      function(results) {
        // Assert that only one record exists in the DB.
        assertEquals(1, results.length);

        var retrievedRow = results[0];
        // Assert that the retrieved row matches the value ordered by the last
        // query.
        assertEquals(
            'Region' + String(rowCount - 1),
            retrievedRow.getName());
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Smoke test for transactions.
 */
function testTransaction() {
  var rows = generateSampleRows();
  var r = db.getSchema().getRegion();
  var tx = db.createTransaction(lf.TransactionType.READ_WRITE);
  var insert1 = db.insert().into(r).values(rows.slice(1));
  var insert2 = db.insert().into(r).values([rows[0]]);
  tx.exec([insert1, insert2]).then(function() {
    return selectAll();
  }).then(function(results) {
    assertEquals(5, results.length);

    // Transaction shall not be able to be executed again after committed.
    var select = db.select().from(r);
    var thrown = false;
    try {
      tx.exec([select]);
    } catch (e) {
      thrown = true;
      assertEquals(e.name, lf.Exception.Type.TRANSACTION);
    }
    assertTrue(thrown);

    // Invalid query shall be caught in transaction, too.
    var select2 = db.select().from(r).from(r);
    var tx2 = db.createTransaction(lf.TransactionType.READ_ONLY);
    return tx2.exec([select2]);
  }).then(fail, function(e) {
    assertEquals(e.name, lf.Exception.Type.SYNTAX);
    asyncTestCase.continueTesting();
  });
}


/**
 * Generates sample records to be used for testing.
 * @return {!Array.<!hr.db.row.Region>}
 */
function generateSampleRows() {
  var r = db.getSchema().getRegion();
  return [
    r.createRow({id: '1', name: 'North America' }),
    r.createRow({id: '2', name: 'Central America' }),
    r.createRow({id: '3', name: 'South America' }),
    r.createRow({id: '4', name: 'Western Europe' }),
    r.createRow({id: '5', name: 'Southern Europe' })
  ];
}


/**
 * Generates sample records such that all generated rows have the same primary
 * key.
 * @param {number} count The number of rows to be generated.
 * @return {!Array.<!hr.db.row.Region>}
 */
function generateSampleRowsWithSamePrimaryKey(count) {
  var sampleRows = new Array(count);

  for (var i = 0; i < count; i++) {
    sampleRows[i] = r.createRow(
        //{id: i.toString(), name: 'Region' + i.toString() });
        {id: 1, name: 'Region' + i.toString() });
  }

  return sampleRows;
}


/**
 * Selects all entries from the database (skips the cache).
 * @return {!IThenable}
 */
function selectAll() {
  var tx = backStore.createTx(
      lf.TransactionType.READ_ONLY,
      new lf.cache.Journal([r]));
  return tx.getTable(r).get([]);
}
