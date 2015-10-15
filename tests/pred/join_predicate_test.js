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
goog.require('lf.eval.Type');
goog.require('lf.pred.JoinPredicate');
goog.require('lf.proc.Relation');
goog.require('lf.proc.RelationEntry');
goog.require('lf.schema.DataStoreType');
goog.require('lf.structs.set');
goog.require('lf.testing.NullableDataGenerator');
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


/**
 * This schema has custom tables that can have nullable columns.
 * @type {!lf.schema.Database}
 */
var schemaWithNullable;


/** @type {!lf.testing.NullableDataGenerator} */
var nullableGenerator;

function setUp() {
  asyncTestCase.waitForAsync('setUp');
  var connectOptions = {storeType: lf.schema.DataStoreType.MEMORY};
  hr.db.connect(connectOptions).then(
      function(database) {
        db = database;
        d = db.getSchema().getDepartment();
        e = db.getSchema().getEmployee();
        j = db.getSchema().getJob();

        // For the tests involving nullable columns, a different schema
        // is created. The tables in hr schema do not handle nullable column.
        var schemaBuilder = lf.testing.NullableDataGenerator.getSchemaBuilder();
        schemaWithNullable = schemaBuilder.getSchema();
        nullableGenerator =
            new lf.testing.NullableDataGenerator(schemaWithNullable);
        nullableGenerator.generate();
        schemaBuilder.connect(connectOptions).
            then(function() {
                  asyncTestCase.continueTesting();
                });
      }, fail);
}


function tearDown() {
  db.close();
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

  // Test case where optional parameter is provided.
  var columns = [];
  assertEquals(columns, p.getColumns(columns));
  assertSameElements([e.jobId, j.id], columns);
}


function testGetTables() {
  var p = e.jobId.eq(j.id);
  assertSameElements([e, j], lf.structs.set.values(p.getTables()));

  // Test case where optional parameter is provided.
  var tables = lf.structs.set.create();
  assertEquals(tables, p.getTables(tables));
  assertSameElements([e, j], lf.structs.set.values(tables));
}


function testJoinPredicate_reverse() {
  var predicates = [
    e.jobId.lt(j.id),
    e.jobId.gt(j.id),
    e.jobId.lte(j.id),
    e.jobId.gte(j.id),
    e.jobId.eq(j.id),
    e.jobId.neq(j.id)
  ];
  var expectedEvalTypes = [
    lf.eval.Type.GT,
    lf.eval.Type.LT,
    lf.eval.Type.GTE,
    lf.eval.Type.LTE,
    lf.eval.Type.EQ,
    lf.eval.Type.NEQ
  ];
  checkJoinPredicate_ExplicitReverse(predicates, expectedEvalTypes);
  checkJoinPredicate_NestedLoop_Reverse(predicates, expectedEvalTypes);
}


/**
 * Tests that JoinPredicate.reverse() works correctly.
 * @param {!Array<!lf.pred.JoinPredicate>} predicates
 * @param {!Array<!lf.eval.Type>} expectedEvalTypes
 */
function checkJoinPredicate_ExplicitReverse(predicates, expectedEvalTypes) {
  for (var i = 0; i < predicates.length; i++) {
    var reversePredicate = predicates[i].reverse();
    assertEquals(predicates[i].leftColumn, reversePredicate.rightColumn);
    assertEquals(predicates[i].rightColumn, reversePredicate.leftColumn);
    assertEquals(expectedEvalTypes[i], reversePredicate.evaluatorType);
  }
}


/**
 * Tests that Nested Loop Join reverses join order and evaluation type when
 * right table is smaller than the left.
 * @param {!Array<!lf.pred.JoinPredicate>} predicates
 * @param {!Array<!lf.eval.Type>} expectedEvalTypes
 */
function checkJoinPredicate_NestedLoop_Reverse(predicates, expectedEvalTypes) {
  var sampleRows = getSampleRows();
  var sampleEmployees = sampleRows.employees;
  var sampleJobs = sampleRows.jobs;

  var employeeRelation = lf.proc.Relation.fromRows(
      sampleEmployees, [e.getEffectiveName()]);
  var jobRelation = lf.proc.Relation.fromRows(
      sampleJobs, [j.getEffectiveName()]);

  var expectedLeftColumn = predicates[0].leftColumn;
  var expectedRightColumn = predicates[1].rightColumn;
  for (var i = 0; i < predicates.length; i++) {
    predicates[i].
        evalRelationsNestedLoopJoin(employeeRelation, jobRelation, false);
    assertEquals(expectedRightColumn, predicates[i].leftColumn);
    assertEquals(expectedLeftColumn, predicates[i].rightColumn);
    assertEquals(expectedEvalTypes[i], predicates[i].evaluatorType);
  }
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
 * @param {!function(!lf.proc.Relation, !lf.proc.Relation, boolean)
 *     :!lf.proc.Relation} evalFn The join implementation method should be
 *     either evalRelationsNestedLoopJoin or evalRelationsHashJoin.
 */
function checkJoinPredicate_RelationsInputOrder(
    employeeSchema, jobSchema, evalFn) {
  var sampleEmployee =
      lf.testing.hrSchemaSampleData.generateSampleEmployeeData(db);
  var sampleJob =
      lf.testing.hrSchemaSampleData.generateSampleJobData(db);

  var employeeRelation = lf.proc.Relation.fromRows(
      [sampleEmployee], [employeeSchema.getEffectiveName()]);
  var jobRelation = lf.proc.Relation.fromRows(
      [sampleJob], [jobSchema.getEffectiveName()]);

  var joinPredicate = employeeSchema.jobId.eq(jobSchema.id);
  var result1 = evalFn.call(
      joinPredicate, employeeRelation, jobRelation, false);
  var result2 = evalFn.call(
      joinPredicate, jobRelation, employeeRelation, false);

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


function testJoinPredicate_RelationsInputOrder() {
  checkJoinPredicate_RelationsInputOrder(
      e, j, lf.pred.JoinPredicate.prototype.evalRelationsNestedLoopJoin);
  checkJoinPredicate_RelationsInputOrder(
      e, j, lf.pred.JoinPredicate.prototype.evalRelationsHashJoin);
}


function testJoinPredicate_RelationOrder_Alias() {
  var eAlias = /** @type {!hr.db.schema.Employee} */ (e.as('employeeAlias'));
  var jAlias = /** @type {!hr.db.schema.Job} */ (j.as('jobAlias'));
  checkJoinPredicate_RelationsInputOrder(
      eAlias, jAlias,
      lf.pred.JoinPredicate.prototype.evalRelationsNestedLoopJoin);
  checkJoinPredicate_RelationsInputOrder(
      eAlias, jAlias,
      lf.pred.JoinPredicate.prototype.evalRelationsHashJoin);
}


function testJoinPredicate_EvalRelations_HashJoin() {
  checkEvalRelations_UniqueKeys(
      lf.pred.JoinPredicate.prototype.evalRelationsHashJoin);
  checkEvalRelations_NonUniqueKeys(
      lf.pred.JoinPredicate.prototype.evalRelationsHashJoin);
  checkEvalRelations_NullableKeys(
      lf.pred.JoinPredicate.prototype.evalRelationsHashJoin);
}


function testJoinPredicate_EvalRelations_NestedLoopJoin() {
  checkEvalRelations_UniqueKeys(
      lf.pred.JoinPredicate.prototype.evalRelationsNestedLoopJoin);
  checkEvalRelations_NonUniqueKeys(
      lf.pred.JoinPredicate.prototype.evalRelationsNestedLoopJoin);
  checkEvalRelations_NullableKeys(
      lf.pred.JoinPredicate.prototype.evalRelationsNestedLoopJoin);
}


function testJoinPredicate_EvalRelations_OuterJoin_HashJoin() {
  checkEvalRelations_OuterJoin_UniqueKeys(
      lf.pred.JoinPredicate.prototype.evalRelationsHashJoin);
  checkEvalRelations_OuterJoin_NonUniqueKeys(
      lf.pred.JoinPredicate.prototype.evalRelationsHashJoin);
  checkEvalRelations_TwoOuterJoins(
      lf.pred.JoinPredicate.prototype.evalRelationsHashJoin);
  checkEvalRelations_OuterInnerJoins(
      lf.pred.JoinPredicate.prototype.evalRelationsHashJoin);
  checkEvalRelations_OuterJoin_NullableKeys(
      lf.pred.JoinPredicate.prototype.evalRelationsHashJoin);
}


function testJoinPredicate_EvalRelations_OuterJoin_NestedLoopJoin() {
  checkEvalRelations_OuterJoin_UniqueKeys(
      lf.pred.JoinPredicate.prototype.evalRelationsNestedLoopJoin);
  checkEvalRelations_OuterJoin_NonUniqueKeys(
      lf.pred.JoinPredicate.prototype.evalRelationsNestedLoopJoin);
  checkEvalRelations_TwoOuterJoins(
      lf.pred.JoinPredicate.prototype.evalRelationsNestedLoopJoin);
  checkEvalRelations_OuterInnerJoins(
      lf.pred.JoinPredicate.prototype.evalRelationsNestedLoopJoin);
  checkEvalRelations_OuterJoin_NullableKeys(
      lf.pred.JoinPredicate.prototype.evalRelationsNestedLoopJoin);
}


function testJoinPredicate_EvalRelations_NestedLoopJoin_MultiJoin() {
  checkEvalRelations_MultiJoin(
      lf.pred.JoinPredicate.prototype.evalRelationsNestedLoopJoin);
}


function testJoinPredicate_EvalRelations_HashJoin_MultiJoin() {
  checkEvalRelations_MultiJoin(
      lf.pred.JoinPredicate.prototype.evalRelationsHashJoin);
}


/**
 * Checks that the given join implementation is correct, for the case where the
 * join predicate refers to unique keys.
 * @param {!function(!lf.proc.Relation, !lf.proc.Relation, boolean)
 *     :!lf.proc.Relation} evalFn The join implementation method should be
 *     either evalRelationsNestedLoopJoin_ or evalRelationsHashJoin_.
 */
function checkEvalRelations_UniqueKeys(evalFn) {
  var sampleRows = getSampleRows();

  var employeeRelation = lf.proc.Relation.fromRows(
      sampleRows.employees, [e.getName()]);
  var jobRelation = lf.proc.Relation.fromRows(
      sampleRows.jobs, [j.getName()]);

  var joinPredicate1 = e.jobId.eq(j.id);
  var result = evalFn.call(
      joinPredicate1, employeeRelation, jobRelation, false);
  assertEquals(sampleRows.employees.length, result.entries.length);

  // Expecting only 5 result entries, since there are only 5 employees that have
  // the same ID with a job.
  var joinPredicate2 = e.id.eq(j.id);
  result = evalFn.call(
      joinPredicate2, employeeRelation, jobRelation, false);
  assertEquals(sampleRows.jobs.length, result.entries.length);
}


/**
 * Checks that the given join implementation is correct, for the case where the
 * join predicate refers to nullable keys.
 * @param {!function(!lf.proc.Relation, !lf.proc.Relation, boolean)
 *     :!lf.proc.Relation} evalFn The join implementation method should be
 *     either evalRelationsNestedLoopJoin_ or evalRelationsHashJoin_.
 */
function checkEvalRelations_NullableKeys(evalFn) {
  var tableA = schemaWithNullable.table('TableA');
  var tableB = schemaWithNullable.table('TableB');
  var tableC = schemaWithNullable.table('TableC');

  var tableARelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableARows, [tableA.getName()]);
  var tableBRelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableBRows, [tableB.getName()]);
  var tableCRelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableCRows, [tableC.getName()]);

  var joinPredicate1 = tableA['id'].eq(tableC['id']);
  var result = evalFn.call(
      joinPredicate1, tableARelation, tableCRelation, false);
  assertEquals(
      nullableGenerator.sampleTableARows.length -
      nullableGenerator.tableAGroundTruth.numNullable,
      result.entries.length);
  result.entries.forEach(function(entry) {
    assertTrue(hasNonNullEntry(entry, tableA.getEffectiveName()));
    assertFalse(hasNullEntry(entry, tableC.getEffectiveName()));
  });
  // Join with left table containing only nulls.
  var joinPredicate2 = tableB['id'].eq(tableC['id']);
  result = evalFn.call(
      joinPredicate2, tableBRelation, tableCRelation, false);
  assertEquals(0, result.entries.length);
}


/**
 * Checks that the given outer join implementation is correct, for the case
 * where the join predicate refers to nullable keys.
 * @param {!function(!lf.proc.Relation, !lf.proc.Relation, boolean)
 *     :!lf.proc.Relation} evalFn The join implementation method should be
 *     either evalRelationsNestedLoopJoin_ or evalRelationsHashJoin_.
 */
function checkEvalRelations_OuterJoin_NullableKeys(evalFn) {
  var tableA = schemaWithNullable.table('TableA');
  var tableB = schemaWithNullable.table('TableB');
  var tableC = schemaWithNullable.table('TableC');

  var tableARelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableARows, [tableA.getName()]);
  var tableBRelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableBRows, [tableB.getName()]);
  var tableCRelation = lf.proc.Relation.fromRows(
      nullableGenerator.sampleTableCRows, [tableC.getName()]);

  var lengthTableA = nullableGenerator.sampleTableARows.length;
  var numNullableTableA = nullableGenerator.tableAGroundTruth.numNullable;
  var joinPredicate1 = tableA['id'].eq(tableC['id']);
  var result = evalFn.call(
      joinPredicate1, tableARelation, tableCRelation, true);
  assertEquals(lengthTableA, result.entries.length);
  result.entries.slice(0, lengthTableA - numNullableTableA).forEach(
      function(entry) {
        assertTrue(hasNonNullEntry(entry, tableA.getEffectiveName()));
      });
  result.entries.slice(lengthTableA - numNullableTableA).forEach(
      function(entry) {
        assertTrue(hasNullEntry(entry, tableA.getEffectiveName()));
      });
  var numNullEntries = result.entries.filter(function(entry) {
    return hasNullEntry(entry, tableC.getEffectiveName());
  }).length;
  assertEquals(numNullableTableA, numNullEntries);

  // Join with left table containing only nulls.
  var joinPredicate2 = tableB['id'].eq(tableC['id']);
  result = evalFn.call(
      joinPredicate2, tableBRelation, tableCRelation, true);
  assertEquals(
      nullableGenerator.sampleTableBRows.length,
      result.entries.length);
  numNullEntries = result.entries.filter(function(entry) {
    return hasNullEntry(entry, tableC.getEffectiveName()) &&
        hasNullEntry(entry, tableB.getEffectiveName());
  }).length;
  assertEquals(
      nullableGenerator.sampleTableBRows.length, numNullEntries);
}


/**
 * Checks that the given combined entry has a null entry for table 'tableName'.
 * @param {!lf.proc.RelationEntry} entry The combined entry.
 * @param {!string} tableName
 * @return {boolean}
 */
function hasNullEntry(entry, tableName) {
  var keys = Object.keys(entry.row.payload()[tableName]);
  assertTrue(keys.length > 0);
  return Object.keys(entry.row.payload()[tableName]).every(
      function(key) {
        return goog.isNull(entry.row.payload()[tableName][key]);
      }
  );
}


/**
 * Checks that the given combined entry has a non-null entry for table
 * 'tableName'.
 * @param {!lf.proc.RelationEntry} entry The combined entry.
 * @param {!string} tableName
 * @return {boolean}
 */
function hasNonNullEntry(entry, tableName) {
  var payload = entry.row.payload()[tableName];
  var keys = Object.keys(payload);
  assertTrue(keys.length > 0);
  return Object.keys(payload).every(
      function(key) {
        return !goog.isNull(payload[key]);
      }
  );
}


/**
 * Checks that the given outer join implementation is correct for the case,
 * where the join predicate refers to unique keys.
 * @param {!function(!lf.proc.Relation, !lf.proc.Relation, boolean)
 *     :!lf.proc.Relation} evalFn The join implementation method should be
 *     either evalRelationsNestedLoopJoin_ or evalRelationsHashJoin_.
 */
function checkEvalRelations_OuterJoin_UniqueKeys(evalFn) {
  var sampleRows = getSampleRows();
  // Remove the last job row.
  var lessJobs = sampleRows.jobs.slice(0, sampleRows.jobs.length - 1);
  var employeeRelation = lf.proc.Relation.fromRows(
      sampleRows.employees, [e.getName()]);
  var jobRelation = lf.proc.Relation.fromRows(
      lessJobs, [j.getName()]);
  // For every Job , there are 10 employees according to getSampleRows().
  var numEmployeesPerJob = 10;

  var joinPredicate1 = e.jobId.eq(j.id);
  var result = evalFn.call(
      joinPredicate1, employeeRelation, jobRelation, true);
  assertEquals(sampleRows.employees.length, result.entries.length);
  var numNullEntries = result.entries.filter(function(entry) {
    return hasNullEntry(entry, 'Job');
  }).length;
  assertEquals(numEmployeesPerJob, numNullEntries);
}


/**
 * Checks that the given outer join implementation is correct for two
 * Outer joins, for the case where the join predicate refers to unique keys.
 * @param {!function(!lf.proc.Relation, !lf.proc.Relation, boolean)
 *     :!lf.proc.Relation} evalFn The join implementation method should be
 *     either evalRelationsNestedLoopJoin_ or evalRelationsHashJoin_.
 */
function checkEvalRelations_TwoOuterJoins(evalFn) {
  var sampleRows = getSampleRows();
  var numJobsDeleted = 1;
  var numDepartmentsDeleted = 2;
  // Remove the last job row.
  var lessJobs = sampleRows.jobs.slice(
      0, sampleRows.jobs.length - numJobsDeleted);
  // Remove the last 2 rows in Departments.
  var lessDepartments = sampleRows.departments.slice(
      0, sampleRows.departments.length - numDepartmentsDeleted);

  var employeeRelation = lf.proc.Relation.fromRows(
      sampleRows.employees, [e.getName()]);
  var jobRelation = lf.proc.Relation.fromRows(
      lessJobs, [j.getName()]);
  var departmentRelation = lf.proc.Relation.fromRows(
      lessDepartments, [d.getName()]);

  var joinPredicate1 = e.jobId.eq(j.id);
  var joinPredicate2 = e.departmentId.eq(d.id);

  var numEmployeesPerJob = 10;
  var numEmployeesPerDepartment = 20;
  var expectedResults = sampleRows.employees.length - (numJobsDeleted *
      numEmployeesPerJob);
  var expectedResults2 = sampleRows.employees.length - (
      numDepartmentsDeleted * numEmployeesPerDepartment);

  // Tests inner join followed by outer join.
  var result = evalFn.call(
      joinPredicate1, employeeRelation, jobRelation, false);
  assertEquals(expectedResults, result.entries.length);
  var result2 = evalFn.call(joinPredicate2, result, departmentRelation, true);
  // Join employee and job with department.
  assertEquals(expectedResults, result2.entries.length);
  // joinPredicate1 is reversed in previous join.
  joinPredicate1 = e.jobId.eq(j.id);
  // Tests outer join followed by inner join.
  result = evalFn.call(joinPredicate1, employeeRelation, jobRelation, true);
  assertEquals(sampleRows.employees.length, result.entries.length);
  result2 = evalFn.call(joinPredicate2, result, departmentRelation, false);
  // Join employee and job with department
  assertEquals(expectedResults2, result2.entries.length);
  // joinPredicate2 is reversed in previous join.
  joinPredicate2 = e.departmentId.eq(d.id);
  // Tests outer join followed by outer join.
  result = evalFn.call(joinPredicate1, employeeRelation, jobRelation, true);
  assertEquals(sampleRows.employees.length, result.entries.length);
  result2 = evalFn.call(joinPredicate2, result, departmentRelation, true);
  assertEquals(sampleRows.employees.length, result2.entries.length);
}


/**
 * Checks that the given outer join implementation is correct
 * for two Outer joins, for the case where the join predicate
 * refers to unique keys.
 * @param {!function(!lf.proc.Relation, !lf.proc.Relation, boolean)
 *     :!lf.proc.Relation} evalFn The join implementation method should be
 *     either evalRelationsNestedLoopJoin_ or evalRelationsHashJoin_.
 */
function checkEvalRelations_OuterInnerJoins(evalFn) {
  var sampleRows = getSampleRows();
  var lessJobs = sampleRows.jobs.slice(0, sampleRows.jobs.length - 1);
  var lessDepartments = sampleRows.departments.slice(0,
      sampleRows.departments.length - 1);
  var numJobsDeleted = 1;
  var numDepartmentsDeleted = 1;
  var numEmployeesPerJob = 10;
  var numEmployeesPerDepartment = 20;

  var employeeRelation = lf.proc.Relation.fromRows(
      sampleRows.employees, [e.getName()]);
  var jobRelation = lf.proc.Relation.fromRows(
      lessJobs, [j.getName()]);
  var departmentRelation = lf.proc.Relation.fromRows(
      lessDepartments, [d.getName()]);

  var joinPredicate1 = e.jobId.eq(j.id);
  var result = evalFn.call(
      joinPredicate1, employeeRelation, jobRelation, false);
  var expectedResults = sampleRows.employees.length - (numJobsDeleted *
      numEmployeesPerJob);
  var expectedResults2 = sampleRows.employees.length - (
      numDepartmentsDeleted * numEmployeesPerDepartment);
  assertEquals(expectedResults, result.entries.length);
  // joinPredicate1 is reversed in previous join.
  joinPredicate1 = e.jobId.eq(j.id);
  result = evalFn.call(joinPredicate1, employeeRelation, jobRelation, true);
  assertEquals(sampleRows.employees.length, result.entries.length);

  // Join employee and job with department.
  var joinPredicate2 = e.departmentId.eq(d.id);
  var result2 = evalFn.call(joinPredicate2, result, departmentRelation, true);
  assertEquals(sampleRows.employees.length, result2.entries.length);
  result2 = evalFn.call(joinPredicate2, result, departmentRelation, false);
  assertEquals(expectedResults2, result2.entries.length);
}


/**
 * Checks that the given join implementation is correct, for the case where the
 * join predicate refers to non-unique keys.
 * @param {!function(!lf.proc.Relation, !lf.proc.Relation, boolean)
 *     :!lf.proc.Relation} evalFn The join implementation method should be
 *     either evalRelationsNestedLoopJoin_ or evalRelationsHashJoin_.
 */
function checkEvalRelations_NonUniqueKeys(evalFn) {
  var sampleRows = getSampleRows();

  var employeeRelation = lf.proc.Relation.fromRows(
      sampleRows.employees, [e.getName()]);
  var jobRelation = lf.proc.Relation.fromRows(
      sampleRows.jobs, [j.getName()]);

  var joinPredicate1 = e.salary.eq(j.minSalary);
  var result = evalFn.call(
      joinPredicate1, employeeRelation, jobRelation, false);
  assertEquals(
      sampleRows.employees.length * sampleRows.jobs.length,
      result.entries.length);
}


/**
 * Checks that the given join implementation is correct, for the case where the
 * join predicate refers to non-unique keys.
 * @param {!function(!lf.proc.Relation, !lf.proc.Relation, boolean)
 *     :!lf.proc.Relation} evalFn The join implementation method should be
 *     either evalRelationsNestedLoopJoin_ or evalRelationsHashJoin_.
 */
function checkEvalRelations_OuterJoin_NonUniqueKeys(evalFn) {
  var sampleRows = getSampleRows();
  var lessJobs = sampleRows.jobs.slice(0, sampleRows.jobs.length - 1);
  sampleRows.employees[sampleRows.employees.length - 1].setSalary(1);
  var employeeRelation = lf.proc.Relation.fromRows(
      sampleRows.employees, [e.getName()]);
  var jobRelation = lf.proc.Relation.fromRows(
      lessJobs, [j.getName()]);

  var numEmployeesChanged = 1;

  var joinPredicate1 = e.salary.eq(j.minSalary);
  var result = evalFn.call(
      joinPredicate1, employeeRelation, jobRelation, true);
  assertEquals(
      (sampleRows.employees.length - numEmployeesChanged) * lessJobs.length +
      numEmployeesChanged, result.entries.length);
  var numNullEntries = 0;
  result.entries.forEach(function(entry) {
    if (hasNullEntry(entry, 'Job')) {
      numNullEntries++;
    }
  });
  assertEquals(numEmployeesChanged, numNullEntries);
}


/**
 * Checks that the given join implementation is correct, for the case where a 3
 * table natural join is performed.
 * @param {!function(!lf.proc.Relation, !lf.proc.Relation, boolean)
 *     :!lf.proc.Relation} evalFn The join implementation method should be
 *     either evalRelationsNestedLoopJoin_ or evalRelationsHashJoin_.
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
      joinPredicate1, employeeRelation, jobRelation, false);
  var resultEmployeeJobDepartment = evalFn.call(
      joinPredicate2, resultEmployeeJob, departmentRelation, false);
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
