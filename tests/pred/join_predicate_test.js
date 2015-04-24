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
goog.require('lf.pred.JoinPredicate');
goog.require('lf.proc.Relation');
goog.require('lf.proc.RelationEntry');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.hrSchemaSampleData');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'JoinPredicate');


/** @type {!lf.Database} */
var db;


/** @type {!hr.db.schema.Employee} */
var e;


/** @type {!hr.db.schema.Job} */
var j;


/** @type {!hr.db.schema.Department} */
var d;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(
      function(database) {
        db = database;
        d = db.getSchema().getDepartment();
        e = db.getSchema().getEmployee();
        j = db.getSchema().getJob();
        asyncTestCase.continueTesting();
      }, fail);
}


function testCopy() {
  var original = e.jobId.eq(j.id);
  var copy = original.copy();

  assertTrue(copy instanceof lf.pred.JoinPredicate);
  assertFalse(original == copy);
  assertEquals(original.leftColumn, copy.leftColumn);
  assertEquals(original.rightColumn, copy.rightColumn);
  assertEquals(original.evaluatorType, copy.evaluatorType);
  assertEquals(original.getId(), copy.getId());
}


function testGetColumns() {
  var p = e.jobId.eq(j.id);
  assertSameElements([e.jobId, j.id], p.getColumns());
}


function testJoinPredicate_Eval_True() {
  var leftEntry = new lf.proc.RelationEntry(
      lf.testing.hrSchemaSampleData.generateSampleEmployeeData(db),
      false);
  var rightEntry = new lf.proc.RelationEntry(
      lf.testing.hrSchemaSampleData.generateSampleJobData(db),
      false);
  var combinedEntry = lf.proc.RelationEntry.combineEntries(
      leftEntry, [e.getName()],
      rightEntry, [j.getName()]);
  var relation = new lf.proc.Relation(
      [combinedEntry], [e.getName(), j.getName()]);

  var joinPredicate1 = e.jobId.eq(j.id);
  var resultRelation1 = joinPredicate1.eval(relation);
  assertEquals(1, resultRelation1.entries.length);

  var joinPredicate2 = j.id.eq(e.jobId);
  var resultRelation2 = joinPredicate2.eval(relation);
  assertEquals(1, resultRelation2.entries.length);
}


function testJoinPredicate_Eval_False() {
  var leftEntry = new lf.proc.RelationEntry(
      lf.testing.hrSchemaSampleData.generateSampleEmployeeData(db),
      false);
  var rightEntry = new lf.proc.RelationEntry(
      lf.testing.hrSchemaSampleData.generateSampleJobData(db),
      false);
  var combinedEntry = lf.proc.RelationEntry.combineEntries(
      leftEntry, [e.getName()],
      rightEntry, [j.getName()]);
  var relation = new lf.proc.Relation(
      [combinedEntry], [e.getName(), j.getName()]);

  var joinPredicate = e.firstName.eq(j.id);
  var resultRelation = joinPredicate.eval(relation);
  assertEquals(0, resultRelation.entries.length);
}


/**
 * Tests that evalRelations() will detect which input relation should be used as
 * "left" and which as "right" independently of the input order.
 * @param {!hr.db.schema.Employee} employeeSchema
 * @param {!hr.db.schema.Job} jobSchema
 */
function checkJoinPredicate_EvalRelations(employeeSchema, jobSchema) {
  var sampleEmployee =
      lf.testing.hrSchemaSampleData.generateSampleEmployeeData(db);
  var sampleJob =
      lf.testing.hrSchemaSampleData.generateSampleJobData(db);

  var employeeRelation = lf.proc.Relation.fromRows(
      [sampleEmployee], [employeeSchema.getEffectiveName()]);
  var jobRelation = lf.proc.Relation.fromRows(
      [sampleJob], [jobSchema.getEffectiveName()]);

  var joinPredicate = employeeSchema.jobId.eq(jobSchema.id);
  var result1 = joinPredicate.evalRelations(employeeRelation, jobRelation);
  var result2 = joinPredicate.evalRelations(jobRelation, employeeRelation);

  assertEquals(1, result1.entries.length);
  assertEquals(1, result2.entries.length);
  assertEquals(
      sampleEmployee.payload().id,
      result1.entries[0].getField(employeeSchema.id));
  assertEquals(
      sampleEmployee.payload().id,
      result2.entries[0].getField(employeeSchema.id));
  assertEquals(
      sampleJob.payload().id,
      result1.entries[0].getField(jobSchema.id));
  assertEquals(
      sampleJob.payload().id,
      result2.entries[0].getField(jobSchema.id));
}


function testJoinPredicate_EvalRelations() {
  checkJoinPredicate_EvalRelations(e, j);
}


function testJoinPredicate_EvalRelations_Alias() {
  checkJoinPredicate_EvalRelations(
      /** @type {!hr.db.schema.Employee} */ (e.as('employeeAlias')),
      /** @type {!hr.db.schema.Job} */ (j.as('jobAlias')));
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


/** @suppress {accessControls} */
function testJoinPredicate_EvalRelations_NestedLoopJoin_MultiJoin() {
  checkEvalRelations_MultiJoin(
      lf.pred.JoinPredicate.prototype.evalRelationsNestedLoopJoin_);
}


/** @suppress {accessControls} */
function testJoinPredicate_EvalRelations_HashJoin_MultiJoin() {
  checkEvalRelations_MultiJoin(
      lf.pred.JoinPredicate.prototype.evalRelationsHashJoin_);
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
 * Checks that the given join implementation is correct, for the case where a 3
 * table natural join is performed.
 * @param {!function(!lf.proc.Relation, !lf.proc.Relation):!lf.proc.Relation}
 *     evalFn The join implementation method. Should be either
 *     evalRelationsNestedLoopJoin_ or evalRelationsHashJoin_.
 */
function checkEvalRelations_MultiJoin(evalFn) {
  var sampleRows = getSampleRows();

  var employeeRelation = lf.proc.Relation.fromRows(
      sampleRows.employees, [e.getName()]);
  var jobRelation = lf.proc.Relation.fromRows(
      sampleRows.jobs, [j.getName()]);
  var departmentRelation = lf.proc.Relation.fromRows(
      sampleRows.departments, [d.getName()]);

  var joinPredicate1 = e.jobId.eq(j.id);
  var joinPredicate2 = e.departmentId.eq(d.id);

  var resultEmployeeJob = evalFn.call(
      joinPredicate1, employeeRelation, jobRelation);
  var resultEmployeeJobDepartment = evalFn.call(
      joinPredicate2, resultEmployeeJob, departmentRelation);
  assertEquals(
      sampleRows.employees.length,
      resultEmployeeJobDepartment.entries.length);
}


/**
 * Generates sample data to be used for tests. Specifically it generates
 *  - 60 employees,
 *  - 6 jobs,
 *  - 3 departments
 * Such that each job contains 10 employees and each department contains 20
 * employees.
 * @return {{
 *   employees: !Array<!lf.Row>,
 *   jobs: !Array<!lf.Row>,
 *   departments: !Array<!lf.Row>
 * }}
 */
function getSampleRows() {
  var employeeCount = 60;
  var jobCount = employeeCount / 10;
  var departmentCount = employeeCount / 20;
  var salary = 100000;

  var employees = new Array(employeeCount);
  for (var i = 0; i < employeeCount; i++) {
    var employee = lf.testing.hrSchemaSampleData.generateSampleEmployeeData(db);
    employee.
        setId(i.toString()).
        setJobId(String(i % jobCount)).
        setDepartmentId('departmentId' + String(i % departmentCount)).
        setSalary(salary);
    employees[i] = employee;
  }

  var jobs = new Array(jobCount);
  for (var i = 0; i < jobCount; i++) {
    var job = lf.testing.hrSchemaSampleData.generateSampleJobData(db);
    job.
        setId(i.toString()).
        setMinSalary(salary);
    jobs[i] = job;
  }

  var departments = new Array(departmentCount);
  for (var i = 0; i < departmentCount; i++) {
    var department =
        lf.testing.hrSchemaSampleData.generateSampleDepartmentData(db);
    department.setId('departmentId' + i.toString());
    departments[i] = department;
  }

  return {
    employees: employees,
    jobs: jobs,
    departments: departments
  };
}
