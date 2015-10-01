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
goog.require('lf.TransactionType');
goog.require('lf.proc.TaskPriority');
goog.require('lf.schema.DataStoreType');
goog.require('lf.service');
goog.require('lf.structs.set');
goog.require('lf.testing.MockTask');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('RunnerTest');


/** @type {!lf.Database} */
var db;


/** @type {!lf.proc.Runner} */
var runner;


/** @type {!hr.db.schema.Job} */
var j;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(function(
      database) {
        db = database;
        runner = hr.db.getGlobal().getService(lf.service.RUNNER);
        j = db.getSchema().getJob();
      }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


function tearDown() {
  db.close();
}


/** @return {!lf.structs.Set<!lf.schema.Table>} */
function createScope() {
  var scope = lf.structs.set.create();
  scope.add(j);
  return scope;
}


/**
 * Tests that SELECT queries are executed after overlapping write transaction
 * finishes.
 */
function testTransaction_Read() {
  asyncTestCase.waitForAsync('testTransaction_Read');

  var executionOrder = [];

  // Creating two tasks refering to the same scope.
  var queryTask1 = new lf.testing.MockTask(
      lf.TransactionType.READ_WRITE,
      createScope(),
      function() { executionOrder.push('query1'); },
      lf.proc.TaskPriority.USER_QUERY_TASK);
  var queryTask2 = new lf.testing.MockTask(
      lf.TransactionType.READ_ONLY,
      createScope(),
      function() { executionOrder.push('query2'); },
      lf.proc.TaskPriority.USER_QUERY_TASK);

  var promises = [queryTask1, queryTask2].map(
      function(queryTask) {
        return runner.scheduleTask(queryTask);
      });

  goog.Promise.all(promises).then(
      function(results) {
        // Ensuring that the READ_ONLY task was executed after the READ_WRITE
        // task finished.
        assertArrayEquals(['query1', 'query2'], executionOrder);

        asyncTestCase.continueTesting();
      });
}


/**
 * Tests that multiple overlapping READ_WRITE transactions are executed in the
 * expected order.
 */
function testTransaction_Write() {
  asyncTestCase.waitForAsync('testTransaction_Write');
  var actualExecutionOrder = [];
  var expectedExecutionOrder = [];

  var ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  var queryTasks = ids.map(function(id) {
    var queryTask = new lf.testing.MockTask(
        lf.TransactionType.READ_WRITE,
        createScope(),
        function() {
          actualExecutionOrder.push('query' + id.toString());
        },
        lf.proc.TaskPriority.USER_QUERY_TASK);
    expectedExecutionOrder.push('query' + id.toString());
    return queryTask;
  });

  var promises = queryTasks.map(function(task) {
    return runner.scheduleTask(task);
  });

  goog.Promise.all(promises).then(
      function(results) {
        assertArrayEquals(expectedExecutionOrder, actualExecutionOrder);
        asyncTestCase.continueTesting();
      });
}


function testTask_Success() {
  asyncTestCase.waitForAsync('testTask_Success');

  var expectedResult = 'dummyResult';

  var queryTask = new lf.testing.MockTask(
      lf.TransactionType.READ_WRITE,
      createScope(),
      function() { return expectedResult; },
      lf.proc.TaskPriority.USER_QUERY_TASK);

  runner.scheduleTask(queryTask).then(
      function(result) {
        assertEquals(expectedResult, result);
        asyncTestCase.continueTesting();
      }, fail);
}


function testTask_Failure() {
  asyncTestCase.waitForAsync('testTask_Failure');

  var expectedError = new Error('dummyError');

  var queryTask = new lf.testing.MockTask(
      lf.TransactionType.READ_WRITE,
      createScope(),
      function() { throw expectedError; },
      lf.proc.TaskPriority.USER_QUERY_TASK);

  runner.scheduleTask(queryTask).then(
      fail,
      function(error) {
        assertEquals(expectedError, error);
        asyncTestCase.continueTesting();
      });
}


/**
 * Tests that prioritized tasks are placed in the front of the queue.
 */
function testScheduleTask_Prioritize() {
  asyncTestCase.waitForAsync('testScheduleTask_Prioritize');

  var resolver = goog.Promise.withResolver();
  var executionOrder = [];

  var task1 = new lf.testing.MockTask(
      lf.TransactionType.READ_WRITE,
      createScope(),
      function() { return resolver.promise; },
      lf.proc.TaskPriority.USER_QUERY_TASK);
  var task2 = new lf.testing.MockTask(
      lf.TransactionType.READ_WRITE,
      createScope(),
      function() { executionOrder.push('task2'); },
      lf.proc.TaskPriority.TRANSACTION_TASK);
  var task3 = new lf.testing.MockTask(
      lf.TransactionType.READ_WRITE,
      createScope(),
      function() { executionOrder.push('task3'); },
      lf.proc.TaskPriority.EXTERNAL_CHANGE_TASK);
  var task4 = new lf.testing.MockTask(
      lf.TransactionType.READ_WRITE,
      createScope(),
      function() { executionOrder.push('task4'); },
      lf.proc.TaskPriority.OBSERVER_QUERY_TASK);

  var p1 = runner.scheduleTask(task1);
  var p2 = runner.scheduleTask(task2);
  var p3 = runner.scheduleTask(task3);
  var p4 = runner.scheduleTask(task4);

  goog.Promise.all([p1, p2, p3, p4]).then(
      function(results) {
        // Ensuring that the prioritized task3 executed before task2.
        assertArrayEquals(['task4', 'task3', 'task2'], executionOrder);
        asyncTestCase.continueTesting();
      });

  resolver.resolve();
}


/**
 * Tests that a READ_WRITE transaction will wait for an alreday running
 * READ_ONLY transaction with overlapping scope to finish.
 */
function testTransaction_WriteWhileReading() {
  asyncTestCase.waitForAsync('testTransaction_WriteWhileReading');

  var resolver = goog.Promise.withResolver();
  var executionOrder = [];

  // Creating a READ_ONLY and a READ_WRITE task that refer to the same scope.
  var queryTask1 = new lf.testing.MockTask(
      lf.TransactionType.READ_ONLY,
      createScope(),
      function() {
        executionOrder.push('q1 start');
        return resolver.promise.then(function() {
          executionOrder.push('q1 end');
        });
      },
      lf.proc.TaskPriority.USER_QUERY_TASK);
  var queryTask2 = new lf.testing.MockTask(
      lf.TransactionType.READ_WRITE,
      createScope(),
      function() {
        executionOrder.push('q2 start');
        executionOrder.push('q2 end');
      },
      lf.proc.TaskPriority.USER_QUERY_TASK);

  var promises = [queryTask1, queryTask2].map(
      function(queryTask) {
        return runner.scheduleTask(queryTask);
      });

  goog.Promise.all(promises).then(
      function(results) {
        // Ensuring that the READ_ONLY task completed before the READ_WRITE task
        // started.
        assertArrayEquals(
            ['q1 start', 'q1 end', 'q2 start', 'q2 end'],
            executionOrder);

        asyncTestCase.continueTesting();
      });

  resolver.resolve();
}
