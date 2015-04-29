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
goog.require('lf.bind');
goog.require('lf.fn');
goog.require('lf.op');
goog.require('lf.query.SelectBuilder');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.util');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('Select');


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


/**
 * Tests that Select#exec() fails if from() has not been called first.
 */
function testExec_ThrowsMissingFrom() {
  asyncTestCase.waitForAsync('testExec_ThrowsMissingFrom');
  var query = new lf.query.SelectBuilder(hr.db.getGlobal(), []);
  query.exec().then(
      fail,
      function(e) {
        asyncTestCase.continueTesting();
      });
}


/**
 * Tests that constructing a query fails if an invalid projection list is
 * requested.
 */
function testExec_ThrowsInvalidProjectionList() {
  asyncTestCase.waitForAsync('testExec_ThrowsInvalidProjectionList');

  var e = db.getSchema().getEmployee();
  var query = new lf.query.SelectBuilder(
      hr.db.getGlobal(), [e.email, lf.fn.avg(e.salary)]);
  query.from(e).exec().then(
      fail,
      function(e) {
        assertEquals(e.name, lf.Exception.Type.SYNTAX);
        asyncTestCase.continueTesting();
      });
}


/**
 * Tests that constructing a query involving Select#groupBy() fails if an
 * invalid combination of projection and groupBy list is requested.
 */
function testExec_ThrowsInvalidProjectionList_GroupBy() {
  asyncTestCase.waitForAsync('testExec_ThrowsInvalidProjectionList_GroupBy');

  var e = db.getSchema().getEmployee();
  var query = new lf.query.SelectBuilder(
      hr.db.getGlobal(), [e.email, e.salary]);
  query.from(e).groupBy(e.jobId).exec().then(
      fail,
      function(e) {
        assertEquals(e.name, lf.Exception.Type.SYNTAX);
        asyncTestCase.continueTesting();
      });
}


/**
 * Tests that groupBy on non-indexable fields will fail.
 */
function testExec_ThrowsGroupByNonIndexableColumn() {
  asyncTestCase.waitForAsync('testExec_ThrowsGroupByNonIndexableColumn');

  var e = db.getSchema().getEmployee();
  var query = new lf.query.SelectBuilder(
      hr.db.getGlobal(), [e.email, e.salary, e.photo]);
  query.from(e).groupBy(e.photo).exec().then(
      fail,
      function(e) {
        assertEquals(e.name, lf.Exception.Type.SYNTAX);
        asyncTestCase.continueTesting();
      });
}


/**
 * Tests that constructing a query succeeds if a valid projection list is
 * requested (and if no other violation occurs).
 */
function testExec_ValidProjectionList() {
  asyncTestCase.waitForAsync('testExec_ValidProjectionList');
  var e = db.getSchema().getEmployee();

  // Constructing a query where all requested columns are aggregated.
  var query1 = new lf.query.SelectBuilder(
      hr.db.getGlobal(), [lf.fn.min(e.salary), lf.fn.avg(e.salary)]);
  query1.from(e);

  // Constructing a query where all requested columns are non-aggregated.
  var query2 = new lf.query.SelectBuilder(
      hr.db.getGlobal(), [e.salary, e.salary]);
  query2.from(e);

  goog.Promise.all([
    query1.exec(),
    query2.exec()
  ]).then(
      function(e) {
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests that constructing queries involving Select#groupBy() succeed if a
 * valid combination of projection and groupBy list is requested. This test
 * checks that columns in groupBy() does not necessarily exist in projection
 * list.
 */
function testExec_ValidProjectionList_GroupBy() {
  asyncTestCase.waitForAsync('testExec_ValidProjectionList_GroupBy');

  var e = db.getSchema().getEmployee();
  var query = new lf.query.SelectBuilder(
      hr.db.getGlobal(), [e.jobId, lf.fn.avg(e.salary)]);
  query.from(e).groupBy(e.jobId, e.departmentId).exec().then(
      function(e) {
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests that unbound parameterized search condition will throw.
 */
function testExec_UnboundPredicateThrows() {
  asyncTestCase.waitForAsync('testsExec_UnboundPredicateThrows');

  var emp = db.getSchema().getEmployee();
  var query = new lf.query.SelectBuilder(hr.db.getGlobal(), [emp.jobId]);
  query.from(emp).where(emp.jobId.eq(lf.bind(0))).exec().then(fail,
      function(e) {
        assertEquals(lf.Exception.Type.SYNTAX, e.name);
        asyncTestCase.continueTesting();
      });
}


/**
 * Tests that Select#from() fails if from() has already been called.
 */
function testFrom_ThrowsAlreadyCalled() {
  var query = new lf.query.SelectBuilder(hr.db.getGlobal(), []);

  var buildQuery = function() {
    var jobTable = db.getSchema().getJob();
    var employeeTable = db.getSchema().getEmployee();
    query.from(jobTable).from(employeeTable);
  };

  lf.testing.util.assertThrowsSyntaxError(buildQuery);
}


/**
 * Tests that Select#where() fails if where() has already been called.
 */
function testWhere_ThrowsAlreadyCalled() {
  var query = new lf.query.SelectBuilder(hr.db.getGlobal(), []);

  var buildQuery = function() {
    var employeeTable = db.getSchema().getEmployee();
    var predicate = employeeTable.id.eq('testId');
    query.where(predicate).where(predicate);
  };

  lf.testing.util.assertThrowsSyntaxError(buildQuery);
}


/**
 * Tests that Select#groupBy() fails if groupBy() has already been called.
 */
function testGroupBy_ThrowsAlreadyCalled() {
  var query = new lf.query.SelectBuilder(hr.db.getGlobal(), []);

  var buildQuery = function() {
    var employeeTable = db.getSchema().getEmployee();
    query.groupBy(employeeTable.id).groupBy(employeeTable.jobId);
  };

  lf.testing.util.assertThrowsSyntaxError(buildQuery);
}


/**
 * Tests that Select#limit() fails if limit() has already been called.
 */
function testLimit_ThrowsAlreadyCalled() {
  var query = new lf.query.SelectBuilder(hr.db.getGlobal(), []);

  var buildQuery = function() {
    var employeeTable = db.getSchema().getEmployee();
    query.from(employeeTable).limit(100).limit(100);
  };

  lf.testing.util.assertThrowsSyntaxError(buildQuery);
}


/**
 * Tests that Select#limit() fails if a negative value is passed.
 */
function testLimit_ThrowsInvalidParameter() {
  var query = new lf.query.SelectBuilder(hr.db.getGlobal(), []);
  var employeeTable = db.getSchema().getEmployee();

  var buildQuery = function() {
    query.from(employeeTable).limit(-100);
  };
  lf.testing.util.assertThrowsSyntaxError(buildQuery);
}


/**
 * Tests that Select#skip() fails if skip() has already been called.
 */
function testSkip_ThrowsAlreadyCalled() {
  var query = new lf.query.SelectBuilder(hr.db.getGlobal(), []);

  var buildQuery = function() {
    var employeeTable = db.getSchema().getEmployee();
    query.from(employeeTable).skip(100).skip(100);
  };

  lf.testing.util.assertThrowsSyntaxError(buildQuery);
}


/**
 * Tests that Select#skip() fails if a negative value is passed.
 */
function testSkip_ThrowsInvalidParameter() {
  var query = new lf.query.SelectBuilder(hr.db.getGlobal(), []);
  var employeeTable = db.getSchema().getEmployee();

  var buildQuery = function() {
    query.from(employeeTable).skip(-100);
  };
  lf.testing.util.assertThrowsSyntaxError(buildQuery);
}


function testProject_ThrowsInvalidColumns() {
  var job = db.getSchema().getJob();

  var buildQuery1 = function() {
    var query = new lf.query.SelectBuilder(hr.db.getGlobal(), [
      lf.fn.distinct(job.maxSalary),
      lf.fn.avg(job.maxSalary)
    ]);
    query.from(job);
  };
  lf.testing.util.assertThrowsSyntaxError(buildQuery1);

  var buildQuery2 = function() {
    var query = new lf.query.SelectBuilder(hr.db.getGlobal(), [
      job.title,
      lf.fn.distinct(job.maxSalary)
    ]);
    query.from(job);
  };
  lf.testing.util.assertThrowsSyntaxError(buildQuery2);
}


function testProject_Aggregator_Avg() {
  var table = db.getSchema().getDummyTable();

  var invalidAggregators = [
    lf.fn.avg(table.arraybuffer), lf.fn.avg(table.datetime),
    lf.fn.avg(table.string), lf.fn.avg(table.boolean)
  ];
  var validAggregators = [lf.fn.avg(table.number), lf.fn.avg(table.integer)];

  checkAggregators(invalidAggregators, validAggregators, table);
}


function testProject_Aggregator_Count() {
  var table = db.getSchema().getDummyTable();

  var invalidAggregators = [];
  var validAggregators = [
    lf.fn.count(table.arraybuffer), lf.fn.count(table.datetime),
    lf.fn.count(table.string), lf.fn.count(table.boolean),
    lf.fn.count(table.number), lf.fn.count(table.integer)
  ];

  checkAggregators(invalidAggregators, validAggregators, table);
}


function testProject_Aggregator_Distinct() {
  var table = db.getSchema().getDummyTable();

  var invalidAggregators = [];
  var validAggregators = [
    lf.fn.distinct(table.arraybuffer), lf.fn.distinct(table.datetime),
    lf.fn.distinct(table.string), lf.fn.distinct(table.boolean),
    lf.fn.distinct(table.number), lf.fn.distinct(table.integer)
  ];

  checkAggregators(invalidAggregators, validAggregators, table);
}


function testProject_Aggregator_Max() {
  var table = db.getSchema().getDummyTable();

  var invalidAggregators = [
    lf.fn.max(table.arraybuffer), lf.fn.max(table.boolean)
  ];
  var validAggregators = [
    lf.fn.max(table.datetime), lf.fn.max(table.integer),
    lf.fn.max(table.number), lf.fn.max(table.string)
  ];

  checkAggregators(invalidAggregators, validAggregators, table);
}


function testProject_Aggregator_Min() {
  var table = db.getSchema().getDummyTable();

  var invalidAggregators = [
    lf.fn.min(table.arraybuffer), lf.fn.min(table.boolean)
  ];
  var validAggregators = [
    lf.fn.min(table.datetime), lf.fn.min(table.integer),
    lf.fn.min(table.number), lf.fn.min(table.string)
  ];

  checkAggregators(invalidAggregators, validAggregators, table);
}


function testProject_Aggregator_Stddev() {
  var table = db.getSchema().getDummyTable();

  var invalidAggregators = [
    lf.fn.stddev(table.arraybuffer), lf.fn.stddev(table.datetime),
    lf.fn.stddev(table.string), lf.fn.stddev(table.boolean)
  ];
  var validAggregators = [
    lf.fn.stddev(table.number), lf.fn.stddev(table.integer)
  ];

  checkAggregators(invalidAggregators, validAggregators, table);
}


function testProject_Aggregator_Sum() {
  var table = db.getSchema().getDummyTable();

  var invalidAggregators = [
    lf.fn.sum(table.arraybuffer), lf.fn.sum(table.datetime),
    lf.fn.sum(table.string), lf.fn.sum(table.boolean)
  ];
  var validAggregators = [
    lf.fn.sum(table.number), lf.fn.sum(table.integer)
  ];

  checkAggregators(invalidAggregators, validAggregators, table);
}


/**
 * Checks a list of aggregators for validity.
 * @param {!Array<!lf.fn.AggregatedColumn>} invalidAggregators Aggregators
 *     expected to fail the validity check.
 * @param {!Array<!lf.fn.AggregatedColumn>} validAggregators Aggregators
 *     expected to pass the validity check.
 * @param {!lf.schema.Table} table
 */
function checkAggregators(invalidAggregators, validAggregators, table) {
  invalidAggregators.forEach(function(aggregator) {
    var buildQuery = function() {
      return new lf.query.SelectBuilder(
          hr.db.getGlobal(), [aggregator]).from(table);
    };
    lf.testing.util.assertThrowsSyntaxError(buildQuery);
  });

  validAggregators.forEach(function(aggregator) {
    var buildQuery = function() {
      return new lf.query.SelectBuilder(
          hr.db.getGlobal(), [aggregator]).from(table);
    };
    assertNotThrows(buildQuery);
  });
}


function testExplain() {
  var query = db.select().from(db.getSchema().getEmployee()).skip(1);
  var expected =
      'skip(1)\n' +
      '-project()\n' +
      '--table_access(Employee)\n';
  assertEquals(expected, query.explain());
}


function testSkipLimitBinding() {
  var query = db.select().from(db.getSchema().getEmployee()).
      limit(lf.bind(0)).
      skip(lf.bind(1));

  query.bind([22, 33]);
  var expected =
      'limit(22)\n' +
      '-skip(33)\n' +
      '--project()\n' +
      '---table_access(Employee)\n';
  assertEquals(expected, query.explain());

  query.bind([44, 55]);
  var expected2 =
      'limit(44)\n' +
      '-skip(55)\n' +
      '--project()\n' +
      '---table_access(Employee)\n';
  assertEquals(expected2, query.explain());
}


function testInvalidBindingRejects() {
  var query = db.select().from(db.getSchema().getEmployee()).
      limit(lf.bind(0)).
      skip(lf.bind(1));

  asyncTestCase.waitForAsync('testInvalidBindingRejects');
  query.exec().then(fail, function(e) {
    assertEquals(lf.Exception.Type.SYNTAX, e.name);
    asyncTestCase.continueTesting();
  });
}


function testContext_Clone() {
  var j = db.getSchema().getJob();
  var query = /** @type {!lf.query.SelectBuilder} */ (
      db.select(j.title).from(j).where(lf.op.or(
      j.minSalary.lt(lf.bind(0)), j.maxSalary.gt(lf.bind(1)))).
      orderBy(j.title).
      groupBy(j.minSalary).
      limit(10).skip(2));
  var context = query.getQuery();
  var context2 = context.clone();
  assertObjectEquals(context.from, context2.from);
  assertObjectEquals(context.where, context2.where);
  assertTrue(context2.clonedFrom == context);
  assertObjectEquals(context.orderBy, context2.orderBy);
  assertObjectEquals(context.groupBy, context2.groupBy);
  assertArrayEquals(context.columns, context2.columns);
  assertEquals(context.limit, context2.limit);
  assertEquals(context.skip, context2.skip);
  assertTrue(goog.getUid(context) != goog.getUid(context2));
}
