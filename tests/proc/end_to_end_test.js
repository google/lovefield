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
goog.require('goog.array');
goog.require('goog.object');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.Global');
goog.require('lf.TransactionType');
goog.require('lf.cache.Journal');
goog.require('lf.service');
goog.require('lf.testing.hrSchema.JobDataGenerator');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'EndToEndTest');


/** @type {number} */
asyncTestCase.stepTimeout = 5 * 1000;  // 5 seconds


/** @private {!hr.db.Database} */
var db;


/** @type {!hr.db.schema.Employee} */
var e;


/** @type {!hr.db.schema.Job} */
var j;


/** @type {!Array.<!hr.db.row.Job>} */
var sampleJobs;


/** @type {!Array.<!hr.db.row.Employee>} */
var sampleEmployees;


/** @type {!lf.BackStore} */
var backStore;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.getInstance(
      /* opt_onUpgrade */ undefined,
      /* opt_volatile */ true).then(function(database) {
    db = database;
    j = db.getSchema().getJob();
    e = db.getSchema().getEmployee();
    backStore = lf.Global.get().getService(lf.service.BACK_STORE);
    return addSampleData();
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Populates the databse with sample data.
 * @return {!IThenable} A signal firing when the data has been added.
 */
function addSampleData() {
  var schema = /** @type {!hr.db.schema.Database} */ (db.getSchema());
  var jobGenerator =
      new lf.testing.hrSchema.JobDataGenerator(schema);
  sampleJobs = jobGenerator.generate(50);

  return db.insert().into(j).values(sampleJobs).exec();
}


/**
 * Tests that an INSERT query does indeed add a new record in the database.
 */
function testInsert() {
  asyncTestCase.waitForAsync('testInsert');

  var row = j.createRow();
  row.setId('dummyJobId');

  var queryBuilder = /** @type {!lf.query.InsertBuilder} */ (
      db.insert().into(j).values([row]));

  queryBuilder.exec().then(
      function() {
        return selectAll();
      }).then(
      function(results) {
        assertEquals(sampleJobs.length + 1, results.length);
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests that an UPDATE query does indeed update records in the database.
 */
function testUpdate_All() {
  asyncTestCase.waitForAsync('testUpdate_All');

  var minSalary = 0;
  var maxSalary = 1000;
  var queryBuilder = /** @type {!lf.query.UpdateBuilder} */ (
      db.update(j).
          set(j.minSalary, minSalary).
          set(j.maxSalary, maxSalary));

  queryBuilder.exec().then(
      function() {
        return selectAll();
      }).then(
      function(results) {
        results.forEach(function(row) {
          assertEquals(minSalary, row.payload()[j.minSalary.getName()]);
          assertEquals(maxSalary, row.payload()[j.maxSalary.getName()]);
        });

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests that an UPDATE query with a predicate does updates the corresponding
 * records in the database.
 */
function testUpdate_Predicate() {
  asyncTestCase.waitForAsync('testUpdate_Predicate');

  var queryBuilder = /** @type {!lf.query.UpdateBuilder} */ (
      db.update(j).
          where(j.id.eq('jobId10')).
          set(j.minSalary, 10000).
          set(j.maxSalary, 20000));

  queryBuilder.exec().then(
      function() {
        return selectAll();
      }).then(
      function(results) {
        // TODO(dpapad): Update
        /*var updatedRow = goog.array.find(results, function(row) {
          return row.payload()[a.id.getName()] == '1';
        });
        assertTrue(updatedRow.payload()[a.createdByAction.getName()]);
        assertFalse(updatedRow.payload()[a.isLocal.getName()]);*/

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests that a DELETE query with a specified predicate deletes only the records
 * that satisfy the predicate.
 */
function testDelete_Predicate() {
  asyncTestCase.waitForAsync('testDelete_Predicate');

  var jobId = 'jobId' + Math.floor(sampleJobs.length / 2).toString();
  var queryBuilder = /** @type {!lf.query.DeleteBuilder} */ (
      db.delete().from(j).where(j.id.eq(jobId)));

  queryBuilder.exec().then(
      function() {
        return selectAll();
      }).then(
      function(results) {
        assertEquals(sampleJobs.length - 1, results.length);

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests that a DELETE query without a specified predicate deletes the entire
 * table.
 */
function testDelete_All() {
  asyncTestCase.waitForAsync('testDelete_All');

  var queryBuilder = /** @type {!lf.query.DeleteBuilder} */ (
      db.delete().from(j));

  queryBuilder.exec().then(
      function() {
        return selectAll();
      }).then(
      function(results) {
        assertEquals(0, results.length);

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Selects all entries in the Album table directly from the database (skips the
 * cache).
 * @return {!IThenable}
 */
function selectAll() {
  var tx = backStore.createTx(
      lf.TransactionType.READ_ONLY,
      new lf.cache.Journal([j]));
  var table = tx.getTable(j);
  return table.get([]);
}
