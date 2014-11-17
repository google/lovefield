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
goog.require('lf.Global');
goog.require('lf.TransactionType');
goog.require('lf.service');
goog.require('lf.testing.MockTask');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('RunnerTest');


/** @type {!hr.db.Database} */
var db;


/** @type {!lf.proc.Runner} */
var runner;


/** @type {!hr.db.schema.Job} */
var j;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.getInstance(undefined, true).then(function(database) {
    db = database;
    runner = lf.Global.get().getService(lf.service.RUNNER);
    j = db.getSchema().getJob();
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
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
      new goog.structs.Set([j]),
      function() { executionOrder.push('query1'); });
  var queryTask2 = new lf.testing.MockTask(
      lf.TransactionType.READ_ONLY,
      new goog.structs.Set([j]),
      function() { executionOrder.push('query2'); });

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


function testTask_Success() {
  asyncTestCase.waitForAsync('testTask_Success');

  var expectedResult = 'dummyResult';

  var queryTask = new lf.testing.MockTask(
      lf.TransactionType.READ_WRITE,
      new goog.structs.Set([j]),
      function() { return expectedResult; });

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
      new goog.structs.Set([j]),
      function() { throw expectedError; });

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
      new goog.structs.Set([j]),
      function() { return resolver.promise; });
  var task2 = new lf.testing.MockTask(
      lf.TransactionType.READ_WRITE,
      new goog.structs.Set([j]),
      function() { executionOrder.push('task2'); });
  var task3 = new lf.testing.MockTask(
      lf.TransactionType.READ_WRITE,
      new goog.structs.Set([j]),
      function() { executionOrder.push('task3'); });

  var p1 = runner.scheduleTask(task1);
  var p2 = runner.scheduleTask(task2);
  var p3 = runner.scheduleTask(task3, true /* opt_prioritize */);

  goog.Promise.all([p1, p2, p3]).then(
      function(results) {
        // Ensuring that the prioritized task3 executed before task2.
        assertArrayEquals(['task3', 'task2'], executionOrder);
        asyncTestCase.continueTesting();
      });

  resolver.resolve();
}
