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
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.fn');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.hrSchema.JobDataGenerator');
goog.require('lf.testing.hrSchema.MockDataGenerator');
goog.require('lf.testing.util');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'EndToEndTransactionTest');


/** @type {number} */
asyncTestCase.stepTimeout = 5 * 1000;  // 5 seconds


/** @private {!lf.Database} */
var db;


/** @type {!hr.db.schema.Employee} */
var e;


/** @type {!hr.db.schema.Job} */
var j;


/** @type {!hr.db.schema.Department} */
var d;


/** @type {!Array<!hr.db.row.Job>} */
var sampleJobs;


/** @type {!Array<!hr.db.row.Employee>} */
var sampleEmployees;


/** @type {!Array<!hr.db.row.Department>} */
var sampleDepartments;


/** @type {!lf.testing.hrSchema.MockDataGenerator} */
var dataGenerator;


/** @type {!lf.Global} */
var global;


/** @type {!lf.Transaction} */
var tx;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(function(
      database) {
        db = database;
        j = db.getSchema().getJob();
        e = db.getSchema().getEmployee();
        d = db.getSchema().getDepartment();
        global = hr.db.getGlobal();
        dataGenerator = new lf.testing.hrSchema.MockDataGenerator(
            /** @type {!hr.db.schema.Database} */ (db.getSchema()));

        tx = db.createTransaction();
        return addSampleData();
      }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


function tearDown() {
  db.close();
}


/**
 * Populates the database with sample data.
 * @return {!IThenable} A signal firing when the data has been added.
 */
function addSampleData() {
  dataGenerator.generate(
      /* jobCount */ 50,
      /* employeeCount */ 300,
      /* departmentCount */ 10);
  sampleJobs = dataGenerator.sampleJobs;
  sampleEmployees = dataGenerator.sampleEmployees;
  sampleDepartments = dataGenerator.sampleDepartments;

  var c = db.getSchema().getCountry();
  var l = db.getSchema().getLocation();
  var r = db.getSchema().getRegion();

  return db.createTransaction().exec([
    db.insert().into(r).values(dataGenerator.sampleRegions),
    db.insert().into(c).values(dataGenerator.sampleCountries),
    db.insert().into(l).values(dataGenerator.sampleLocations),
    db.insert().into(d).values(sampleDepartments),
    db.insert().into(j).values(sampleJobs),
    db.insert().into(e).values(sampleEmployees)
  ]);
}


function commitFn() { tx.commit(); }
function rollbackFn() { tx.rollback(); }
function attachFn() { tx.attach(db.select().from(j)); }
function beginFn() { tx.begin([j, e]); }
function execFn() { tx.exec([db.select().from(e)]); }
function statsFn() { return tx.stats(); }


/**
 * Tests that an lf.Exception.TRANSACTION is thrown when the following
 * operations are requested before the transaction has started initializing.
 *  - Attaching a query.
 *  - Attempting to commit the transaction.
 *  - Attempting to rollback the transaction.
 */
function testThrows_StateCreated() {
  // 107: Invalid transaction state transition: {0} -> {1}.
  lf.testing.util.assertThrowsError(107, attachFn);
  lf.testing.util.assertThrowsError(107, commitFn);
  lf.testing.util.assertThrowsError(107, rollbackFn);
}


/**
 * Tests that an lf.Exception.TRANSACTION is thrown when any operation is
 * attempted while a query is executing.
 */
function testThrows_StateExecutingQuery() {
  asyncTestCase.waitForAsync('testThrows_StateExecutingQuery');

  // 107: Invalid transaction state transition: {0} -> {1}.
  tx.begin([j, e]).then(function() {
    tx.attach(db.select().from(e));

    lf.testing.util.assertThrowsError(107, attachFn);
    lf.testing.util.assertThrowsError(107, beginFn);
    lf.testing.util.assertThrowsError(107, commitFn);
    lf.testing.util.assertThrowsError(107, rollbackFn);
    lf.testing.util.assertThrowsError(107, execFn);
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that an lf.Exception.TRANSACTION is thrown when any operation is
 * attempted after transaction has been finalized.
 */
function testThrows_StateFinalized() {
  asyncTestCase.waitForAsync('testThrows_StateFinalized');

  // 107: Invalid transaction state transition: {0} -> {1}.
  tx.begin([e]).then(function() {
    var whenDone = tx.commit();
    lf.testing.util.assertThrowsError(107, beginFn);
    lf.testing.util.assertThrowsError(107, attachFn);
    lf.testing.util.assertThrowsError(107, commitFn);
    lf.testing.util.assertThrowsError(107, rollbackFn);
    lf.testing.util.assertThrowsError(107, execFn);

    return whenDone;
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that an lf.Exception.TRANSACTION is thrown when any operation is
 * attempted while a transaction is still initializing.
 */
function testThrows_StateAcquiringScope() {
  asyncTestCase.waitForAsync('testThrows_StateAcquiringScope');
  var whenDone = tx.begin([e]);
  // 107: Invalid transaction state transition: {0} -> {1}.
  lf.testing.util.assertThrowsError(107, beginFn);
  lf.testing.util.assertThrowsError(107, attachFn);
  lf.testing.util.assertThrowsError(107, commitFn);
  lf.testing.util.assertThrowsError(107, rollbackFn);
  lf.testing.util.assertThrowsError(107, execFn);
  // 105: Attempt to access in-flight transaction states.
  lf.testing.util.assertThrowsError(105, statsFn);

  whenDone.then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that an lf.Exception.TRANSACTION is thrown when a set of queries that
 * will be automatically committed (no need to call commit), is in progress.
 */
function testThrows_StateExecutingAndCommitting() {
  asyncTestCase.waitForAsync('testThrows_StateExecutingAndCommitting');
  var whenDone = tx.exec([db.select().from(e)]);
  // 107: Invalid transaction state transition: {0} -> {1}.
  lf.testing.util.assertThrowsError(107, beginFn);
  lf.testing.util.assertThrowsError(107, attachFn);
  lf.testing.util.assertThrowsError(107, commitFn);
  lf.testing.util.assertThrowsError(107, rollbackFn);
  lf.testing.util.assertThrowsError(107, execFn);

  whenDone.then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


function testExec() {
  asyncTestCase.waitForAsync('testExec');
  var tx = db.createTransaction();
  var q1 = db.select(lf.fn.count(j.id).as('jid')).from(j);
  var q2 = db.select(lf.fn.count(d.id).as('did')).from(d);
  var q3 = db.delete().from(e);
  var q4 = db.delete().from(j);
  tx.exec([q1, q2, q3, q4, q1]).then(function(results) {
    assertEquals(5, results.length);
    assertEquals(sampleJobs.length, results[0][0]['jid']);
    assertEquals(sampleDepartments.length, results[1][0]['did']);
    assertEquals(0, results[4][0]['jid']);

    var stats = tx.stats();
    assertTrue(stats.success());
    assertEquals(350, stats.deletedRowCount());
    assertEquals(0, stats.updatedRowCount());
    assertEquals(0, stats.insertedRowCount());
    assertEquals(2, stats.changedTableCount());

    asyncTestCase.continueTesting();
  }, fail);
}


function testAttach_Success() {
  asyncTestCase.waitForAsync('testAttach_Success');

  var scope = [j, e];
  tx.begin(scope).then(function() {
    var q1 = db.select().from(j);
    return tx.attach(q1);
  }).then(function(results) {
    assertEquals(sampleJobs.length, results.length);

    var q2 = db.select().from(e);
    return tx.attach(q2);
  }).then(function(results) {
    assertEquals(sampleEmployees.length, results.length);

    var hireDate = dataGenerator.employeeGroundTruth.maxHireDate;
    var q3 = db.
        delete().
        from(e).
        where(e.hireDate.eq(hireDate));
    return tx.attach(q3);
  }).then(function() {
    var q4 = db.select().from(e);
    return tx.attach(q4);
  }).then(function(results) {
    assertTrue(results.length < sampleEmployees.length);
    var q5 = db.delete().from(e);
    return tx.attach(q5);
  }).then(function() {
    // Deleting all rows in the Job table.
    var q6 = db.delete().from(j);
    return tx.attach(q6);
  }).then(function() {
    var q7 = db.select().from(j);
    return tx.attach(q7);
  }).then(function(results) {
    // Expecting all rows to have been deleted within tx's context.
    assertEquals(0, results.length);

    // Expecting all job rows to *not* have been deleted from disk yet, since
    // the transaction has not been committed.
    return lf.testing.util.selectAll(global, j);
  }).then(function(results) {
    assertEquals(sampleJobs.length, results.length);

    return tx.commit();
  }).then(function() {
    var stats = tx.stats();
    assertTrue(stats.success());
    assertEquals(2, stats.changedTableCount());
    assertEquals(350, stats.deletedRowCount());  // 50 jobs + 300 employees.
    assertEquals(0, stats.insertedRowCount());
    assertEquals(0, stats.updatedRowCount());

    // Expecting all job rows to have been deleted from disk, now that the
    // transaction was committed.
    return lf.testing.util.selectAll(global, j);
  }).then(function(results) {
    assertEquals(0, results.length);

    // Expecting all locks to have been released by previous transaction, which
    // should allow the following query to complete.
    return db.select().from(e).exec();
  }).then(function(results) {
    assertTrue(results.length < sampleEmployees.length);
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that if an attached query fails, the entire transaction is rolled back.
 */
function testAttach_Error() {
  asyncTestCase.waitForAsync('testAttach_Error');

  var scope = [j, e];
  var newJobId = 'SomeUniqueId';

  tx.begin(scope).then(function() {
    var q0 = db.select().from(j);
    return tx.attach(q0);
  }).then(function(results) {
    assertEquals(sampleJobs.length, results.length);

    // Adding a new job row.
    var newJob = j.createRow();
    newJob.setId(newJobId);
    var q1 = db.insert().into(j).values([newJob]);
    return tx.attach(q1);
  }).then(function() {
    var q2 = db.select().from(j).where(j.id.eq(newJobId));
    return tx.attach(q2);
  }).then(function(results) {
    assertEquals(1, results.length);

    var q3 = db.select().from(j);
    return tx.attach(q3);
  }).then(function(results) {
    assertEquals(sampleJobs.length + 1, results.length);

    // Attempting to add an employee row that already exists.
    var q4 = db.insert().into(e).values([sampleEmployees[0]]);
    return tx.attach(q4);
  }).thenCatch(function(e) {
    // 201: Duplicate keys are not allowed.
    assertEquals(201, e.code);

    // Checking that the transaction has been finalized.
    // 107: Invalid transaction state transition: {0} -> {1}.
    lf.testing.util.assertThrowsError(107, attachFn);
    lf.testing.util.assertThrowsError(107, commitFn);
    lf.testing.util.assertThrowsError(107, rollbackFn);
    lf.testing.util.assertThrowsError(107, beginFn);

    return lf.testing.util.selectAll(global, j);
  }).then(function(results) {
    // Checking that the entire transaction was rolled back, and therefore that
    // Job row that had been added does not appear on disk.
    assertEquals(sampleJobs.length, results.length);

    // Checking that all locks have been released, which will allow other
    // transactions referring to the same scope to execute successfully.
    return db.select().from(j).exec();
  }).then(function(results) {
    assertEquals(sampleJobs.length, results.length);
    asyncTestCase.continueTesting();
  });
}


/**
 * Tests that when a transaction is explicitly rolled back, all changes that
 * were made as part of this transaction are discarded.
 */
function testRollback() {
  asyncTestCase.waitForAsync('testRollback');

  var scope = [j, e];
  var newJobId = 'SomeUniqueId';

  tx.begin(scope).then(function() {
    // Adding a new job row.
    var newJob = j.createRow();
    newJob.setId(newJobId);
    var q1 = db.insert().into(j).values([newJob]);
    return tx.attach(q1);
  }).then(function(results) {
    var q2 = db.select().from(j).where(j.id.eq(newJobId));
    return tx.attach(q2);
  }).then(function(results) {
    assertEquals(1, results.length);

    var q3 = db.select().from(j);
    return tx.attach(q3);
  }).then(function(results) {
    assertEquals(sampleJobs.length + 1, results.length);

    return tx.rollback();
  }).then(function() {
    // Checking that the transaction has been finalized.
    // 107: Invalid transaction state transition: {0} -> {1}.
    lf.testing.util.assertThrowsError(107, attachFn);
    lf.testing.util.assertThrowsError(107, commitFn);
    lf.testing.util.assertThrowsError(107, rollbackFn);
    lf.testing.util.assertThrowsError(107, beginFn);

    return lf.testing.util.selectAll(global, j);
  }).then(function(results) {
    // Checking that the entire transaction was rolled back, and therefore that
    // Job row that had been added does not appear on disk.
    assertEquals(sampleJobs.length, results.length);

    // Expecting all locks to have been released by previous transaction, which
    // should allow the following query to complete.
    return db.select().from(j).exec();
  }).then(function() {
    var stats = tx.stats();
    assertFalse(stats.success());
    assertEquals(0, stats.insertedRowCount());
    assertEquals(0, stats.updatedRowCount());
    assertEquals(0, stats.deletedRowCount());
    assertEquals(0, stats.changedTableCount());
    asyncTestCase.continueTesting();
  });
}


/**
 * Tests the case where an attached query modifiess the results of an observed
 * query and ensures that observers are triggered.
 */
function testAttach_WithObservers() {
  asyncTestCase.waitForAsync('testAttach_WithObservers');
  var scope = [j];

  var initialJobCount = sampleJobs.length;
  var additionalJobCount = 2;

  var jobDataGenerator = new lf.testing.hrSchema.JobDataGenerator(
      hr.db.getSchema());
  var newJobs = jobDataGenerator.generate(additionalJobCount);
  newJobs.forEach(function(job, index) {
    job.setId('SomeUniqueId' + index.toString());
  });

  var observeCallback = function(changeEvents) {
    assertEquals(
        initialJobCount + additionalJobCount,
        changeEvents.length);
    assertEquals(
        initialJobCount + additionalJobCount,
        changeEvents[0]['object'].length);

    asyncTestCase.continueTesting();
  };

  var q = db.select().from(j);
  db.observe(q, observeCallback);

  tx.begin(scope).then(function() {
    // Adding a new job row.
    var q1 = db.insert().into(j).values([newJobs[0]]);
    return tx.attach(q1);
  }).then(function(results) {
    // Adding another new job row.
    var q2 = db.insert().into(j).values([newJobs[1]]);
    return tx.attach(q2);
  }).then(function() {
    return tx.commit();
  }, fail);
}
