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
goog.require('goog.math');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.eval.Type');
goog.require('lf.fn');
goog.require('lf.pred.JoinPredicate');
goog.require('lf.proc.Relation');
goog.require('lf.proc.RelationTransformer');
goog.require('lf.testing.hrSchema.EmployeeDataGenerator');
goog.require('lf.testing.hrSchema.JobDataGenerator');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'RelationTransformerTest');


/** @type {!hr.db.schema.Job} */
var j;


/** @type {!hr.db.schema.Employee} */
var e;


/** @type {!Array.<!hr.db.row.Job>} */
var sampleJobs;


/** @type {!Array.<!hr.db.row.Employee>} */
var sampleEmployees;


/** @type {{
 *      minMaxSalary: number,
 *      maxMaxSalary: number}}
 */
var groundTruth;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.getInstance(
      /* opt_onUpgrade */ undefined,
      /* opt_volatile */ true).then(function(db) {
    j = db.getSchema().getJob();
    e = db.getSchema().getEmployee();
    generateSampleJobData(db);
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Generates sample job data.
 * @param {!lf.Database} db The db connection.
 */
function generateSampleJobData(db) {
  var schema = /** @type {!hr.db.schema.Database} */ (db.getSchema());
  var jobGenerator =
      new lf.testing.hrSchema.JobDataGenerator(schema);
  var jobCount = 10;
  sampleJobs = jobGenerator.generate(jobCount);

  // Set the maxSalary to only two possible values. This is necessary for the
  // testSelect_OrderBy_Multiple test below.
  var minMaxSalary = 3000;
  sampleJobs.slice(0, Math.floor(sampleJobs.length / 2)).forEach(
      function(job) {
        job.setMaxSalary(minMaxSalary);
      });

  var maxMaxSalary = 4000;
  sampleJobs.slice(Math.ceil(sampleJobs.length / 2)).forEach(
      function(job) {
        job.setMaxSalary(maxMaxSalary);
      });

  var employeeGenerator =
      new lf.testing.hrSchema.EmployeeDataGenerator(schema);
  var employeeCount = 2 * jobCount;
  sampleEmployees = employeeGenerator.generate(employeeCount);

  for (var i = 0; i < jobCount; i++) {
    var jobId = sampleJobs[i].getId();
    // Assigning two employees per job.
    sampleEmployees[2 * i].setJobId(jobId);
    sampleEmployees[2 * i + 1].setJobId(jobId);
  }

  groundTruth = {
    minMaxSalary: minMaxSalary,
    maxMaxSalary: maxMaxSalary
  };
}


/** Tests the case where no columns are requested. */
function testGetTransformed_NoColumns() {
  var relation = lf.proc.Relation.fromRows(sampleJobs, [j.getName()]);
  var transformer = new lf.proc.RelationTransformer(relation, []);
  var transformedRelation = transformer.getTransformed();
  transformedRelation.entries.forEach(
      function(entry) {
        assertTrue(goog.object.isEmpty(entry.row.payload()));
      });
}


/**
 * Tests the case where all requested columns are simple (non-aggregated).
 */
function testGetTransformed_SimpleColumnsOnly() {
  var columns = [j.title, j.minSalary];
  checkTransformationWithoutJoin(columns, sampleJobs.length);
}


/**
 * Tests the case where all requested columns are aggregated.
 */
function testGetTransformed_AggregatedColumnsOnly() {
  var columns = [lf.fn.min(j.maxSalary), lf.fn.max(j.maxSalary)];
  checkTransformationWithoutJoin(columns, 1);
}


/**
 * Tests the case where both simple and aggregated columns are requested.
 */
function testGetTransformed_MixedColumns() {
  var columns = [j.title, j.maxSalary, lf.fn.avg(j.maxSalary)];
  checkTransformationWithoutJoin(columns, 1);
}


/**
 * Tests the case where a single DISTINCT column is requested.
 */
function testGetTransformed_DistinctOnly() {
  var columns = [lf.fn.distinct(j.maxSalary)];
  checkTransformationWithoutJoin(columns, 2);
}


/**
 * Tests the case where a single COUNT(DISTINCT) column is requested.
 */
function testGetTransformed_NestedAggregations() {
  var columns = [lf.fn.count(lf.fn.distinct(j.maxSalary))];
  checkTransformationWithoutJoin(columns, 1);
}


function testGetTransformed_SimpleColumnsOnly_Join() {
  var columns = [e.email, e.hireDate, j.title];
  checkTransformationWithJoin(columns, sampleEmployees.length);
}


function testGetTransformed_AggregatedColumnsOnly_Join() {
  var columns = [
    lf.fn.min(e.hireDate), lf.fn.max(e.hireDate),
    lf.fn.min(j.maxSalary), lf.fn.max(j.maxSalary)
  ];
  checkTransformationWithJoin(columns, 1);
}


function testGetTransformed_MixedColumns_Join() {
  var columns = [
    j.title, j.maxSalary, lf.fn.min(j.maxSalary),
    e.email, e.hireDate, lf.fn.min(e.hireDate)
  ];
  checkTransformationWithJoin(columns, 1);
}


function testGetTransformed_DistinctOnly_Join() {
  var columns = [lf.fn.distinct(j.maxSalary)];
  checkTransformationWithJoin(columns, 2);
}


function testGetTransformed_NestedAggregations_Join() {
  var columns = [lf.fn.count(lf.fn.distinct(j.maxSalary))];
  checkTransformationWithJoin(columns, 1);
}


function testGetTransformed_Many() {
  // Creating multiple relations where each relation holds two employees that
  // have the same "jobId" field.
  var relations = [];
  for (var i = 0; i < sampleEmployees.length; i += 2) {
    var relation = lf.proc.Relation.fromRows(
        [sampleEmployees[i], sampleEmployees[i + 1]],
        [e.getName()]);
    relations.push(relation);
  }

  var columns = [
    e.jobId,
    lf.fn.min(e.salary),
    lf.fn.max(e.salary),
    lf.fn.avg(e.salary)
  ];

  var transformedRelation = lf.proc.RelationTransformer.transformMany(
      relations, columns);
  assertEquals(relations.length, transformedRelation.entries.length);
  assertColumnsPopulated(columns, transformedRelation);
}


function testGetTransformed_Min() {
  checkTransformationAggregateOnly(
      lf.fn.min(j.maxSalary), groundTruth.minMaxSalary);
}


function testGetTransformed_Max() {
  checkTransformationAggregateOnly(
      lf.fn.max(j.maxSalary), groundTruth.maxMaxSalary);
}


function testGetTransformed_Avg() {
  checkTransformationAggregateOnly(
      lf.fn.avg(lf.fn.distinct(j.maxSalary)),
      (groundTruth.maxMaxSalary + groundTruth.minMaxSalary) / 2);
}


function testGetTransformed_Sum() {
  checkTransformationAggregateOnly(
      lf.fn.sum(lf.fn.distinct(j.maxSalary)),
      groundTruth.maxMaxSalary + groundTruth.minMaxSalary);
}


function testGetTransformed_Stddev() {
  var expectedStddev = goog.math.standardDeviation(
      groundTruth.minMaxSalary, groundTruth.maxMaxSalary);

  checkTransformationAggregateOnly(
      lf.fn.stddev(lf.fn.distinct(j.maxSalary)), expectedStddev);
}


/**
 * Checks that performing a transformation on a relationship that is *not* the
 * result of a natural join, results in a relation with fields that are
 * populated as expected.
 * @param {!Array.<!lf.schema.Column>} columns The columns to be requested.
 * @param {number} expectedResultCount The expected number of results.
 * @return {!lf.proc.Relation} The transformed relation.
 */
function checkTransformationWithoutJoin(columns, expectedResultCount) {
  var relation = lf.proc.Relation.fromRows(sampleJobs, [j.getName()]);
  var transformer = new lf.proc.RelationTransformer(
      relation, columns);
  var transformedRelation = transformer.getTransformed();

  assertEquals(expectedResultCount, transformedRelation.entries.length);
  assertColumnsPopulated(columns, transformedRelation);

  return transformedRelation;
}


/**
 * Checks that performing a transformation on a relationship that is the result
 * of a natural join, results in a relation with fields that are populated as
 * expected.
 * @param {!Array.<!lf.schema.Column>} columns The columns to be requested.
 * @param {number} expectedResultCount The expected number of results.
 * @return {!lf.proc.Relation} The transformed relation.
 */
function checkTransformationWithJoin(columns, expectedResultCount) {
  // Using a natural join between Employee and Job.
  var relationLeft = lf.proc.Relation.fromRows(sampleEmployees, [e.getName()]);
  var relationRight = lf.proc.Relation.fromRows(sampleJobs, [j.getName()]);
  var joinPredicate = new lf.pred.JoinPredicate(
      e.jobId, j.id, lf.eval.Type.EQ);
  var joinedRelation = joinPredicate.evalRelations(relationLeft, relationRight);

  var transformer = new lf.proc.RelationTransformer(joinedRelation, columns);
  var transformedRelation = transformer.getTransformed();

  assertEquals(expectedResultCount, transformedRelation.entries.length);
  assertColumnsPopulated(columns, transformedRelation);

  return transformedRelation;
}


/**
 * Asserts that all requested columns are populated in the given relation's
 * entries.
 * @param {!Array.<!lf.schema.Column>} columns
 * @param {!lf.proc.Relation} relation The relation to be checked.
 */
function assertColumnsPopulated(columns, relation) {
  relation.entries.forEach(
      function(entry, index) {
        columns.forEach(function(column) {
          // Checking that all requested columns are populated.
          assertTrue(goog.isDefAndNotNull(entry.getField(column)));
        });
      });
}


/**
 * Checks that the given aggregation is calculated and reported back as
 * expected, for both the case where a join exists and for the case where no
 * join exists.
 * @param {!lf.schema.Column} column The aggregated column.
 * @param {number} expectedValue The expected value.
 */
function checkTransformationAggregateOnly(column, expectedValue) {
  var transformedRelation = checkTransformationWithoutJoin(
      [column], 1);
  assertEquals(expectedValue, transformedRelation.entries[0].getField(column));

  transformedRelation = checkTransformationWithJoin([column], 1);
  assertEquals(expectedValue, transformedRelation.entries[0].getField(column));
}
