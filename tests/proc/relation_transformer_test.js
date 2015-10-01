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
goog.require('goog.object');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.Row');
goog.require('lf.eval.Type');
goog.require('lf.fn');
goog.require('lf.pred.JoinPredicate');
goog.require('lf.proc.Relation');
goog.require('lf.proc.RelationEntry');
goog.require('lf.proc.RelationTransformer');
goog.require('lf.testing.hrSchema.EmployeeDataGenerator');
goog.require('lf.testing.hrSchema.JobDataGenerator');


/** @type {!hr.db.schema.Job} */
var j;


/** @type {!hr.db.schema.Employee} */
var e;


/** @type {!Array<!hr.db.row.Job>} */
var sampleJobs;


/** @type {!Array<!hr.db.row.Employee>} */
var sampleEmployees;


function setUp() {
  var schema = hr.db.getSchema();
  j = schema.getJob();
  e = schema.getEmployee();
  generateSampleJobData(schema);
}


/**
 * Generates sample job data.
 * @param {!lf.schema.Database} schema The db schema.
 */
function generateSampleJobData(schema) {
  var jobGenerator =
      new lf.testing.hrSchema.JobDataGenerator(schema);
  var jobCount = 10;
  sampleJobs = jobGenerator.generate(jobCount);

  var employeeGenerator =
      new lf.testing.hrSchema.EmployeeDataGenerator(schema);
  var employeeCount = 2 * jobCount;
  employeeGenerator.setJobCount(jobCount);
  sampleEmployees = employeeGenerator.generate(employeeCount);

  for (var i = 0; i < jobCount; i++) {
    var jobId = sampleJobs[i].getId();
    // Assigning two employees per job.
    sampleEmployees[2 * i].setJobId(jobId);
    sampleEmployees[2 * i + 1].setJobId(jobId);
  }
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


function testGetTransformed_Many() {
  // Creating multiple relations where each relation holds two employees that
  // have the same "jobId" field.
  var relations = [];
  for (var i = 0; i < sampleEmployees.length; i += 2) {
    var relation = lf.proc.Relation.fromRows(
        [sampleEmployees[i], sampleEmployees[i + 1]],
        [e.getName()]);
    relation.setAggregationResult(lf.fn.avg(e.salary), 50);
    relation.setAggregationResult(lf.fn.max(e.salary), 100);
    relation.setAggregationResult(lf.fn.min(e.salary), 0);

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


/**
 * Checks that performing a transformation on a relationship that is *not* the
 * result of a natural join, results in a relation with fields that are
 * populated as expected.
 * @param {!Array<!lf.schema.Column>} columns The columns to be requested.
 * @param {number} expectedResultCount The expected number of results.
 * @return {!lf.proc.Relation} The transformed relation.
 */
function checkTransformationWithoutJoin(columns, expectedResultCount) {
  var transformer = new lf.proc.RelationTransformer(getRelation(), columns);
  var transformedRelation = transformer.getTransformed();

  assertEquals(expectedResultCount, transformedRelation.entries.length);
  assertColumnsPopulated(columns, transformedRelation);

  return transformedRelation;
}


/**
 * Checks that performing a transformation on a relationship that is the result
 * of a natural join, results in a relation with fields that are populated as
 * expected.
 * @param {!Array<!lf.schema.Column>} columns The columns to be requested.
 * @param {number} expectedResultCount The expected number of results.
 * @return {!lf.proc.Relation} The transformed relation.
 */
function checkTransformationWithJoin(columns, expectedResultCount) {
  var transformer = new lf.proc.RelationTransformer(
      getJoinedRelation(), columns);
  var transformedRelation = transformer.getTransformed();

  assertEquals(expectedResultCount, transformedRelation.entries.length);
  assertColumnsPopulated(columns, transformedRelation);

  return transformedRelation;
}


/**
 * Asserts that all requested columns are populated in the given relation's
 * entries.
 * @param {!Array<!lf.schema.Column>} columns
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
 * Generates a dummy relation, with bogus aggregation results to be used for
 * tesing.
 * @return {!lf.proc.Relation}
 */
function getRelation() {
  var relation = lf.proc.Relation.fromRows(sampleJobs, [j.getName()]);

  // Filling in dummy aggregation results. In a normal scenario those have been
  // calculated before ProjectStep executes.
  relation.setAggregationResult(lf.fn.avg(j.maxSalary), 50);
  relation.setAggregationResult(lf.fn.max(j.maxSalary), 100);
  relation.setAggregationResult(lf.fn.min(j.maxSalary), 0);

  var entry1 = new lf.proc.RelationEntry(
      new lf.Row(1, {'maxSalary': 1000}), false);
  var entry2 = new lf.proc.RelationEntry(
      new lf.Row(1, {'maxSalary': 2000}), false);
  var distinctRelation = new lf.proc.Relation([entry1, entry2], [j.getName()]);
  relation.setAggregationResult(lf.fn.distinct(j.maxSalary), distinctRelation);
  return relation;
}


/**
 * Generates a dummy joined relation, with bogus aggregation results to be used
 * for tesing.
 * @return {!lf.proc.Relation}
 */
function getJoinedRelation() {
  var relationLeft = lf.proc.Relation.fromRows(sampleEmployees, [e.getName()]);
  var relationRight = lf.proc.Relation.fromRows(sampleJobs, [j.getName()]);
  var joinPredicate = new lf.pred.JoinPredicate(
      e.jobId, j.id, lf.eval.Type.EQ);
  var joinedRelation = joinPredicate.evalRelationsHashJoin(
      relationLeft, relationRight, false);

  joinedRelation.setAggregationResult(lf.fn.avg(j.maxSalary), 50);
  joinedRelation.setAggregationResult(lf.fn.max(j.maxSalary), 100);
  joinedRelation.setAggregationResult(lf.fn.min(j.maxSalary), 0);
  joinedRelation.setAggregationResult(lf.fn.min(e.hireDate), 0);
  joinedRelation.setAggregationResult(lf.fn.max(e.hireDate), 0);

  var entry1 = new lf.proc.RelationEntry(
      new lf.Row(1, {'maxSalary': 1000}), false);
  var entry2 = new lf.proc.RelationEntry(
      new lf.Row(1, {'maxSalary': 2000}), false);
  var distinctRelation = new lf.proc.Relation([entry1, entry2], [j.getName()]);
  joinedRelation.setAggregationResult(
      lf.fn.distinct(j.maxSalary), distinctRelation);

  return joinedRelation;
}
