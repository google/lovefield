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
goog.require('lf.Row');
goog.require('lf.proc.Relation');
goog.require('lf.testing.hrSchemaSampleData');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'JoinPredicate');


/** @type {!hr.db.Database} */
var db;


/** @type {!hr.db.schema.Employee} */
var e;


/** @type {!hr.db.schema.Job} */
var j;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.getInstance(
      undefined, /* opt_volatile */ true).then(function(database) {
    db = database;
    e = db.getSchema().getEmployee();
    j = db.getSchema().getJob();
    asyncTestCase.continueTesting();
  }, fail);
}


function testJoinPredicate_EvalRow_True() {
  var combinedRow = lf.Row.combineRows(
      lf.testing.hrSchemaSampleData.generateSampleEmployeeData(),
      e.getName(),
      lf.testing.hrSchemaSampleData.generateSampleJobData(),
      j.getName());

  var joinPredicate1 = e.jobId.eq(j.id);
  assertTrue(joinPredicate1.evalRow(combinedRow));

  var joinPredicate2 = j.id.eq(e.jobId);
  assertTrue(joinPredicate2.evalRow(combinedRow));
}


function testJoinPredicate_EvalRow_False() {
  var combinedRow = lf.Row.combineRows(
      lf.testing.hrSchemaSampleData.generateSampleEmployeeData(),
      e.getName(),
      lf.testing.hrSchemaSampleData.generateSampleJobData(),
      j.getName());

  var joinPredicate = e.firstName.eq(j.id);
  assertFalse(joinPredicate.evalRow(combinedRow));
}


/**
 * Tests that evalRelations() will detect which input relation should be used as
 * "left" and which as "right" independently of the input order.
 */
function testJoinPredicate_EvalRelations() {
  var sampleEmployee =
      lf.testing.hrSchemaSampleData.generateSampleEmployeeData();
  var sampleJob =
      lf.testing.hrSchemaSampleData.generateSampleJobData();

  var employeeRelation = lf.proc.Relation.fromRows(
      [sampleEmployee], [e.getName()]);
  var jobRelation = lf.proc.Relation.fromRows([sampleJob], [j.getName()]);

  var joinPredicate = e.jobId.eq(j.id);
  var result1 = joinPredicate.evalRelations(employeeRelation, jobRelation);
  var result2 = joinPredicate.evalRelations(jobRelation, employeeRelation);

  assertEquals(1, result1.entries.length);
  assertEquals(1, result2.entries.length);
  assertEquals(
      sampleEmployee.payload().id,
      result1.entries[0].row.payload()[e.getName()]['id']);
  assertEquals(
      sampleEmployee.payload().id,
      result2.entries[0].row.payload()[e.getName()]['id']);
  assertEquals(
      sampleJob.payload().id,
      result1.entries[0].row.payload()[j.getName()]['id']);
  assertEquals(
      sampleJob.payload().id,
      result2.entries[0].row.payload()[j.getName()]['id']);
}


/** @suppress {accessControls} */
function testJoinPredicate_EvalRelations_HashJoin() {
  checkEvalRelations_UniqueKeys(
      lf.pred.JoinPredicate.prototype.evalRelationsHashJoin_);
  checkEvalRelations_NonUniqueKeys(
      lf.pred.JoinPredicate.prototype.evalRelationsHashJoin_);
}


/** @suppress {accessControls} */
function testJoinPredicate_EvalRelations_NestedLoopJoin() {
  checkEvalRelations_UniqueKeys(
      lf.pred.JoinPredicate.prototype.evalRelationsNestedLoopJoin_);
  checkEvalRelations_NonUniqueKeys(
      lf.pred.JoinPredicate.prototype.evalRelationsNestedLoopJoin_);
}


/**
 * Checks that the given join implementation is correct, for the case where the
 * join predicate refers to unique keys.
 * @param {!function(!lf.proc.Relation, !lf.proc.Relation):!lf.proc.Relation}
 *     evalFn The join implementation method. Should be either
 *     evalRelationsNestedLoopJoin_ or evalRelationsHashJoin_.
 */
function checkEvalRelations_UniqueKeys(evalFn) {
  var sampleRows = getSampleRows();

  var leftRelation = lf.proc.Relation.fromRows(
      sampleRows.employees, [e.getName()]);
  var rightRelation = lf.proc.Relation.fromRows(
      sampleRows.jobs, [j.getName()]);

  var joinPredicate1 = e.jobId.eq(j.id);
  var result = evalFn.call(joinPredicate1, leftRelation, rightRelation);
  assertEquals(sampleRows.employees.length, result.entries.length);

  // Expecting only 5 result entries, since there are only 5 employees that have
  // the same ID with a job.
  var joinPredicate2 = e.id.eq(j.id);
  result = evalFn.call(joinPredicate2, leftRelation, rightRelation);
  assertEquals(sampleRows.jobs.length, result.entries.length);
}


/**
 * Checks that the given join implementation is correct, for the case where the
 * join predicate refers to non-unique keys.
 * @param {!function(!lf.proc.Relation, !lf.proc.Relation):!lf.proc.Relation}
 *     evalFn The join implementation method. Should be either
 *     evalRelationsNestedLoopJoin_ or evalRelationsHashJoin_.
 */
function checkEvalRelations_NonUniqueKeys(evalFn) {
  var sampleRows = getSampleRows();

  var leftRelation = lf.proc.Relation.fromRows(
      sampleRows.employees, [e.getName()]);
  var rightRelation = lf.proc.Relation.fromRows(
      sampleRows.jobs, [j.getName()]);

  var joinPredicate1 = e.salary.eq(j.minSalary);
  var result = evalFn.call(joinPredicate1, leftRelation, rightRelation);
  assertEquals(
      sampleRows.employees.length * sampleRows.jobs.length,
      result.entries.length);
}


/**
 * Generates sample data to be used for tests. Specifically it generates 50
 * employees and 5 jobs, where each job contains 10 employees.
 * @return {{employees: !Array.<!lf.Row>, jobs: !Array.<!lf.Row>}}
 */
function getSampleRows() {
  var employeeCount = 50;
  var jobCount = employeeCount / 10;
  var salary = 100000;

  var employees = new Array(employeeCount);
  for (var i = 0; i < employeeCount; i++) {
    var employee = lf.testing.hrSchemaSampleData.generateSampleEmployeeData();
    employee.
        setId(i.toString()).
        setJobId(String(i % jobCount)).
        setSalary(salary);
    employees[i] = employee;
  }

  var jobs = new Array(jobCount);
  for (var i = 0; i < jobCount; i++) {
    var job = lf.testing.hrSchemaSampleData.generateSampleJobData();
    job.
        setId(i.toString()).
        setMinSalary(salary);
    jobs[i] = job;
  }

  return {
    employees: employees,
    jobs: jobs
  };
}
