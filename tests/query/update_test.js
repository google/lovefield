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
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.Global');
goog.require('lf.bind');
goog.require('lf.query.UpdateBuilder');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('Update');


/** @type {!lf.Database} */
var db;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.getInstance(
      /* opt_onUpgrade*/ undefined,
      /* opt_volatile */ true).then(function(database) {
    db = database;
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that Update#exec() fails if set() has not been called first.
 */
function testExec_ThrowsMissingSet() {
  asyncTestCase.waitForAsync('testExec_ThrowsMissingSet');
  var employeeTable = db.getSchema().getEmployee();
  var query = new lf.query.UpdateBuilder(lf.Global.get(), employeeTable);
  query.where(employeeTable.jobId.eq('dummyJobId'));
  query.exec().then(
      fail,
      function(e) {
        asyncTestCase.continueTesting();
      });
}


/**
 * Tests that Update#where() fails if where() has already been called.
 */
function testWhere_ThrowsAlreadyCalled() {
  var employeeTable = db.getSchema().getEmployee();
  var query = new lf.query.UpdateBuilder(lf.Global.get(), employeeTable);

  var buildQuery = function() {
    var predicate = employeeTable.jobId.eq('dummyJobId');
    query.where(predicate).where(predicate);
  };

  assertThrows(buildQuery);
}


function testSet_ThrowsMissingBinding() {
  asyncTestCase.waitForAsync('testExec_ThrowsMissingBinding');
  var employeeTable = db.getSchema().getEmployee();
  var query = new lf.query.UpdateBuilder(lf.Global.get(), employeeTable);
  query.set(employeeTable.minSalary, lf.bind(0));
  query.set(employeeTable.maxSalary, 20000);
  query.where(employeeTable.jobId.eq('dummyJobId'));
  query.exec().then(
      fail,
      function(e) {
        asyncTestCase.continueTesting();
      });
}
