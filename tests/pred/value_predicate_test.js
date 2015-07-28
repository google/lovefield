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
goog.require('lf.Binder');
goog.require('lf.bind');
goog.require('lf.eval.Type');
goog.require('lf.pred.JoinPredicate');
goog.require('lf.pred.ValuePredicate');
goog.require('lf.proc.Relation');
goog.require('lf.testing.MockEnv');
goog.require('lf.testing.getSchemaBuilder');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'ValuePredicate');


/** @type {!lf.schema.Database} */
var schema;


function setUp() {
  asyncTestCase.waitForAsync('setUp');

  schema = lf.testing.getSchemaBuilder().getSchema();
  var env = new lf.testing.MockEnv(schema);
  env.init().then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


function testCopy() {
  var table = schema.table('tableA');
  var original = new lf.pred.ValuePredicate(
      table['id'], 'myId', lf.eval.Type.EQ);
  var copy = original.copy();

  assertTrue(copy instanceof lf.pred.ValuePredicate);
  assertFalse(original == copy);
  assertEquals(original.column, copy.column);
  assertEquals(original.value, copy.value);
  assertEquals(original.evaluatorType, copy.evaluatorType);
  assertEquals(original.getId(), copy.getId());
}


function testGetColumns() {
  var table = schema.table('tableA');
  var p = new lf.pred.ValuePredicate(
      table['id'], 'myId', lf.eval.Type.EQ);
  assertSameElements([table['id']], p.getColumns());
}


function testEval_Eq() {
  checkEval_Eq(schema.table('tableA'));
}


function testEval_Eq_Alias() {
  checkEval_Eq(schema.table('tableA').as('SomeTableAlias'));
}


/**
 * @param {!lf.schema.Table} table
 */
function checkEval_Eq(table) {
  var sampleRow = getSampleRows(1)[0];
  var relation = lf.proc.Relation.fromRows(
      [sampleRow], [table.getEffectiveName()]);

  var predicate1 = new lf.pred.ValuePredicate(
      table['id'], sampleRow.payload().id, lf.eval.Type.EQ);
  var finalRelation1 = predicate1.eval(relation);
  assertEquals(1, finalRelation1.entries.length);

  var predicate2 = new lf.pred.ValuePredicate(
      table['id'], 'otherId', lf.eval.Type.EQ);
  var finalRelation2 = predicate2.eval(relation);
  assertEquals(0, finalRelation2.entries.length);
}


function testEval_Match() {
  var table = schema.table('tableA');
  var sampleRow = getSampleRows(1)[0];
  var relation = lf.proc.Relation.fromRows(
      [sampleRow], [table.getName()]);

  // Testing true case.
  var predicate1 = new lf.pred.ValuePredicate(
      table['name'], /sampleName0/, lf.eval.Type.MATCH);
  var finalRelation1 = predicate1.eval(relation);
  assertEquals(1, finalRelation1.entries.length);

  var predicate2 = new lf.pred.ValuePredicate(
      table['name'], /\bsample[A-Za-z0-9]+\b/, lf.eval.Type.MATCH);
  var finalRelation2 = predicate2.eval(relation);
  assertEquals(1, finalRelation2.entries.length);

  // Testing false case.
  var predicate3 = new lf.pred.ValuePredicate(
      table['name'], /SAMPLENAME0/, lf.eval.Type.MATCH);
  var finalRelation3 = predicate3.eval(relation);
  assertEquals(0, finalRelation3.entries.length);
}


/**
 * Tests ValuePredicate#eval() in the case where the predicate is of type
 * lf.eval.Type.IN.
 * @param {!Array<!lf.Row>} sampleRows
 * @param {!Array<string>} inValues
 * @param {!Array<string>} expectedValues
 * @param {boolean} isReverse
 */
function checkEval_In(sampleRows, inValues, expectedValues, isReverse) {
  var table = schema.table('tableA');
  var predicate = new lf.pred.ValuePredicate(
      table['name'], inValues, lf.eval.Type.IN);
  if (isReverse) {
    predicate.setComplement(true);
  }
  var inputRelation = lf.proc.Relation.fromRows(sampleRows, [table.getName()]);
  var outputRelation = predicate.eval(inputRelation);
  var actualValues = outputRelation.entries.map(function(entry) {
    return entry.getField(table['name']);
  });
  assertArrayEquals(expectedValues, actualValues);
}


/**
 * Tests ValuePredicate#eval() in the case where the predicate is of type
 * lf.eval.Type.IN and column does not have null.
 */
function testEval_In_WithoutNull() {
  var sampleRows = getSampleRows(6);
  var inValues = ['sampleName0', 'sampleName2', 'sampleName4'];
  checkEval_In(sampleRows, inValues, inValues, false);
}


/**
 * Tests ValuePredicate#eval() for column having null, in the case where the
 * predicate is of type lf.eval.Type.IN.
 */
function testEval_In_WithNull() {
  var table = schema.table('tableA');
  var sampleRows = getSampleRows(6);
  sampleRows.push(table.createRow({
    'id': 'sampleId6', 'name': null}));
  var inValues = ['sampleName0', 'sampleName2', 'sampleName4'];
  checkEval_In(sampleRows, inValues, inValues, false);
  checkEval_In(sampleRows, inValues.concat(null), inValues, false);
}


/**
 * Tests ValuePredicate#eval() in the case where the predicate is of type
 * lf.eval.Type.IN and has been reversed and column does not
 * have null.
 */
function testEval_In_Reversed_WithoutNull() {
  var sampleRows = getSampleRows(6);
  var inValues = ['sampleName1', 'sampleName3', 'sampleName5'];
  var expectedValues = ['sampleName0', 'sampleName2', 'sampleName4'];
  checkEval_In(sampleRows, inValues, expectedValues, true);
}


/**
 * Tests ValuePredicate#eval() for column having null, in the case where
 * the predicate is of type lf.eval.Type.IN and the predicate has been reversed.
 */
function testEval_In_Reversed_WithNull() {
  var table = schema.table('tableA');
  var sampleRows = getSampleRows(6);
  sampleRows.push(table.createRow({
    'id': 'sampleId6', 'name': null}));
  var inValues = ['sampleName1', 'sampleName3', 'sampleName5'];
  var expectedValues = ['sampleName0', 'sampleName2', 'sampleName4'];
  checkEval_In(sampleRows, inValues, expectedValues, true);
  checkEval_In(sampleRows, inValues.concat(null), expectedValues, true);
}


function testEval_Eq_PreviousJoin() {
  var table1 = schema.table('tableA');
  var table2 = schema.table('tableE');
  checkEval_Eq_PreviousJoin(table1, table2);
}


function testEval_Eq_PreviousJoin_Alias() {
  var table1 = schema.table('tableA').as('table1');
  var table2 = schema.table('tableE').as('table2');
  checkEval_Eq_PreviousJoin(table1, table2);
}


/**
 * Testing the case where a ValuePredicate is applied on a relation that is the
 * result of a previous join operation.
 *
 * @param {!lf.schema.Table} table1
 * @param {!lf.schema.Table} table2
 */
function checkEval_Eq_PreviousJoin(table1, table2) {
  var leftRow = table1.createRow({
    'id': 'dummyId',
    'name': 'dummyName'
  });
  var rightRow1 = table2.createRow({
    'id': 'dummyId',
    'email': 'dummyEmail1'
  });
  var rightRow2 = table2.createRow({
    'id': 'dummyId',
    'email': 'dummyEmail2'
  });

  var leftRelation = lf.proc.Relation.fromRows(
      [leftRow], [table1.getEffectiveName()]);
  var rightRelation = lf.proc.Relation.fromRows(
      [rightRow1, rightRow2], [table2.getEffectiveName()]);

  var joinPredicate = new lf.pred.JoinPredicate(
      table1['id'], table2['id'], lf.eval.Type.EQ);
  var joinedRelation = joinPredicate.evalRelations(
      leftRelation, rightRelation, false);

  var valuePredicate = new lf.pred.ValuePredicate(
      table2['email'], rightRow2.payload()['email'], lf.eval.Type.EQ);
  var finalRelation = valuePredicate.eval(joinedRelation);
  assertEquals(1, finalRelation.entries.length);
  assertEquals(
      rightRow2.payload()['email'],
      finalRelation.entries[0].getField(table2['email']));
}


/**
 * Tests the conversion of a value predicate to a KeyRange.
 */
function testToKeyRange() {
  var table = schema.table('tableA');

  var p = new lf.pred.ValuePredicate(
      table['id'], 'otherId', lf.eval.Type.EQ);
  assertTrue(p.isKeyRangeCompatible());
  assertEquals('[otherId, otherId]', p.toKeyRange().toString());

  p = new lf.pred.ValuePredicate(
      table['id'], 10, lf.eval.Type.GTE);
  assertTrue(p.isKeyRangeCompatible());
  assertEquals('[10, unbound]', p.toKeyRange().toString());

  p = new lf.pred.ValuePredicate(
      table['id'], 10, lf.eval.Type.GT);
  assertTrue(p.isKeyRangeCompatible());
  assertEquals('(10, unbound]', p.toKeyRange().toString());

  p = new lf.pred.ValuePredicate(
      table['id'], 10, lf.eval.Type.LTE);
  assertTrue(p.isKeyRangeCompatible());
  assertEquals('[unbound, 10]', p.toKeyRange().toString());

  p = new lf.pred.ValuePredicate(
      table['id'], 10, lf.eval.Type.LT);
  assertTrue(p.isKeyRangeCompatible());
  assertEquals('[unbound, 10)', p.toKeyRange().toString());

  p = new lf.pred.ValuePredicate(
      table['id'], [10, 20], lf.eval.Type.BETWEEN);
  assertTrue(p.isKeyRangeCompatible());
  assertEquals('[10, 20]', p.toKeyRange().toString());

  p.setComplement(true);
  assertEquals(2, p.toKeyRange().length);
  assertEquals('[unbound, 10),(20, unbound]', p.toKeyRange().toString());
}


/**
 * Tests that isKeyRangeCompatible() returns false when the predicate involves
 * 'null' values.
 */
function testIsKeyRangeCompatible_False() {
  var table = schema.table('tableA');
  var p = new lf.pred.ValuePredicate(
      table['id'], null, lf.eval.Type.EQ);
  assertFalse(p.isKeyRangeCompatible());
}


/**
 * Generates sample table rows.
 * @param {number} rowCount The number of rows to be generated.
 * @return {!Array<!lf.Row>} The generated rows.
 */
function getSampleRows(rowCount) {
  var table = schema.table('tableA');
  var sampleRows = new Array(rowCount);

  for (var i = 0; i < rowCount; i++) {
    sampleRows[i] = table.createRow({
      'id': 'sampleId' + i.toString(),
      'name': 'sampleName' + i.toString()
    });
  }

  return sampleRows;
}


function testUnboundPredicate() {
  var table = schema.table('tableA');
  var sampleRow = getSampleRows(1)[0];
  var relation = lf.proc.Relation.fromRows([sampleRow], [table.getName()]);

  var binder = lf.bind(1);
  var p = new lf.pred.ValuePredicate(table['id'], binder, lf.eval.Type.EQ);

  // Predicate shall be unbound.
  assertTrue(p.value instanceof lf.Binder);

  // Tests binding.
  p.bind([9999, sampleRow.payload().id]);
  assertEquals(sampleRow.payload().id, p.value);
  assertFalse(p.value instanceof lf.Binder);
  var result = p.eval(relation);
  assertEquals(1, result.entries.length);

  // Tests binding to an invalid array throws error.
  try {
    p.bind([8888]);
  } catch (e) {
    // 510: Cannot bind to given array: out of range.
    assertEquals(510, e.code);
  }
}


function testUnboundPredicate_Array() {
  var table = schema.table('tableA');
  var sampleRows = getSampleRows(3);
  var ids = sampleRows.map(function(row) {
    return row.payload().id;
  });
  var relation = lf.proc.Relation.fromRows(sampleRows, [table.getName()]);

  var binder = [lf.bind(0), lf.bind(1), lf.bind(2)];
  var p = new lf.pred.ValuePredicate(table['id'], binder, lf.eval.Type.IN);

  // Tests binding.
  p.bind(ids);
  assertEquals(3, p.eval(relation).entries.length);
}


function testCopy_UnboundPredicate() {
  var table = schema.table('tableA');
  var sampleRow = getSampleRows(1)[0];

  var binder = lf.bind(1);
  var p = new lf.pred.ValuePredicate(table['id'], binder, lf.eval.Type.EQ);
  var p2 = p.copy();

  // Both predicates shall be unbound.
  assertTrue(p.value instanceof lf.Binder);
  assertTrue(p2.value instanceof lf.Binder);

  // Copying a bounded predicate shall still make it bounded.
  p.bind([9999, sampleRow.payload().id]);
  var p3 = p.copy();
  assertEquals(sampleRow.payload().id, p3.value);

  // The clone should also be able to bind to a new array.
  var sampleRow2 = getSampleRows(2)[1];
  p3.bind([9999, sampleRow2.payload().id]);
  assertEquals(sampleRow2.payload().id, p3.value);
}


function testCopy_UnboundPredicate_Array() {
  var table = schema.table('tableA');
  var sampleRows = getSampleRows(6);
  var ids = sampleRows.map(function(row) {
    return row.payload().id;
  });

  var binder = [lf.bind(0), lf.bind(1), lf.bind(2)];
  var p = new lf.pred.ValuePredicate(table['id'], binder, lf.eval.Type.IN);
  p.bind(ids);
  var p2 = p.copy();
  assertArrayEquals(ids.slice(0, 3), p2.value);

  // Tests binding.
  p2.bind(ids.slice(3));
  assertArrayEquals(ids.slice(3), p2.value);
}

