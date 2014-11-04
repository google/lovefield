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
goog.require('goog.array');
goog.require('goog.labs.structs.Multimap');
goog.require('goog.object');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.Order');
goog.require('lf.fn');
goog.require('lf.op');
goog.require('lf.testing.hrSchema.MockDataGenerator');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'EndToEndSelectTest');


/** @private {!hr.db.Database} */
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
var mockDataGenerator;


/** @type {number} */
asyncTestCase.stepTimeout = 5 * 1000;  // 5 seconds


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.getInstance(
      /* opt_onUpgrade */ undefined,
      /* opt_volatile */ true).then(function(database) {
    db = database;
    d = db.getSchema().getDepartment();
    e = db.getSchema().getEmployee();
    j = db.getSchema().getJob();
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

  mockDataGenerator = new lf.testing.hrSchema.MockDataGenerator(schema);
  mockDataGenerator.generate(
      /* jobCount */ 50,
      /* employeeCount */ 300,
      /* departmentCount */ 10);
  sampleEmployees = mockDataGenerator.sampleEmployees;
  sampleJobs = mockDataGenerator.sampleJobs;
  sampleDepartments = mockDataGenerator.sampleDepartments;

  return goog.Promise.all([
    db.insert().into(j).values(sampleJobs).exec(),
    db.insert().into(e).values(sampleEmployees).exec(),
    db.insert().into(d).values(sampleDepartments).exec()
  ]);
}


/**
 * Tests that a SELECT query without a specified predicate selects the entire
 * table.
 */
function testSelect_All() {
  asyncTestCase.waitForAsync('testSelect_All');

  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      db.select().from(j));

  queryBuilder.exec().then(
      function(results) {
        assertEquals(sampleJobs.length, results.length);
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests that a SELECT query with a specified limit respects that limit.
 */
function testSelect_Limit() {
  asyncTestCase.waitForAsync('testSelect_Limit');

  var limit = Math.floor(sampleJobs.length / 3);
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      db.select().from(j).limit(limit));

  queryBuilder.exec().then(
      function(results) {
        assertEquals(limit, results.length);
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests that a SELECT query with a specified SKIP actually skips those rows.
 */
function testSelect_Skip() {
  asyncTestCase.waitForAsync('testSelect_Skip');

  var skip = Math.floor(sampleJobs.length / 3);
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      db.select().from(j).skip(skip));

  queryBuilder.exec().then(
      function(results) {
        assertEquals(sampleJobs.length - skip, results.length);
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests that a SELECT query with a specified predicate selects only the rows
 * that satisfy the predicate.
 */
function testSelect_Predicate() {
  asyncTestCase.waitForAsync('testSelect_Predicate');

  var targetId = sampleJobs[3].getId();

  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      db.select().from(j).where(j.id.eq(targetId)));

  queryBuilder.exec().then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(targetId, results[0].id);
        asyncTestCase.continueTesting();
      }, fail);
}


function testSelect_As() {
  asyncTestCase.waitForAsync('testSelect_As');

  var targetId = sampleJobs[3].getId();

  var q1 = db.select(j.id.as('Foo')).from(j).where(j.id.eq(targetId));
  var q2 = db.select(j.id).from(j).where(j.id.eq(targetId));

  q1.exec().then(function(results) {
    assertEquals(1, results.length);
    assertEquals(targetId, results[0]['Foo']);
    return q2.exec();
  }).then(function(results) {
    assertEquals(1, results.length);
    assertEquals(targetId, results[0][j.id.getName()]);
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that a SELECT query with column filtering only returns the columns that
 * were requested.
 */
function testSelect_ColumnFiltering() {
  asyncTestCase.waitForAsync('testSelect_ColumnFiltering');


  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      db.select(j.id, j.title.as('Job Title')).
      from(j));

  queryBuilder.exec().then(
      function(results) {
        assertEquals(sampleJobs.length, results.length);
        results.forEach(function(result) {
          assertEquals(2, goog.object.getCount(result));
          assertTrue(goog.isDefAndNotNull(result.id));
          assertTrue(goog.isDefAndNotNull(result['Job Title']));
        });

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case of a SELECT query with an implicit join.
 */
function testSelect_ImplicitJoin() {
  asyncTestCase.waitForAsync('testSelect_ImplicitJoin');

  var jobId = 'jobId' + Math.floor(sampleJobs.length / 2).toString();

  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      db.select().
      from(e, j).
      where(lf.op.and(
          e.jobId.eq(jobId),
          e.jobId.eq(j.id))));


  queryBuilder.exec().then(
      function(results) {
        assertEmployeesForJob(jobId, results);
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case of a SELECT query with an implicit join and with a join
 * predicate that is in reverse order compared to the ordering of tables in the
 * from() clause.
 */
function testSelect_ImplicitJoin_ReverseOrder() {
  asyncTestCase.waitForAsync('testSelect_ImplicitJoin_ReverseOrder');

  var jobId = 'jobId' + Math.floor(sampleJobs.length / 2).toString();

  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      db.select().
      from(j, e).
      where(lf.op.and(
          e.jobId.eq(jobId),
          e.jobId.eq(j.id))));


  queryBuilder.exec().then(
      function(results) {
        assertEmployeesForJob(jobId, results);
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case of a SELECT query with a 3+ table join.
 */
function testSelect_MultiJoin() {
  asyncTestCase.waitForAsync('testSelect_MultiJoin');

  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      db.select().
      from(e, j, d).
      where(lf.op.and(
          e.jobId.eq(j.id),
          e.departmentId.eq(d.id))));

  queryBuilder.exec().then(
      function(results) {
        assertEquals(sampleEmployees.length, results.length);
        results.forEach(function(obj) {
          assertEquals(3, goog.object.getCount(obj));
          assertTrue(goog.isDefAndNotNull(obj[e.getName()]));
          assertTrue(goog.isDefAndNotNull(obj[j.getName()]));
          assertTrue(goog.isDefAndNotNull(obj[d.getName()]));

          var employeeJobId = obj[e.getName()][e.jobId.getName()];
          var employeeDepartmentId = obj[e.getName()][e.departmentId.getName()];
          var jobId = obj[j.getName()][j.id.getName()];
          var departmentId = obj[d.getName()][d.id.getName()];
          assertTrue(employeeJobId == jobId);
          assertTrue(employeeDepartmentId == departmentId);
        });
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests that a SELECT query with an explicit join.
 */
function testSelect_ExplicitJoin() {
  asyncTestCase.waitForAsync('testSelect_ExplicitJoin');

  var minSalaryLimit = 59000;

  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      db.select().
      from(e).
      innerJoin(j, j.id.eq(e.jobId)).
      where(j.minSalary.gt(minSalaryLimit)));

  queryBuilder.exec().then(
      function(results) {
        var expectedJobs = sampleJobs.filter(function(job) {
          return job.getMinSalary() > minSalaryLimit;
        });

        var expectedEmployeeCount = expectedJobs.reduce(
            function(soFar, job) {
              return soFar + mockDataGenerator.employeeGroundTruth.
                  employeesPerJob.get(job.getId()).length;
            }, 0);

        assertEquals(expectedEmployeeCount, results.length);
        results.forEach(function(result) {
          assertTrue(mockDataGenerator.employeeGroundTruth.employeesPerJob.
              containsEntry(
                  result[e.getName()]['jobId'],
                  result[e.getName()]['id']));
        });
        asyncTestCase.continueTesting();
      }, fail);
}


function testSelect_OrderBy_Ascending() {
  asyncTestCase.waitForAsync('testSelect_OrderBy_Ascending');

  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      db.select().from(j).orderBy(j.minSalary, lf.Order.ASC));

  queryBuilder.exec().then(
      function(results) {
        assertOrder(results, j.minSalary, lf.Order.ASC);
        asyncTestCase.continueTesting();
      }, fail);
}


function testSelect_OrderBy_Descending() {
  asyncTestCase.waitForAsync('testSelect_OrderBy_Descending');

  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      db.select().from(j).orderBy(j.minSalary, lf.Order.DESC));

  queryBuilder.exec().then(
      function(results) {
        assertOrder(results, j.minSalary, lf.Order.DESC);
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case where the results are ordered by more than one columns.
 */
function testSelect_OrderBy_Multiple() {
  asyncTestCase.waitForAsync('testSelect_OrderBy_Multiple');

  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      db.select().from(j).
          orderBy(j.maxSalary, lf.Order.DESC).
          orderBy(j.minSalary, lf.Order.ASC));

  queryBuilder.exec().then(
      function(results) {
        assertEquals(results.length, sampleJobs.length);
        assertOrder(results, j.maxSalary, lf.Order.DESC);

        // Assert that within entries that have the same maxSalary, the
        // minSalary appears in ASC order.
        var maxSalaryBuckets = goog.array.bucket(
            results, function(result) { return result.maxSalary; });
        goog.object.forEach(maxSalaryBuckets, function(partialResults) {
          assertOrder(partialResults, j.minSalary, lf.Order.ASC);
        });

        asyncTestCase.continueTesting();
      }, fail);
}


function testSelect_GroupBy() {
  asyncTestCase.waitForAsync('testSelect_GroupBy');

  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      db.select(e.jobId, lf.fn.avg(e.salary), lf.fn.count(e.id)).
      from(e).
      groupBy(e.jobId));

  queryBuilder.exec().then(
      function(results) {
        var expectedResultCount = mockDataGenerator.employeeGroundTruth.
            employeesPerJob.getKeys().length;
        assertEquals(expectedResultCount, results.length);
        results.forEach(function(obj) {
          assertEquals(3, goog.object.getCount(obj));
          assertTrue(goog.isDefAndNotNull(obj[e.jobId.getName()]));
          assertTrue(goog.isDefAndNotNull(
              obj[lf.fn.avg(e.salary).getName()]));

          // Verifying that each group has the correct count of employees.
          var employeesPerJobCount = obj[lf.fn.count(e.id).getName()];
          var expectedEmployeesPerJobCount = mockDataGenerator.
              employeeGroundTruth.employeesPerJob.get(
                  obj[e.jobId.getName()]).length;
          assertEquals(expectedEmployeesPerJobCount, employeesPerJobCount);
        });

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case where a MIN,MAX aggregators are used without being mixed up
 * with non-aggregated columns.
 */
function testSelect_AggregatorsOnly() {
  asyncTestCase.waitForAsync('testSelect_AggregatorsOnly');

  var aggregatedColumn1 = lf.fn.max(j.maxSalary);
  var aggregatedColumn2 = lf.fn.min(j.maxSalary).as('minS');
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      db.select(aggregatedColumn1, aggregatedColumn2).from(j));

  queryBuilder.exec().then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(2, goog.object.getCount(results[0]));
        assertEquals(
            mockDataGenerator.jobGroundTruth.maxMaxSalary,
            results[0][aggregatedColumn1.getName()]);
        assertEquals(
            mockDataGenerator.jobGroundTruth.minMaxSalary,
            results[0][aggregatedColumn2.getAlias()]);

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case where a COUNT and DISTINCT aggregators are combined.
 */
function testSelect_Count_Distinct() {
  asyncTestCase.waitForAsync('testSelect_Count_Distinct');

  var aggregatedColumn = lf.fn.count(lf.fn.distinct(j.maxSalary)).as('NS');
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      db.select(aggregatedColumn).from(j));

  queryBuilder.exec().then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(1, goog.object.getCount(results[0]));
        assertEquals(
            mockDataGenerator.jobGroundTruth.countDistinctMaxSalary,
            results[0][aggregatedColumn.getAlias()]);

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case where a COUNT aggregator is used on an empty table.
 */
function testSelect_Count_Empty() {
  asyncTestCase.waitForAsync('testSelect_Count_Empty');

  var h = db.getSchema().getHoliday();
  var aggregatedColumn = lf.fn.count(h.name);
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      db.select(aggregatedColumn).from(h));

  queryBuilder.exec().then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(1, goog.object.getCount(results[0]));
        assertEquals(0, results[0][aggregatedColumn.getName()]);

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case where a SUM and DISTINCT aggregators are combined.
 */
function testSelect_Sum_Distinct() {
  asyncTestCase.waitForAsync('testSelect_Sum_Distinct');

  var aggregatedColumn = lf.fn.sum(lf.fn.distinct(j.maxSalary));
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      db.select(aggregatedColumn).from(j));

  queryBuilder.exec().then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(1, goog.object.getCount(results[0]));
        assertEquals(
            mockDataGenerator.jobGroundTruth.sumDistinctMaxSalary,
            results[0][aggregatedColumn.getName()]);

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case where a AVG and DISTINCT aggregators are combined.
 */
function testSelect_Avg_Distinct() {
  asyncTestCase.waitForAsync('testSelect_Avg_Distinct');

  var aggregatedColumn = lf.fn.avg(lf.fn.distinct(j.maxSalary));
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      db.select(aggregatedColumn).from(j));

  queryBuilder.exec().then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(1, goog.object.getCount(results[0]));
        assertEquals(
            mockDataGenerator.jobGroundTruth.avgDistinctMaxSalary,
            results[0][aggregatedColumn.getName()]);

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case where a STDDEV and DISTINCT aggregators are combined.
 */
function testSelect_Stddev_Distinct() {
  asyncTestCase.waitForAsync('testSelect_Stddev_Distinct');

  var aggregatedColumn = lf.fn.stddev(lf.fn.distinct(j.maxSalary));
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      db.select(aggregatedColumn).from(j));

  queryBuilder.exec().then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(1, goog.object.getCount(results[0]));
        assertEquals(
            mockDataGenerator.jobGroundTruth.stddevDistinctMaxSalary,
            results[0][aggregatedColumn.getName()]);

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case where a DISTINCT aggregator is used on its own.
 */
function testSelect_Distinct() {
  asyncTestCase.waitForAsync('testSelect_Distinct');

  var aggregatedColumn = lf.fn.distinct(j.maxSalary);
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      db.select(aggregatedColumn).from(j));

  queryBuilder.exec().then(
      function(results) {
        var distinctSalaries = results.map(function(result) {
          return result[aggregatedColumn.getName()];
        });
        assertSameElements(
            mockDataGenerator.jobGroundTruth.distinctMaxSalary,
            distinctSalaries);

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Asserts the ordering of a given list of results.
 * @param {!Array.<!Object>} results The results to be examined.
 * @param {!lf.schema.Column} column The column on which the entries are sorted.
 * @param {!lf.Order} order The expected ordering of the entries.
 */
function assertOrder(results, column, order) {
  var soFar = null;
  results.forEach(function(result, index) {
    var value = result[column.getName()];
    if (index > 0) {
      assertTrue(order == lf.Order.DESC ?
          value <= soFar : value >= soFar);
    }
    soFar = value;
  });
}


/**
 * Asserts that the returned employees for a given job are agreeing with the
 * ground truth data.
 * @param {string} jobId
 * @param {!Array.<{
 *     Employee: !hr.db.row.EmployeeType,
 *     Job: !hr.db.row.JobType}>} actualEmployees
 */
function assertEmployeesForJob(jobId, actualEmployees) {
  var expectedEmployeeIds =
      mockDataGenerator.employeeGroundTruth.employeesPerJob.get(jobId);
  var actualEmployeeIds = actualEmployees.map(function(result) {
    return result[e.getName()]['id'];
  });
  assertSameElements(expectedEmployeeIds, actualEmployeeIds);
}


function testSelect_InnerJoinOrderBy() {
  asyncTestCase.waitForAsync('testJoinOrderBy');
  var expected = sampleEmployees.map(function(row) {
    return row.getLastName();
  }).sort();

  db.select(d.name, e.lastName.as('elname'), e.firstName).
      from(d, e).
      where(e.departmentId.eq(d.id)).
      orderBy(e.lastName).
      exec().then(function(results) {
        var actual = results.map(function(row) {
          return row['elname'];
        });
        assertArrayEquals(expected, actual);
        asyncTestCase.continueTesting();
      });
}


function testSelect_MultipleSelectInTx() {
  asyncTestCase.waitForAsync('testSelect_MultipleSelectInTx');
  var tx = db.createTransaction();
  var q1 = db.select(lf.fn.count(j.id).as('jid')).from(j);
  var q2 = db.select(lf.fn.count(d.id).as('did')).from(d);
  var q3 = db.delete().from(j);
  tx.exec([q1, q2, q3, q1]).then(function(results) {
    assertEquals(4, results.length);
    assertEquals(50, results[0][0]['jid']);
    assertEquals(10, results[1][0]['did']);
    assertEquals(0, results[3][0]['jid']);
    asyncTestCase.continueTesting();
  });
}
