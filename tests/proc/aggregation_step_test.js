/**
 * @license
 * Copyright 2015 The Lovefield Project Authors. All Rights Reserved.
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
goog.require('goog.math');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.eval.Type');
goog.require('lf.fn');
goog.require('lf.pred.JoinPredicate');
goog.require('lf.proc.AggregationStep');
goog.require('lf.proc.NoOpStep');
goog.require('lf.proc.Relation');
goog.require('lf.testing.NullableDataGenerator');
goog.require('lf.testing.hrSchema.MockDataGenerator');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'AggregationStepTest');


/** @type {!hr.db.schema.Employee} */
var e;


/** @type {!hr.db.schema.Job} */
var j;


/**
 * This schema has custom tables that can have nullable columns.
 * @type {!lf.schema.Database}
 */
var schemaWithNullable;


/** @type {!lf.testing.hrSchema.MockDataGenerator} */
var dataGenerator;


/** @type {!lf.testing.NullableDataGenerator} */
var nullableGenerator;


/**
 * @param {number|string|!Date} expected
 * @param {number|string|!Date} value
 * @return {boolean}
 */
function testEquals(expected, value) {
  return expected == value;
}


/**
 * @param {number} expected
 * @param {number} value
 * @return {boolean}
 */
function testFloatEquals(expected, value) {
  // The precision to use when comparing floating point numbers.
  var epsilon = Math.pow(10, -9);
  return goog.math.nearlyEquals(expected, value, epsilon);
}


function setUp() {
  var schema = hr.db.getSchema();
  j = schema.getJob();
  e = schema.getEmployee();
  dataGenerator = new lf.testing.hrSchema.MockDataGenerator(schema);
  dataGenerator.generate(20, 100, 0);

  // For the tests involving nullable integer columns, a different schema
  // is created. The tables in hr schema do not handle nullable integer
  // column.
  var schemaBuilder = lf.testing.NullableDataGenerator.getSchemaBuilder();
  schemaWithNullable = schemaBuilder.getSchema();
  nullableGenerator = new
      lf.testing.NullableDataGenerator(schemaWithNullable);
  nullableGenerator.generate();
}


/**
 * Creates two news rows with null hireDate and adds to the sample employees.
 * @return {!Array<!lf.Row>}
 */
function getEmployeeDatasetWithNulls() {
  var data = [];
  var employee = hr.db.getSchema().table('Employee');
  var startId = dataGenerator.sampleEmployees.length;
  for (var i = startId; i < startId + 2; i++) {
    var employeeRow = employee.createRow();
    employeeRow.setId('employeeId' + i.toString());
    employeeRow.setHireDate(null);
    data.push(employeeRow);
  }
  return data;
}

function testExec_Min() {
  asyncTestCase.waitForAsync('testExec_Min');
  checkCalculation(
      lf.fn.min(j.maxSalary),
      dataGenerator.jobGroundTruth.minMaxSalary,
      testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


function testExec_MinNullableColumn() {
  var data = getEmployeeDatasetWithNulls();
  asyncTestCase.waitForAsync('testExec_MinNullableColumn');
  var inputRelation = lf.proc.Relation.fromRows(
      dataGenerator.sampleEmployees.concat(data), [e.getName()]);
  checkCalculationForRelation(
      inputRelation, lf.fn.min(e.hireDate),
      dataGenerator.employeeGroundTruth.minHireDate, testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


function testExec_MinEmptyTable() {
  asyncTestCase.waitForAsync('testExec_MinEmptyTable');
  var inputRelation = lf.proc.Relation.fromRows([], [e.getName()]);
  checkCalculationForRelation(
      inputRelation, lf.fn.min(e.hireDate),
      null, testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


function testExec_Max() {
  asyncTestCase.waitForAsync('testExec_Max');
  checkCalculation(
      lf.fn.max(j.maxSalary),
      dataGenerator.jobGroundTruth.maxMaxSalary,
      testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


function testExec_MaxNullableColumn() {
  var data = getEmployeeDatasetWithNulls();
  asyncTestCase.waitForAsync('testExec_MaxNullableColumn');
  var inputRelation = lf.proc.Relation.fromRows(
      dataGenerator.sampleEmployees.concat(data), [e.getName()]);
  checkCalculationForRelation(
      inputRelation, lf.fn.max(e.hireDate),
      dataGenerator.employeeGroundTruth.maxHireDate, testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


function testExec_MaxEmptyTable() {
  asyncTestCase.waitForAsync('testExec_MaxEmptyTable');
  var inputRelation = lf.proc.Relation.fromRows([], [e.getName()]);
  checkCalculationForRelation(
      inputRelation, lf.fn.max(e.hireDate),
      null, testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


function testExec_Distinct() {
  asyncTestCase.waitForAsync('testExec_Distinct');
  checkCalculation(
      lf.fn.distinct(j.maxSalary),
      dataGenerator.jobGroundTruth.distinctMaxSalary,
      testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


function testExec_DistinctNullableColumn() {
  var data = getEmployeeDatasetWithNulls();
  asyncTestCase.waitForAsync('testExec_DistinctNullableColumn');
  var expectedHireDates = dataGenerator.employeeGroundTruth.distinctHireDates;
  expectedHireDates.push(null);
  var inputRelation = lf.proc.Relation.fromRows(
      dataGenerator.sampleEmployees.concat(data), [e.getName()]);
  checkCalculationForRelation(
      inputRelation, lf.fn.distinct(e.hireDate),
      expectedHireDates, testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


/**
 * Count on a distinct column ignores nulls returned from distinct.
 */
function testExec_CountDistinctNullableColumn() {
  asyncTestCase.waitForAsync('testExec_CountDistinctNullableColumn');
  var data = getEmployeeDatasetWithNulls();
  var inputRelation = lf.proc.Relation.fromRows(
      dataGenerator.sampleEmployees.concat(data), [e.getName()]);
  checkCalculationForRelation(
      inputRelation,
      lf.fn.count(lf.fn.distinct(e.hireDate)),
      dataGenerator.employeeGroundTruth.distinctHireDates.length,
      testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


function testExec_Count_Distinct() {
  asyncTestCase.waitForAsync('testExec_Count_Distinct');
  checkCalculation(
      lf.fn.count(lf.fn.distinct(j.minSalary)),
      dataGenerator.jobGroundTruth.countDistinctMinSalary,
      testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


function testExec_CountNullableColumn() {
  asyncTestCase.waitForAsync('testExec_CountNullableColumn');
  var data = getEmployeeDatasetWithNulls();
  var inputRelation = lf.proc.Relation.fromRows(
      dataGenerator.sampleEmployees.concat(data), [e.getName()]);
  checkCalculationForRelation(
      inputRelation, lf.fn.count(e.hireDate),
      dataGenerator.sampleEmployees.length, testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


function testExec_CountStar() {
  asyncTestCase.waitForAsync('testExec_CountStar');
  var data = getEmployeeDatasetWithNulls();
  var inputRelation = lf.proc.Relation.fromRows(
      dataGenerator.sampleEmployees.concat(data), [e.getName()]);
  checkCalculationForRelation(
      inputRelation, lf.fn.count(),
      dataGenerator.sampleEmployees.length + data.length, testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


function testExec_Avg_Distinct() {
  asyncTestCase.waitForAsync('testExec_Avg_Distinct');
  checkCalculation(
      lf.fn.avg(lf.fn.distinct(j.minSalary)),
      dataGenerator.jobGroundTruth.avgDistinctMinSalary,
      testFloatEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


/**
 * Tests for average distinct on TableA which has a mix of null and
 * non-null values for the column.
 */
function testExec_AvgDistinctNullableColumn() {
  asyncTestCase.waitForAsync('testExec_AvgDistinctNullableColumn');
  var tableA = schemaWithNullable.table('TableA');
  var inputRelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableARows, [tableA.getName()]);
  checkCalculationForRelation(
      inputRelation, lf.fn.avg(lf.fn.distinct(tableA['id'])),
      nullableGenerator.tableAGroundTruth.avgDistinctId, testFloatEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


/**
 * Tests for average on TableB which has only null values for the
 * column.
 */
function testExec_Avg_NullRows() {
  asyncTestCase.waitForAsync('testExec_Avg_NullRows');
  var tableB = schemaWithNullable.table('TableB');
  var inputRelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableBRows, [tableB.getName()]);
  checkCalculationForRelation(
      inputRelation, lf.fn.avg(tableB['id']),
      null, testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


function testExec_Avg_Empty() {
  asyncTestCase.waitForAsync('testExec_Avg_Empty');
  var inputRelation = lf.proc.Relation.createEmpty();
  checkCalculationForRelation(
      inputRelation, lf.fn.avg(j.maxSalary),
      null, testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


function testExec_Sum_Distinct() {
  asyncTestCase.waitForAsync('testExec_Sum_Distinct');
  checkCalculation(
      lf.fn.sum(lf.fn.distinct(j.minSalary)),
      dataGenerator.jobGroundTruth.sumDistinctMinSalary,
      testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


/**
 * Tests for sum distinct on TableA which has a mix of null and
 * non-null values for the column.
 */
function testExec_SumDistinctNullableColumn() {
  asyncTestCase.waitForAsync('testExec_SumDistinctNullableColumn');
  var tableA = schemaWithNullable.table('TableA');
  var inputRelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableARows, [tableA.getName()]);
  checkCalculationForRelation(
      inputRelation, lf.fn.sum(lf.fn.distinct(tableA['id'])),
      nullableGenerator.tableAGroundTruth.sumDistinctId, testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


/**
 * Tests for sum on empty table.
 */
function testExec_SumEmptyTable() {
  asyncTestCase.waitForAsync('testExec_SumEmptyTable');
  var inputRelation = lf.proc.Relation.createEmpty();
  checkCalculationForRelation(
      inputRelation, lf.fn.sum(j.maxSalary),
      null, testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


/**
 * Tests for sum on TableB which has only null values for the
 * column.
 */
function testExec_Sum_NullRows() {
  asyncTestCase.waitForAsync('testExec_Sum_NullRows');
  var tableB = schemaWithNullable.table('TableB');
  var inputRelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableBRows, [tableB.getName()]);
  checkCalculationForRelation(
      inputRelation, lf.fn.sum(tableB['id']),
      null, testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


function testExec_Stddev_Distinct() {
  asyncTestCase.waitForAsync('testExec_Stddev_Distinct');
  checkCalculation(
      lf.fn.stddev(lf.fn.distinct(j.minSalary)),
      dataGenerator.jobGroundTruth.stddevDistinctMinSalary,
      testFloatEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


/**
 * Tests for Stddev distinct on TableA which has a mix of null and
 * non-null values for the column.
 */
function testExec_StddevDistinctNullableColumn() {
  asyncTestCase.waitForAsync('testExec_StddevDistinctNullableColumn');
  var tableA = schemaWithNullable.table('TableA');
  var inputRelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableARows, [tableA.getName()]);
  checkCalculationForRelation(
      inputRelation, lf.fn.stddev(lf.fn.distinct(tableA['id'])),
      nullableGenerator.tableAGroundTruth.stddevDistinctId, testFloatEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


/**
 * Tests for Stddev on empty table.
 */
function testExec_StddevEmptyTable() {
  asyncTestCase.waitForAsync('testExec_StddevEmptyTable');
  var inputRelation = lf.proc.Relation.createEmpty();
  checkCalculationForRelation(
      inputRelation, lf.fn.stddev(j.maxSalary),
      null, testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


/**
 * Tests for Stddev on TableB which has only null values for the column.
 */
function testExec_Stddev_NullRows() {
  asyncTestCase.waitForAsync('testExec_Stddev_NullRows');
  var tableB = schemaWithNullable.table('TableB');
  var inputRelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableBRows, [tableB.getName()]);
  checkCalculationForRelation(
      inputRelation, lf.fn.stddev(tableB['id']),
      null, testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


function testExec_Geomean_Distinct() {
  asyncTestCase.waitForAsync('testExec_Geomean_Distinct');
  checkCalculation(
      lf.fn.geomean(lf.fn.distinct(j.maxSalary)),
      dataGenerator.jobGroundTruth.geomeanDistinctMaxSalary,
      testFloatEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


function testExec_Geomean_Empty() {
  asyncTestCase.waitForAsync('testExec_Geomean_Empty');
  var inputRelation = lf.proc.Relation.createEmpty();
  checkCalculationForRelation(
      inputRelation, lf.fn.geomean(j.maxSalary),
      null, testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


/**
 * Tests for geomean distinct on TableA which has a mix of null and
 * non-null values for the column.
 */
function testExec_GeomeanDistinctNullableColumn() {
  asyncTestCase.waitForAsync('testExec_GeomeanDistinctNullableColumn');
  var tableA = schemaWithNullable.table('TableA');
  var inputRelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableARows, [tableA.getName()]);
  checkCalculationForRelation(
      inputRelation, lf.fn.geomean(lf.fn.distinct(tableA['id'])),
      nullableGenerator.tableAGroundTruth.geomeanDistinctId, testFloatEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


/**
 * Tests for Geomean on TableB which has only null values for the
 * column.
 */
function testExec_Geomean_NullRows() {
  asyncTestCase.waitForAsync('testExec_Geomean_NullRows');
  var tableB = schemaWithNullable.table('TableB');
  var inputRelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableBRows, [tableB.getName()]);
  checkCalculationForRelation(
      inputRelation,
      lf.fn.geomean(tableB['id']),
      null, testEquals).
      then(asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}


/**
 * @param {!lf.schema.Column} aggregatedColumn The column to be calculated.
 * @param {number|!Array<number>} expectedValue The expected value for the
 *     aggregated column.
 * @param {!Function} assertFn
 * @return {!IThenable}
 */
function checkCalculation(aggregatedColumn, expectedValue, assertFn) {
  return goog.Promise.all([
    checkCalculationWithoutJoin(aggregatedColumn, expectedValue, assertFn),
    checkCalculationWithJoin(aggregatedColumn, expectedValue, assertFn)
  ]);
}


/**
 * Checks that performing a transformation on a relationship that is *not* the
 * result of a natural join, results in a relation with fields that are
 * populated as expected.
 * @param {!lf.schema.Column} aggregatedColumn The column to be calculated.
 * @param {number|!Array<number>} expectedValue The expected value for the
 *     aggregated column.
 * @param {!Function} assertFn
 * @return {!IThenable}
 */
function checkCalculationWithoutJoin(
    aggregatedColumn, expectedValue, assertFn) {
  var inputRelation = lf.proc.Relation.fromRows(
      dataGenerator.sampleJobs, [j.getName()]);
  return checkCalculationForRelation(
      inputRelation, aggregatedColumn, expectedValue, assertFn);
}


/**
 * Checks that performing a transformation on a relationship that is the
 * result of a natural join, results in a relation with fields that are
 * populated as expected.
 * @param {!lf.schema.Column} aggregatedColumn The column to be calculated.
 * @param {number|!Array<number>} expectedValue The expected value for the
 *     aggregated column.
 * @param {!Function} assertFn
 * @return {!IThenable}
 */
function checkCalculationWithJoin(aggregatedColumn, expectedValue, assertFn) {
  var relationLeft = lf.proc.Relation.fromRows(
      dataGenerator.sampleEmployees, [e.getName()]);
  var relationRight = lf.proc.Relation.fromRows(
      dataGenerator.sampleJobs, [j.getName()]);
  var joinPredicate = new lf.pred.JoinPredicate(
      e.jobId, j.id, lf.eval.Type.EQ);
  var joinedRelation = joinPredicate.evalRelationsHashJoin(
      relationLeft, relationRight, false);
  return checkCalculationForRelation(
      joinedRelation, aggregatedColumn, expectedValue, assertFn);
}


/**
 * @param {!lf.proc.Relation} inputRelation
 * @param {!lf.schema.Column} aggregatedColumn The column to be calculated.
 * @param {?number|!Array|Date} expectedValue The expected value for the
 *     aggregated column.
 * @param {!Function} assertFn
 * @return {!IThenable}
 */
function checkCalculationForRelation(
    inputRelation, aggregatedColumn, expectedValue, assertFn) {
  var childStep = new lf.proc.NoOpStep([inputRelation]);
  var aggregationStep = new lf.proc.AggregationStep([aggregatedColumn]);
  aggregationStep.addChild(childStep);

  return aggregationStep.exec().then(function(relations) {
    var relation = relations[0];
    if (expectedValue instanceof Array) {
      assertEquals(
          expectedValue.length,
          relation.getAggregationResult(aggregatedColumn).entries.length);
    } else {
      assertTrue(assertFn(
          expectedValue,
          relation.getAggregationResult(aggregatedColumn)));
    }
  });
}


/**
 * Tests that AggregationStep is using existing aggregation result
 * (pre-calculated by previous steps).
 */
function testExec_UsesExistingResult() {
  asyncTestCase.waitForAsync('testExec_UsesExistingResult');

  var inputRelation = lf.proc.Relation.fromRows([], [j.getName()]);
  var aggregatedColumn = lf.fn.count();
  var aggregationResult = 100;
  inputRelation.setAggregationResult(aggregatedColumn, aggregationResult);
  var childStep = new lf.proc.NoOpStep([inputRelation]);
  var aggregationStep = new lf.proc.AggregationStep([aggregatedColumn]);
  aggregationStep.addChild(childStep);

  aggregationStep.exec().then(function(relations) {
    assertEquals(
        aggregationResult,
        relations[0].getAggregationResult(aggregatedColumn));
    asyncTestCase.continueTesting();
  }, fail);
}
