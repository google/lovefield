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
goog.require('lf.op');
goog.require('lf.proc.Relation');
goog.require('lf.schema.DataStoreType');
goog.require('lf.structs.set');
goog.require('lf.testing.hrSchemaSampleData');
goog.require('lf.tree');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'CombinedPredicate');


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


function tearDown() {
  db.close();
}


/**
 * Tests that copy() creates an identical tree where each node is a new
 * instance.
 */
function testCopy_Simple() {
  var expectedTree =
      'combined_pred_and\n' +
      '-value_pred(Employee.salary gte 200)\n' +
      '-value_pred(Employee.salary lte 600)\n';

  var original = /** @type {!lf.pred.PredicateNode} */ (
      lf.op.and(e.salary.gte(200), e.salary.lte(600)));
  var copy = original.copy();
  assertTreesIdentical(expectedTree, original, copy);
  assertEquals(original.getId(), copy.getId());
}


/**
 * Tests that copy() creates an identical tree where each node is a new
 * instance for the case of a tree with 3+ nodes.
 */
function testCopy_VarArgs() {
  var expectedTree =
      'combined_pred_and\n' +
      '-value_pred(Employee.salary gte 200)\n' +
      '-value_pred(Employee.salary lte 600)\n' +
      '-value_pred(Employee.commissionPercent lt 0.15)\n' +
      '-value_pred(Employee.commissionPercent gt 0.1)\n';

  var original = /** @type {!lf.pred.PredicateNode} */ (
      lf.op.and(
          e.salary.gte(200),
          e.salary.lte(600),
          e.commissionPercent.lt(0.15),
          e.commissionPercent.gt(0.1)));
  var copy = original.copy();
  assertTreesIdentical(expectedTree, original, copy);
  assertEquals(original.getId(), copy.getId());
}


/**
 * Tests that copy() creates an identical tree where each node is a new
 * instance for the case of a tree with nested CombinedPredicate instances.
 */
function testCopy_Nested() {
  var expectedTree =
      'combined_pred_and\n' +
      '-value_pred(Employee.salary gte 200)\n' +
      '-combined_pred_and\n' +
      '--join_pred(Employee.jobId eq Job.id)\n' +
      '--join_pred(Employee.departmentId eq Department.id)\n';

  var original = /** @type {!lf.pred.PredicateNode} */ (lf.op.and(
      e.salary.gte(200),
      lf.op.and(
          e.jobId.eq(j.id),
          e.departmentId.eq(d.id))));
  var copy = original.copy();
  assertTreesIdentical(expectedTree, original, copy);
  assertEquals(original.getId(), copy.getId());
}


/**
 * Asserts that the given trees have identical structure and that they do not
 * hold any common object references.
 * @param {string} expectedTree The expected string representation of the two
 *     trees.
 * @param {!lf.structs.TreeNode} original The root node of the original tree.
 * @param {!lf.structs.TreeNode} copy The root node of the copied tree.
 */
function assertTreesIdentical(expectedTree, original, copy) {
  assertEquals(expectedTree, lf.tree.toString(original));
  assertEquals(expectedTree, lf.tree.toString(copy));

  // Asserting that the copy tree holds new instances for each node.
  var originalTraversedNodes = [];
  original.traverse(function(node) {
    originalTraversedNodes.push(node);
  });

  copy.traverse(function(node) {
    var originalNode = originalTraversedNodes.shift();
    assertFalse(originalNode == node);
  });
}


/**
 * Tests that Predicate#getColumns() returns all involved columns for various
 * predicates.
 */
function testGetColumns() {
  var p1 = /** @type {!lf.pred.PredicateNode} */ (
      lf.op.and(e.salary.gte(200), e.salary.lte(600)));
  var expectedColumns = [e.salary];
  assertSameElements(expectedColumns, p1.getColumns());

  var p2 = /** @type {!lf.pred.PredicateNode} */ (
      lf.op.and(
          e.salary.gte(200),
          e.salary.lte(600),
          e.commissionPercent.lt(0.15),
          e.commissionPercent.gt(0.1)));
  expectedColumns = [e.salary, e.commissionPercent];
  assertSameElements(expectedColumns, p2.getColumns());

  var p3 = /** @type {!lf.pred.PredicateNode} */ (lf.op.and(
      e.salary.gte(200),
      lf.op.and(
          e.jobId.eq(j.id),
          e.departmentId.eq(d.id))));
  expectedColumns = [
    e.salary, e.jobId, e.departmentId,
    j.id, d.id
  ];
  assertSameElements(expectedColumns, p3.getColumns());
}


function testGetTables() {
  var p1 = /** @type {!lf.pred.PredicateNode} */ (
      lf.op.and(e.salary.gte(200), e.salary.lte(600)));
  var expectedTables = [e];
  assertSameElements(expectedTables, lf.structs.set.values(p1.getTables()));

  var p2 = /** @type {!lf.pred.PredicateNode} */ (
      lf.op.and(e.salary.gte(200), j.maxSalary.lte(600)));
  expectedTables = [e, j];
  assertSameElements(expectedTables, lf.structs.set.values(p2.getTables()));

  var p3 = /** @type {!lf.pred.PredicateNode} */ (lf.op.and(
      j.maxSalary.gte(200),
      lf.op.and(
          e.jobId.eq(j.id),
          e.departmentId.eq(d.id))));
  expectedTables = [e, j, d];
  assertSameElements(expectedTables, lf.structs.set.values(p3.getTables()));
}


/**
 * Tests the setComplement() method for the case of an AND predicate.
 */
function testSetComplement_And() {
  var predicate = lf.op.and(e.salary.gte(200), e.salary.lte(600));
  var expectedSalariesOriginal = [200, 300, 400, 500, 600];
  var expectedSalariesComplement = [0, 100, 700];

  checkSetComplement(
      predicate, 8, expectedSalariesOriginal, expectedSalariesComplement);
}


/**
 * Tests the setComplement() method for the case of an OR predicate.
 */
function testSetComplement_Or() {
  var predicate = lf.op.or(e.salary.lte(200), e.salary.gte(600));
  var expectedSalariesOriginal = [0, 100, 200, 600, 700];
  var expectedSalariesComplement = [300, 400, 500];

  checkSetComplement(
      predicate, 8, expectedSalariesOriginal, expectedSalariesComplement);
}


function testIsKeyRangeCompatbile_And() {
  var predicate = lf.op.and(e.salary.gte(200), e.salary.lte(600));
  assertFalse(predicate.isKeyRangeCompatible());
}


function testIsKeyRangeCompatbile_Or() {
  var keyRangeCompatbilePredicates = [
    lf.op.or(e.salary.eq(200), e.salary.eq(600)),
    lf.op.or(e.salary.lte(200), e.salary.gte(600)),
    lf.op.or(e.salary.eq(200))
  ];
  keyRangeCompatbilePredicates.forEach(function(p) {
    assertTrue(p.isKeyRangeCompatible());
  });

  var notKeyRangeCompatbilePredicates = [
    lf.op.or(e.firstName.match(/Foo/), e.firstName.eq('Bar')),
    lf.op.or(e.firstName.neq('Foo'), e.firstName.eq('Bar')),
    lf.op.or(e.salary.eq(100), lf.op.or(e.salary.eq(200), e.salary.eq(300))),
    lf.op.or(e.salary.isNull(), e.salary.eq(600)),
    lf.op.or(e.firstName.eq('Foo'), e.lastName.eq('Bar'))
  ];
  notKeyRangeCompatbilePredicates.forEach(function(p) {
    assertFalse(p.isKeyRangeCompatible());
  });
}


function testToKeyRange_Or() {
  var testCases = [
    [lf.op.or(e.salary.eq(200), e.salary.eq(600)), '[200, 200],[600, 600]'],
    [lf.op.or(e.salary.lte(200), e.salary.gte(600)),
     '[unbound, 200],[600, unbound]'],
    [lf.op.or(e.salary.lt(200), e.salary.lt(100)), '[unbound, 200)'],
    [lf.op.or(e.salary.eq(200), e.salary.eq(200)), '[200, 200]']
  ];

  testCases.forEach(function(testCase) {
    var predicate = testCase[0];
    var expected = testCase[1];
    assertEquals(expected, predicate.toKeyRange().toString());
  });
}


/**
 * Performs a series of tests for the setComplement() method.
 * @param {!lf.Predicate} predicate The combined predicate to be tested.
 * @param {number} sampleRowCount The number of sample Employee rows to be used
 *     during testing.
 * @param {!Array<number>} expectedSalariesOriginal The expected salaries
 *     returned by the original predicate.
 * @param {!Array<number>} expectedSalariesComplement The expected salaries
 *     returned by the complement predicate.
 */
function checkSetComplement(
    predicate, sampleRowCount, expectedSalariesOriginal,
    expectedSalariesComplement) {
  var extractSalaries = function(relation) {
    return relation.entries.map(function(entry) {
      return entry.row.getSalary();
    });
  };

  var inputRelation = lf.proc.Relation.fromRows(
      getSampleRows(sampleRowCount), [e.getName()]);

  var assertOriginal = function() {
    var outputRelation = predicate.eval(inputRelation);
    assertArrayEquals(
        expectedSalariesOriginal,
        extractSalaries(outputRelation));
  };

  var assertComplement = function() {
    var outputRelation = predicate.eval(inputRelation);
    assertArrayEquals(
        expectedSalariesComplement,
        extractSalaries(outputRelation));
  };

  // Testing the original predicate.
  assertOriginal();

  // Testing the complement predicate.
  predicate.setComplement(true);
  assertComplement();

  // Testing going from the complement predicate back to the original.
  predicate.setComplement(false);
  assertOriginal();

  // Testing that calling setComplement() twice with the same value leaves the
  // predicate in a consistent state.
  predicate.setComplement(true);
  predicate.setComplement(true);
  assertComplement();
}


/**
 * Generates sample emolyee data to be used for tests.
 * @param {number} rowCount The number of sample rows to be generated.
 * @return {!Array<!lf.Row>}
 */
function getSampleRows(rowCount) {
  var employees = new Array(rowCount);
  for (var i = 0; i < rowCount; i++) {
    var employee = lf.testing.hrSchemaSampleData.generateSampleEmployeeData(db);
    employee.
        setId(i.toString()).
        setSalary(100 * i);
    employees[i] = employee;
  }

  return employees;
}
