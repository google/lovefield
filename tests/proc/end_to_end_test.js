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
goog.require('lf.Exception');
goog.require('lf.bind');
goog.require('lf.testing.hrSchema.JobDataGenerator');
goog.require('lf.testing.util');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'EndToEndTest');


/** @type {number} */
asyncTestCase.stepTimeout = 5 * 1000;  // 5 seconds


/** @private {!lf.Database} */
var db;


/** @type {!hr.db.schema.Employee} */
var e;


/** @type {!hr.db.schema.Job} */
var j;


/** @type {!Array.<!hr.db.row.Job>} */
var sampleJobs;


/** @type {!Array.<!hr.db.row.Employee>} */
var sampleEmployees;


/** @type {!lf.Global} */
var global;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.getInstance(
      /* opt_onUpgrade */ undefined,
      /* opt_volatile */ true).then(function(database) {
    db = database;
    j = db.getSchema().getJob();
    e = db.getSchema().getEmployee();
    global = hr.db.getGlobal();
    return addSampleData(50);
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Populates the databse with sample data.
 * @param {number} rowCount The number of rows to insert.
 * @return {!IThenable} A signal firing when the data has been added.
 */
function addSampleData(rowCount) {
  var schema = /** @type {!hr.db.schema.Database} */ (db.getSchema());
  var jobGenerator =
      new lf.testing.hrSchema.JobDataGenerator(schema);
  sampleJobs = jobGenerator.generate(rowCount);

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
        return lf.testing.util.selectAll(global, j);
      }).then(
      function(results) {
        assertEquals(sampleJobs.length + 1, results.length);
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests that insertion succeeds for tables where no primary key is specified.
 */
function testInsert_NoPrimaryKey() {
  asyncTestCase.waitForAsync('testInsert_NoPrimaryKey');

  var jobHistory = db.getSchema().getJobHistory();
  assertNull(jobHistory.getConstraint().getPrimaryKey());
  var row = jobHistory.createRow();

  var queryBuilder = /** @type {!lf.query.InsertBuilder} */ (
      db.insert().into(jobHistory).values([row]));

  queryBuilder.exec().then(
      function() {
        return lf.testing.util.selectAll(global, jobHistory);
      }).then(
      function(results) {
        assertEquals(1, results.length);
        asyncTestCase.continueTesting();
      }, fail);
}


function testInsert_CrossColumnPrimaryKey() {
  asyncTestCase.waitForAsync('testInsert_CrossColumnPrimaryKey');
  var table = db.getSchema().getDummyTable();

  var q1 = /** @type {!lf.query.InsertBuilder} */ (
      db.insert().into(table).values([table.createRow()]));
  var q2 = /** @type {!lf.query.InsertBuilder} */ (
      db.insert().into(table).values([table.createRow()]));

  q1.exec().then(
      function() {
        return q2.exec();
      }).then(
      fail,
      function(e) {
        assertEquals(lf.Exception.Type.CONSTRAINT, e.name);
        asyncTestCase.continueTesting();
      });
}


function testInsert_CrossColumnUniqueKey() {
  asyncTestCase.waitForAsync('testInsert_CrossColumnUniqueKey');
  var table = db.getSchema().getDummyTable();

  // Creating two rows where 'uq_constraint' is violated.
  var row1 = table.createRow().
      setString('string1').
      setNumber('1').
      setInteger(100).
      setBoolean(false);
  var row2 = table.createRow().
      setString('string2').
      setNumber('2').
      setInteger(100).
      setBoolean(false);

  var q1 = /** @type {!lf.query.InsertBuilder} */ (
      db.insert().into(table).values([row1]));
  var q2 = /** @type {!lf.query.InsertBuilder} */ (
      db.insert().into(table).values([row2]));

  q1.exec().then(
      function() {
        return q2.exec();
      }).then(
      fail,
      function(e) {
        assertEquals(lf.Exception.Type.CONSTRAINT, e.name);
        asyncTestCase.continueTesting();
      });
}


/**
 * Tests that an INSERT query on a tabe that uses 'autoIncrement' primary key
 * does indeed automatically assign incrementing primary keys to rows being
 * inserted.
 */
function testInsert_AutoIncrement() {
  checkAutoIncrement(
      function() {
        return db.insert();
      },
      'testInsert_AutoIncrement');
}


/**
 * Tests that an INSERT OR REPLACE query on a tabe that uses 'autoIncrement'
 * primary key does indeed automatically assign incrementing primary keys to
 * rows being inserted.
 */
function testInsertOrReplace_AutoIncrement() {
  checkAutoIncrement(
      function() {
        return db.insertOrReplace();
      }, 'testInsertOrReplace_AutoIncrement');
}


/**
 * @param {!function():!lf.query.Insert} builderFn The function to call for
 *     getting a new query builder (insert() or insertOrReplace()).
 * @param {string} description The description of this test case.
 */
function checkAutoIncrement(builderFn, description) {
  asyncTestCase.waitForAsync(description);

  var c = db.getSchema().getCountry();

  var rows = new Array(11);
  for (var i = 0; i < rows.length - 1; i++) {
    rows[i] = c.createRow();
    // Default value of the primary key column is set to 0 within createRow
    // (since only integer keys are allowed to be marked as auto-incrementing),
    // which will trigger an automatically assigned primary key.
  }

  // Adding a row with a manually assigned primary key. This ID should not be
  // replaced by an automatically assigned ID.
  var manuallyAssignedId = 1000;
  rows[rows.length - 1] = c.createRow();
  rows[rows.length - 1].setId(manuallyAssignedId);

  builderFn().into(c).values(rows.slice(0, 5)).exec().then(
      function() {
        return builderFn().into(c).values(rows.slice(5)).exec();
      }).then(
      function() {
        return lf.testing.util.selectAll(global, c);
      }).then(
      function(results) {
        // Sorting by primary key.
        results.sort(function(leftRow, rightRow) {
          return leftRow.getId() - rightRow.getId();
        });

        // Checking that all primary keys starting from 1 were automatically
        // assigned.
        results.forEach(function(row, index) {
          if (index < results.length - 1) {
            assertEquals(index + 1, row.getId());
          } else {
            assertEquals(manuallyAssignedId, row.getId());
          }
        });

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
        return lf.testing.util.selectAll(global, j);
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

  var jobId = sampleJobs[0].getId();

  var queryBuilder = /** @type {!lf.query.UpdateBuilder} */ (
      db.update(j).
          where(j.id.eq(jobId)).
          set(j.minSalary, 10000).
          set(j.maxSalary, 20000));

  queryBuilder.exec().then(function() {
    return lf.testing.util.selectAll(global, j);
  }).then(function(results) {
    var verified = false;
    for (var i = 0; i < results.length; ++i) {
      var row = results[i];
      if (row.getId() == jobId) {
        assertEquals(10000, row.getMinSalary());
        assertEquals(20000, row.getMaxSalary());
        verified = true;
        break;
      }
    }
    assertTrue(verified);
    asyncTestCase.continueTesting();
  }, fail);
}


function testUpdate_UnboundPredicate() {
  asyncTestCase.waitForAsync('testUpdate_Predicate');

  var queryBuilder = /** @type {!lf.query.UpdateBuilder} */ (
      db.update(j).
          set(j.minSalary, lf.bind(1)).
          set(j.maxSalary, 20000).
          where(j.id.eq(lf.bind(0))));

  var jobId = sampleJobs[0].getId();
  queryBuilder.bind([jobId, 10000]).exec().then(function() {
    return lf.testing.util.selectAll(global, j);
  }).then(function() {
    return db.select().from(j).where(j.id.eq(jobId)).exec();
  }).then(function(results) {
    assertEquals(10000, results[0][j.minSalary.getName()]);
    assertEquals(20000, results[0][j.maxSalary.getName()]);
    return queryBuilder.bind([jobId, 15000]).exec();
  }).then(function() {
    return db.select().from(j).where(j.id.eq(jobId)).exec();
  }).then(function(results) {
    assertEquals(15000, results[0][j.minSalary.getName()]);
    assertEquals(20000, results[0][j.maxSalary.getName()]);
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
        return lf.testing.util.selectAll(global, j);
      }).then(
      function(results) {
        assertEquals(sampleJobs.length - 1, results.length);

        asyncTestCase.continueTesting();
      }, fail);
}


function testDelete_UnboundPredicate() {
  asyncTestCase.waitForAsync('testDelete_UnboundPredicate');

  var jobId = 'jobId' + Math.floor(sampleJobs.length / 2).toString();
  var queryBuilder = /** @type {!lf.query.DeleteBuilder} */ (
      db.delete().from(j).where(j.id.eq(lf.bind(1))));

  queryBuilder.bind(['', jobId]).exec().then(
      function() {
        return lf.testing.util.selectAll(global, j);
      }).then(
      function(results) {
        assertEquals(sampleJobs.length - 1, results.length);

        asyncTestCase.continueTesting();
      }, fail);
}


function testDelete_UnboundPredicateReject() {
  asyncTestCase.waitForAsync('testDelete_UnboundPredicate');

  var queryBuilder = /** @type {!lf.query.DeleteBuilder} */ (
      db.delete().from(j).where(j.id.eq(lf.bind(1))));

  queryBuilder.exec().then(fail, function(e) {
    assertEquals(lf.Exception.Type.SYNTAX, e.name);
    asyncTestCase.continueTesting();
  });
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
        return lf.testing.util.selectAll(global, j);
      }).then(
      function(results) {
        assertEquals(0, results.length);

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case where multiple observers are registered for the same query
 * semantically (but not the same query object instance). Each observer should
 * receive different "change" records, depending on the time it was registered.
 */
function testObserve_MultipleObservers() {
  asyncTestCase.waitForAsync('testObserve_MultipleObservers');

  var schema = /** @type {!hr.db.schema.Database} */ (db.getSchema());
  var jobGenerator =
      new lf.testing.hrSchema.JobDataGenerator(schema);

  /**
   * @param {number} id A suffix to apply to the ID (to avoid triggering
   * constraint violations).
   * @return {!lf.Row}
   */
  var createNewRow = function(id) {
    var sampleJob = jobGenerator.generate(1)[0];
    sampleJob.setId('someJobId' + id);
    return sampleJob;
  };

  /** @return {!lf.query.Select} */
  var getQuery = function() { return db.select().from(j); };

  var callback1Params = [];
  var callback2Params = [];
  var callback3Params = [];

  var doAssertions = function() {
    // Expecting callback1 to have been called 3 times.
    assertArrayEquals([sampleJobs.length + 1, 1, 1], callback1Params);
    // Expecting callback2 to have been called 2 times.
    assertArrayEquals([sampleJobs.length + 2, 1], callback2Params);
    // Expecting callback3 to have been called 1 time.
    assertArrayEquals([sampleJobs.length + 3], callback3Params);
    asyncTestCase.continueTesting();
  };

  var callback1 = function(changes) { callback1Params.push(changes.length); };
  var callback2 = function(changes) { callback2Params.push(changes.length); };
  var callback3 = function(changes) {
    callback3Params.push(changes.length);
    doAssertions();
  };

  db.observe(getQuery(), callback1);
  db.insert().into(j).values([createNewRow(1)]).exec().then(
      function() {
        db.observe(getQuery(), callback2);
        return db.insert().into(j).values([createNewRow(2)]).exec();
      }).then(
      function() {
        db.observe(getQuery(), callback3);
        return db.insert().into(j).values([createNewRow(3)]).exec();
      }, fail);
}
