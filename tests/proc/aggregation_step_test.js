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
function checkEquals(expected, value) {
  return expected == value;
}


/**
 * @param {number} expected
 * @param {number} value
 * @return {boolean}
 */
function checkFloatEquals(expected, value) {
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
  return checkCalculation(
      lf.fn.min(j.maxSalary),
      dataGenerator.jobGroundTruth.minMaxSalary,
      checkEquals);
}


function testExec_MinNullableColumn() {
  var data = getEmployeeDatasetWithNulls();
  var inputRelation = lf.proc.Relation.fromRows(
      dataGenerator.sampleEmployees.concat(data), [e.getName()]);
  return checkCalculationForRelation(
      inputRelation, lf.fn.min(e.hireDate),
      dataGenerator.employeeGroundTruth.minHireDate, checkEquals);
}


function testExec_MinEmptyTable() {
  var inputRelation = lf.proc.Relation.fromRows([], [e.getName()]);
  return checkCalculationForRelation(
      inputRelation, lf.fn.min(e.hireDate),
      null, checkEquals);
}


function testExec_Max() {
  return checkCalculation(
      lf.fn.max(j.maxSalary),
      dataGenerator.jobGroundTruth.maxMaxSalary,
      checkEquals);
}


function testExec_MaxNullableColumn() {
  var data = getEmployeeDatasetWithNulls();
  var inputRelation = lf.proc.Relation.fromRows(
      dataGenerator.sampleEmployees.concat(data), [e.getName()]);
  return checkCalculationForRelation(
      inputRelation, lf.fn.max(e.hireDate),
      dataGenerator.employeeGroundTruth.maxHireDate, checkEquals);
}


function testExec_MaxEmptyTable() {
  var inputRelation = lf.proc.Relation.fromRows([], [e.getName()]);
  return checkCalculationForRelation(
      inputRelation, lf.fn.max(e.hireDate),
      null, checkEquals);
}


function testExec_Distinct() {
  return checkCalculation(
      lf.fn.distinct(j.maxSalary),
      dataGenerator.jobGroundTruth.distinctMaxSalary,
      checkEquals);
}


function testExec_DistinctNullableColumn() {
  var data = getEmployeeDatasetWithNulls();
  var expectedHireDates = dataGenerator.employeeGroundTruth.distinctHireDates;
  expectedHireDates.push(null);
  var inputRelation = lf.proc.Relation.fromRows(
      dataGenerator.sampleEmployees.concat(data), [e.getName()]);
  return checkCalculationForRelation(
      inputRelation, lf.fn.distinct(e.hireDate),
      expectedHireDates, checkEquals);
}


/**
 * Count on a distinct column ignores nulls returned from distinct.
 * @return {!IThenable}
 */
function testExec_CountDistinctNullableColumn() {
  var data = getEmployeeDatasetWithNulls();
  var inputRelation = lf.proc.Relation.fromRows(
      dataGenerator.sampleEmployees.concat(data), [e.getName()]);
  return checkCalculationForRelation(
      inputRelation,
      lf.fn.count(lf.fn.distinct(e.hireDate)),
      dataGenerator.employeeGroundTruth.distinctHireDates.length,
      checkEquals);
}


function testExec_Count_Distinct() {
  return checkCalculation(
      lf.fn.count(lf.fn.distinct(j.minSalary)),
      dataGenerator.jobGroundTruth.countDistinctMinSalary,
      checkEquals);
}


function testExec_CountNullableColumn() {
  var data = getEmployeeDatasetWithNulls();
  var inputRelation = lf.proc.Relation.fromRows(
      dataGenerator.sampleEmployees.concat(data), [e.getName()]);
  return checkCalculationForRelation(
      inputRelation, lf.fn.count(e.hireDate),
      dataGenerator.sampleEmployees.length, checkEquals);
}


function testExec_CountStar() {
  var data = getEmployeeDatasetWithNulls();
  var inputRelation = lf.proc.Relation.fromRows(
      dataGenerator.sampleEmployees.concat(data), [e.getName()]);
  return checkCalculationForRelation(
      inputRelation, lf.fn.count(),
      dataGenerator.sampleEmployees.length + data.length, checkEquals);
}


function testExec_Avg_Distinct() {
  return checkCalculation(
      lf.fn.avg(lf.fn.distinct(j.minSalary)),
      dataGenerator.jobGroundTruth.avgDistinctMinSalary,
      checkFloatEquals);
}


/**
 * Tests for average distinct on TableA which has a mix of null and
 * non-null values for the column.
 * @return {!IThenable}
 */
function testExec_AvgDistinctNullableColumn() {
  var tableA = schemaWithNullable.table('TableA');
  var inputRelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableARows, [tableA.getName()]);
  return checkCalculationForRelation(
      inputRelation, lf.fn.avg(lf.fn.distinct(tableA['id'])),
      nullableGenerator.tableAGroundTruth.avgDistinctId, checkFloatEquals);
}


/**
 * Tests for average on TableB which has only null values for the
 * @return {!IThenable}
 * column.
 */
function testExec_Avg_NullRows() {
  var tableB = schemaWithNullable.table('TableB');
  var inputRelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableBRows, [tableB.getName()]);
  return checkCalculationForRelation(
      inputRelation, lf.fn.avg(tableB['id']),
      null, checkEquals);
}


function testExec_Avg_Empty() {
  var inputRelation = lf.proc.Relation.createEmpty();
  return checkCalculationForRelation(
      inputRelation, lf.fn.avg(j.maxSalary),
      null, checkEquals);
}


function testExec_Sum_Distinct() {
  return checkCalculation(
      lf.fn.sum(lf.fn.distinct(j.minSalary)),
      dataGenerator.jobGroundTruth.sumDistinctMinSalary,
      checkEquals);
}


/**
 * Tests for sum distinct on TableA which has a mix of null and
 * @return {!IThenable}
 * non-null values for the column.
 */
function testExec_SumDistinctNullableColumn() {
  var tableA = schemaWithNullable.table('TableA');
  var inputRelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableARows, [tableA.getName()]);
  return checkCalculationForRelation(
      inputRelation, lf.fn.sum(lf.fn.distinct(tableA['id'])),
      nullableGenerator.tableAGroundTruth.sumDistinctId, checkEquals);
}


/**
 * Tests for sum on empty table.
 * @return {!IThenable}
 */
function testExec_SumEmptyTable() {
  var inputRelation = lf.proc.Relation.createEmpty();
  return checkCalculationForRelation(
      inputRelation, lf.fn.sum(j.maxSalary),
      null, checkEquals);
}


/**
 * Tests for sum on TableB which has only null values for the
 * column.
 * @return {!IThenable}
 */
function testExec_Sum_NullRows() {
  var tableB = schemaWithNullable.table('TableB');
  var inputRelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableBRows, [tableB.getName()]);
  return checkCalculationForRelation(
      inputRelation, lf.fn.sum(tableB['id']),
      null, checkEquals);
}


function testExec_Stddev_Distinct() {
  return checkCalculation(
      lf.fn.stddev(lf.fn.distinct(j.minSalary)),
      dataGenerator.jobGroundTruth.stddevDistinctMinSalary,
      checkFloatEquals);
}


/**
 * Tests for Stddev distinct on TableA which has a mix of null and
 * non-null values for the column.
 * @return {!IThenable}
 */
function testExec_StddevDistinctNullableColumn() {
  var tableA = schemaWithNullable.table('TableA');
  var inputRelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableARows, [tableA.getName()]);
  return checkCalculationForRelation(
      inputRelation, lf.fn.stddev(lf.fn.distinct(tableA['id'])),
      nullableGenerator.tableAGroundTruth.stddevDistinctId, checkFloatEquals);
}


/**
 * Tests for Stddev on empty table.
 * @return {!IThenable}
 */
function testExec_StddevEmptyTable() {
  var inputRelation = lf.proc.Relation.createEmpty();
  return checkCalculationForRelation(
      inputRelation, lf.fn.stddev(j.maxSalary),
      null, checkEquals);
}


/**
 * Tests for Stddev on TableB which has only null values for the column.
 * @return {!IThenable}
 */
function testExec_Stddev_NullRows() {
  var tableB = schemaWithNullable.table('TableB');
  var inputRelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableBRows, [tableB.getName()]);
  return checkCalculationForRelation(
      inputRelation, lf.fn.stddev(tableB['id']),
      null, checkEquals);
}


function testExec_Geomean_Distinct() {
  return checkCalculation(
      lf.fn.geomean(lf.fn.distinct(j.maxSalary)),
      dataGenerator.jobGroundTruth.geomeanDistinctMaxSalary,
      checkFloatEquals);
}


function testExec_Geomean_Empty() {
  return checkCalculationForRelation(
      lf.proc.Relation.createEmpty(),
      lf.fn.geomean(j.maxSalary),
      null, checkEquals);
}


/**
 * Tests for geomean distinct on TableA which has a mix of null and
 * non-null values for the column.
 * @return {!IThenable}
 */
function testExec_GeomeanDistinctNullableColumn() {
  var tableA = schemaWithNullable.table('TableA');
  var inputRelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableARows, [tableA.getName()]);
  return checkCalculationForRelation(
      inputRelation, lf.fn.geomean(lf.fn.distinct(tableA['id'])),
      nullableGenerator.tableAGroundTruth.geomeanDistinctId, checkFloatEquals);
}


/**
 * Tests for Geomean on TableB which has only null values for the
 * column.
 * @return {!IThenable}
 */
function testExec_Geomean_NullRows() {
  var tableB = schemaWithNullable.table('TableB');
  var inputRelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableBRows, [tableB.getName()]);
  return checkCalculationForRelation(
      inputRelation, lf.fn.geomean(tableB['id']), null, checkEquals);
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
 * @return {!IThenable}
 */
function testExec_UsesExistingResult() {
  var inputRelation = lf.proc.Relation.fromRows([], [j.getName()]);
  var aggregatedColumn = lf.fn.count();
  var aggregationResult = 100;
  inputRelation.setAggregationResult(aggregatedColumn, aggregationResult);
  var childStep = new lf.proc.NoOpStep([inputRelation]);
  var aggregationStep = new lf.proc.AggregationStep([aggregatedColumn]);
  aggregationStep.addChild(childStep);

  return aggregationStep.exec().then(function(relations) {
    assertEquals(
        aggregationResult,
        relations[0].getAggregationResult(aggregatedColumn));
  });
}
