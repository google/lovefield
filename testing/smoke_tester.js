/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
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
goog.provide('lf.testing.SmokeTester');

goog.require('goog.Promise');
goog.require('goog.testing.jsunit');
goog.require('lf.Exception');
goog.require('lf.TransactionType');
goog.require('lf.cache.Journal');
goog.require('lf.service');



/**
 * Smoke test for the most basic DB operations, Create, Read, Update, Delete.
 * @constructor
 *
 * @param {!lf.Global} global
 * @param {!lf.Database} db Must compatible with HR schema's Region table.
 */
lf.testing.SmokeTester = function(global, db) {
  /** @private {!lf.Global} */
  this.global_ = global;

  /** @private {!lf.Database} */
  this.db_ = db;

  /** @private {!lf.BackStore} */
  this.backStore_ = global.getService(lf.service.BACK_STORE);

  /** @private {!lf.schema.Table} */
  this.r_ = /** @type {!lf.schema.Table} */ (db.getSchema().table('Region'));
};


/**
 * Clears all tables in given DB.
 * @return {!IThenable}
 */
lf.testing.SmokeTester.prototype.clearDb = function() {
  var tables = this.db_.getSchema().tables();
  var deletePromises = tables.map(function(table) {
    return this.db_.delete().from(table).exec();
  }, this);

  return goog.Promise.all(deletePromises);
};


/**
 * @typedef {{
 *   id: !lf.schema.BaseColumn.<string>,
 *   name: !lf.schema.BaseColumn.<string>
 * }}
 * @private
 */
var RegionTableType_;


/**
 * Smoke test for the most basic DB operations, Create, Read, Update, Delete.
 * @return {!IThenable}
 */
lf.testing.SmokeTester.prototype.testCRUD = function() {
  var regionRows = this.generateSampleRows_();
  var db = this.db_;

  // Workaround Closure compiler type checking for dynamic schema creation.
  // Closure compiler does not know that "id" and "name" were added at runtime,
  // therefore use a typedef to make it think so.
  var r = /** @type {!RegionTableType_} */ (this.r_);

  /**
   * Inserts 5 records to the database.
   * @return {!IThenable}
   */
  var insertFn = goog.bind(function() {
    return db.insert().into(this.r_).values(regionRows).exec();
  }, this);

  /**
   * Selects all records from the database.
   * @return {!IThenable}
   */
  var selectAllFn = goog.bind(function() {
    return db.select().from(this.r_).exec();
  }, this);

  /**
   * Selects some records from the databse.
   * @param {!Array<string>} ids
   * @return {!IThenable}
   */
  var selectFn = goog.bind(function(ids) {
    return db.select().from(this.r_).where(r.id.in(ids)).exec();
  }, this);

  /**
   * Upadates the 'name' field of two specific rows.
   * @return {!IThenable}
   */
  var updateFn = goog.bind(function() {
    return db.update(this.r_).
        where(r.id.in(['1', '2'])).
        set(r.name, 'Mars').exec();
  }, this);

  /**
   * Updates two specific records by replacing the entire row.
   * @return {!IThenable}
   */
  var replaceFn = goog.bind(function() {
    var regionRow0 = this.r_.createRow({id: '1', name: 'Venus' });
    var regionRow1 = this.r_.createRow({id: '2', name: 'Zeus' });

    return db.insertOrReplace().
        into(this.r_).
        values([regionRow0, regionRow1]).exec();
  }, this);

  /**
   * Deletes two specific records from the database.
   * @return {!IThenable}
   */
  var deleteFn = goog.bind(function() {
    return db.delete().from(this.r_).where(r.id.in(['4', '5'])).exec();
  }, this);


  return insertFn().then(function() {
    return selectFn(['1', '5']);
  }).then(function(results) {
    assertEquals(2, results.length);
    assertObjectEquals({id: '1', name: 'North America'}, results[0]);
    assertObjectEquals({id: '5', name: 'Southern Europe'}, results[1]);

    return selectAllFn();
  }).then(function(results) {
    assertEquals(regionRows.length, results.length);

    return updateFn();
  }).then(function() {
    return selectFn(['1', '2']);
  }).then(function(results) {
    assertObjectEquals({id: '1', name: 'Mars'}, results[0]);
    assertObjectEquals({id: '2', name: 'Mars'}, results[1]);

    return replaceFn();
  }).then(function() {
    return selectFn(['1', '2']);
  }).then(function(results) {
    assertObjectEquals({id: '1', name: 'Venus'}, results[0]);
    assertObjectEquals({id: '2', name: 'Zeus'}, results[1]);
  }).then(function() {
    return deleteFn();
  }).then(function() {
    return selectAllFn();
  }).then(function(result) {
    assertEquals(regionRows.length - 2, result.length);
  });
};


/**
 * Tests that queries that have overlapping scope are processed in a serialized
 * manner.
 * @return {!IThenable}
 */
lf.testing.SmokeTester.prototype.testOverlappingScope_MultipleInserts =
    function() {
  // TODO(arthurhsu): add a new test case to test failure case.
  var rowCount = 3;
  var rows = this.generateSampleRowsWithSamePrimaryKey_(3);
  var db = this.db_;
  var r = this.r_;

  // Issuing multiple queries back to back (no waiting on the previous query to
  // finish). All rows to be inserted have the same primary key.
  var promises = rows.map(
      function(row) {
        return db.insertOrReplace().into(r).values([row]).exec();
      });

  return goog.Promise.all(promises).then(goog.bind(function() {
    // The fact that this success callback executes is already a signal that
    // no exception was thrown during update of primary key index, which
    // proves that all insertOrReplace queries where not executed
    // simultaneously, instead the first query inserted the row, and
    // subsequent queries updated it.
    return this.selectAll_();
  }, this)).then(function(results) {
    // Assert that only one record exists in the DB.
    assertEquals(1, results.length);

    var retrievedRow = results[0];
    // Assert the retrieved row matches the value ordered by the last query.
    assertEquals(
        'Region' + String(rowCount - 1),
        retrievedRow.payload()['name']);
  });
};


/**
 * Smoke test for transactions.
 * @return {!IThenable}
 */
lf.testing.SmokeTester.prototype.testTransaction = function() {
  var rows = this.generateSampleRows_();
  var r = this.r_;
  var db = this.db_;
  var tx = db.createTransaction(lf.TransactionType.READ_WRITE);
  var insert1 = db.insert().into(r).values(rows.slice(1));
  var insert2 = db.insert().into(r).values([rows[0]]);

  var resolver = goog.Promise.withResolver();
  tx.exec([insert1, insert2]).then(goog.bind(function() {
    return this.selectAll_();
  }, this)).then(function(results) {
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
  }).then(function() {
    resolver.reject('transaction shall fail');
  }, function(e) {
    assertEquals(e.name, lf.Exception.Type.SYNTAX);
    resolver.resolve();
  });

  return resolver.promise;
};


/**
 * Generates sample records to be used for testing.
 * @return {!Array<!lf.Row>}
 * @private
 */
lf.testing.SmokeTester.prototype.generateSampleRows_ = function() {
  var r = this.r_;
  return [
    r.createRow({id: '1', name: 'North America' }),
    r.createRow({id: '2', name: 'Central America' }),
    r.createRow({id: '3', name: 'South America' }),
    r.createRow({id: '4', name: 'Western Europe' }),
    r.createRow({id: '5', name: 'Southern Europe' })
  ];
};


/**
 * Generates sample records such that all generated rows have the same primary
 * key.
 * @param {number} count The number of rows to be generated.
 * @return {!Array<!lf.Row>}
 * @private
 */
lf.testing.SmokeTester.prototype.generateSampleRowsWithSamePrimaryKey_ =
    function(count) {
  var r = this.r_;
  var sampleRows = new Array(count);

  for (var i = 0; i < count; i++) {
    sampleRows[i] = r.createRow(
        //{id: i.toString(), name: 'Region' + i.toString() });
        {id: 1, name: 'Region' + i.toString() });
  }

  return sampleRows;
};


/**
 * Selects all entries from the database (skips the cache).
 * @return {!IThenable}
 * @private
 */
lf.testing.SmokeTester.prototype.selectAll_ = function() {
  var r = this.r_;
  var tx = this.backStore_.createTx(
      lf.TransactionType.READ_ONLY,
      new lf.cache.Journal(this.global_, [r]));
  return tx.getTable(r.getName(), goog.bind(r.deserializeRow, r)).get([]);
}
