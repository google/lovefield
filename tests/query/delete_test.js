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
goog.require('lf.bind');
goog.require('lf.query.DeleteBuilder');
goog.require('lf.schema.DataStoreType');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('Delete');


/** @type {!lf.Database} */
var db;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(function(
      database) {
        db = database;
        asyncTestCase.continueTesting();
      }, fail);
}


function tearDown() {
  db.close();
}


/**
 * Tests that Delete#exec() fails if from() has not been called first.
 */
function testExec_ThrowsMissingFrom() {
  asyncTestCase.waitForAsync('testExec_ThrowsMissingFrom');
  var query = new lf.query.DeleteBuilder(hr.db.getGlobal());
  query.exec().then(
      fail,
      function(e) {
        asyncTestCase.continueTesting();
      });
}


/**
 * Tests that Delete#from() fails if from() has already been called.
 */
function testFrom_ThrowsAlreadyCalled() {
  var query = new lf.query.DeleteBuilder(hr.db.getGlobal());

  var buildQuery = function() {
    var e = db.getSchema().getEmployee();
    query.from(e).from(e);
  };

  assertThrows(buildQuery);
}


/**
 * Tests that Delete#where() fails if where() has already been called.
 */
function testWhere_ThrowsAlreadyCalled() {
  var query = new lf.query.DeleteBuilder(hr.db.getGlobal());

  var buildQuery = function() {
    var employeeTable = db.getSchema().getEmployee();
    var predicate = employeeTable.jobId.eq('dummyJobId');
    query.from(employeeTable).where(predicate).where(predicate);
  };

  assertThrows(buildQuery);
}

function testWhere_ThrowsCalledBeforeFrom() {
  var query = new lf.query.DeleteBuilder(hr.db.getGlobal());

  var buildQuery = function() {
    var employeeTable = db.getSchema().getEmployee();
    var predicate = employeeTable.jobId.eq('dummyJobId');
    query.where(predicate).from(employeeTable);
  };

  assertThrows(buildQuery);
}

function testContext_Clone() {
  var j = db.getSchema().getJob();
  var query = /** @type {!lf.query.DeleteBuilder} */ (
      db.delete().from(j).where(j.id.eq(lf.bind(0))));
  var context = query.getQuery();
  var context2 = context.clone();
  assertObjectEquals(context.where, context2.where);
  assertObjectEquals(context.from, context2.from);
  assertTrue(context2.clonedFrom == context);
  assertTrue(goog.getUid(context) != goog.getUid(context2));
}
