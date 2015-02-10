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
goog.require('lf.fn');
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


/** @type {!Array.<!hr.db.row.Job>} */
var sampleJobs;


/** @type {!Array.<!hr.db.row.Employee>} */
var sampleEmployees;


/** @type {!Array.<!hr.db.row.Department>} */
var sampleDepartments;


/** @type {!lf.testing.hrSchema.MockDataGenerator} */
var dataGenerator;


/** @type {!lf.Global} */
var global;


/** @type {!lf.Transaction} */
var tx;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.getInstance(
      /* opt_onUpgrade */ undefined,
      /* opt_volatile */ true).then(function(database) {
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

  return db.createTransaction().exec([
    db.insert().into(j).values(sampleJobs),
    db.insert().into(e).values(sampleEmployees),
    db.insert().into(d).values(sampleDepartments)
  ]);
}


function commitFn() { tx.commit(); }
function rollbackFn() { tx.rollback(); }
function attachFn() { tx.attach(db.select().from(j)); }
function beginFn() { tx.begin([j, e]); }
function execFn() { tx.exec([db.select().from(e)]); }


/**
 * Tests that an lf.Exception.TRANSACTION is thrown when the following
 * operations are requested before the transaction has started initializing.
 *  - Attaching a query.
 *  - Attempting to commit the transaction.
 *  - Attempting to rollback the transaction.
 */
function testThrows_StateCreated() {
  assertThrowsTransactionError(attachFn);
  assertThrowsTransactionError(commitFn);
  assertThrowsTransactionError(rollbackFn);
}


/**
 * Tests that an lf.Exception.TRANSACTION is thrown when any operation is
 * attempted while a query is executing.
 */
function testThrows_StateExecutingQuery() {
  asyncTestCase.waitForAsync('testThrows_StateExecutingQuery');

  tx.begin([j, e]).then(function() {
    tx.attach(db.select().from(e));

    assertThrowsTransactionError(attachFn);
    assertThrowsTransactionError(beginFn);
    assertThrowsTransactionError(commitFn);
    assertThrowsTransactionError(rollbackFn);
    assertThrowsTransactionError(execFn);
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that an lf.Exception.TRANSACTION is thrown when any operation is
 * attempted after transaction has been finalized.
 */
function testThrows_StateFinalized() {
  asyncTestCase.waitForAsync('testThrows_StateFinalized');

  tx.begin([e]).then(function() {
    var whenDone = tx.commit();
    assertThrowsTransactionError(beginFn);
    assertThrowsTransactionError(attachFn);
    assertThrowsTransactionError(commitFn);
    assertThrowsTransactionError(rollbackFn);
    assertThrowsTransactionError(execFn);

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

  assertThrowsTransactionError(beginFn);
  assertThrowsTransactionError(attachFn);
  assertThrowsTransactionError(commitFn);
  assertThrowsTransactionError(rollbackFn);
  assertThrowsTransactionError(execFn);

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

  assertThrowsTransactionError(beginFn);
  assertThrowsTransactionError(attachFn);
  assertThrowsTransactionError(commitFn);
  assertThrowsTransactionError(rollbackFn);
  assertThrowsTransactionError(execFn);

  whenDone.then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


function testExec() {
  asyncTestCase.waitForAsync('testExec');
  var tx = db.createTransaction();
  var q1 = db.select(lf.fn.count(j.id).as('jid')).from(j);
  var q2 = db.select(lf.fn.count(d.id).as('did')).from(d);
  var q3 = db.delete().from(j);
  tx.exec([q1, q2, q3, q1]).then(function(results) {
    assertEquals(4, results.length);
    assertEquals(sampleJobs.length, results[0][0]['jid']);
    assertEquals(sampleDepartments.length, results[1][0]['did']);
    assertEquals(0, results[3][0]['jid']);
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

    // Deleting all rows in the Job table.
    var q5 = db.delete().from(j);
    return tx.attach(q5);
  }).then(function() {
    var q6 = db.select().from(j);
    return tx.attach(q6);
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
  var newJob = sampleJobs[0];
  newJob.setId(newJobId);

  tx.begin(scope).then(function() {
    // Adding a new job row.
    var q1 = db.insert().into(j).values([newJob]);
    return tx.attach(q1);
  }).then(function(results) {
    var q2 = db.select().from(j).where(j.id.eq(newJobId));
    return tx.attach(q2);
  }).then(function(results) {
    assertEquals(1, results.length);

    // Attempting to add an employee row that already exists.
    var q3 = db.insert().into(e).values([sampleEmployees[0]]);
    return tx.attach(q3);
  }).thenCatch(function(e) {
    assertEquals(lf.Exception.Type.CONSTRAINT, e.name);

    // Checking that the transaction has been finalized.
    assertThrowsTransactionError(attachFn);
    assertThrowsTransactionError(commitFn);
    assertThrowsTransactionError(rollbackFn);
    assertThrowsTransactionError(beginFn);

    return lf.testing.util.selectAll(global, j);
  }).then(function(results) {
    // Checking that the entire transaction was rolled back, and therefore that
    // Job row that had been added does not appear on disk.
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
  var newJob = sampleJobs[0];
  newJob.setId(newJobId);

  tx.begin(scope).then(function() {
    // Adding a new job row.
    var q1 = db.insert().into(j).values([newJob]);
    return tx.attach(q1);
  }).then(function(results) {
    var q2 = db.select().from(j).where(j.id.eq(newJobId));
    return tx.attach(q2);
  }).then(function(results) {
    assertEquals(1, results.length);

    return tx.rollback();
  }).then(function() {
    // Checking that the transaction has been finalized.
    assertThrowsTransactionError(attachFn);
    assertThrowsTransactionError(commitFn);
    assertThrowsTransactionError(rollbackFn);
    assertThrowsTransactionError(beginFn);

    return lf.testing.util.selectAll(global, j);
  }).then(function(results) {
    // Checking that the entire transaction was rolled back, and therefore that
    // Job row that had been added does not appear on disk.
    assertEquals(sampleJobs.length, results.length);

    // Expecting all locks to have been released by previous transaction, which
    // should allow the following query to complete.
    return db.select().from(j).exec();
  }).then(function() {
    asyncTestCase.continueTesting();
  });
}


/**
 * Asserts that an lf.Exception.Type.SYNTAX error is thrown.
 * @param {!function()} fn The function to be checked.
 * TODO(dpapad): Modify lf.testing.util.assertThrowsSyntaxError, to be more
 * generic and remove this function.
 */
function assertThrowsTransactionError(fn) {
  var thrown = false;
  try {
    fn.call();
  } catch (e) {
    thrown = true;
    assertEquals(lf.Exception.Type.TRANSACTION, e.name);
  }
  assertTrue(thrown);
}
