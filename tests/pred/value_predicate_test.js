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
goog.require('lf.Binder');
goog.require('lf.Exception');
goog.require('lf.bind');
goog.require('lf.eval.Type');
goog.require('lf.pred.JoinPredicate');
goog.require('lf.pred.ValuePredicate');
goog.require('lf.proc.Relation');
goog.require('lf.testing.MockEnv');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'ValuePredicate');


/** @type {!lf.schema.Database} */
var schema;


function setUp() {
  asyncTestCase.waitForAsync('setUp');

  var env = new lf.testing.MockEnv();
  env.init().then(function() {
    schema = env.schema;
    asyncTestCase.continueTesting();

  }, fail);
}


function testCopy() {
  var table = schema.getTables()[0];
  var original = new lf.pred.ValuePredicate(
      table.id, 'myId', lf.eval.Type.EQ);
  var copy = original.copy();

  assertTrue(copy instanceof lf.pred.ValuePredicate);
  assertFalse(original == copy);
  assertEquals(original.column, copy.column);
  assertEquals(original.value, copy.value);
  assertEquals(original.evaluatorType, copy.evaluatorType);
}


function testEval_Eq() {
  var table = schema.getTables()[0];
  var sampleRow = getSampleRows(1)[0];
  var relation = lf.proc.Relation.fromRows(
      [sampleRow], [table.getName()]);

  var predicate1 = new lf.pred.ValuePredicate(
      table.id, sampleRow.payload().id, lf.eval.Type.EQ);
  var finalRelation1 = predicate1.eval(relation);
  assertEquals(1, finalRelation1.entries.length);

  var predicate2 = new lf.pred.ValuePredicate(
      table.id, 'otherId', lf.eval.Type.EQ);
  var finalRelation2 = predicate2.eval(relation);
  assertEquals(0, finalRelation2.entries.length);
}


function testEval_Match() {
  var table = schema.getTables()[0];
  var sampleRow = getSampleRows(1)[0];
  var relation = lf.proc.Relation.fromRows(
      [sampleRow], [table.getName()]);

  // Testing true case.
  var predicate1 = new lf.pred.ValuePredicate(
      table.name, /sampleName0/, lf.eval.Type.MATCH);
  var finalRelation1 = predicate1.eval(relation);
  assertEquals(1, finalRelation1.entries.length);

  var predicate2 = new lf.pred.ValuePredicate(
      table.name, /\bsample[A-Za-z0-9]+\b/, lf.eval.Type.MATCH);
  var finalRelation2 = predicate2.eval(relation);
  assertEquals(1, finalRelation2.entries.length);

  // Testing false case.
  var predicate3 = new lf.pred.ValuePredicate(
      table.name, /SAMPLENAME0/, lf.eval.Type.MATCH);
  var finalRelation3 = predicate3.eval(relation);
  assertEquals(0, finalRelation3.entries.length);
}


/**
 * Tests ValuePredicate#eval() in the case where the predicate is of type
 * lf.eval.Type.IN.
 */
function testEval_In() {
  var table = schema.getTables()[0];
  var sampleRows = getSampleRows(6);
  var expectedNames = ['sampleName0', 'sampleName2', 'sampleName4'];
  var predicate = new lf.pred.ValuePredicate(
      table.name, expectedNames, lf.eval.Type.IN);

  var inputRelation = lf.proc.Relation.fromRows(sampleRows, ['tableA']);
  var outputRelation = predicate.eval(inputRelation);
  var actualNames = outputRelation.entries.map(function(entry) {
    return entry.getField(table.name);
  });
  assertArrayEquals(expectedNames, actualNames);
}


/**
 * Tests ValuePredicate#eval() in the case where the predicate is of type
 * lf.eval.Type.IN and the predicate has been reversed.
 */
function testEval_In_Reversed() {
  var table = schema.getTables()[0];
  var sampleRows = getSampleRows(6);
  var predicate = new lf.pred.ValuePredicate(
      table.name,
      ['sampleName1', 'sampleName3', 'sampleName5'],
      lf.eval.Type.IN);
  predicate.setComplement(true);

  var inputRelation = lf.proc.Relation.fromRows(sampleRows, ['tableA']);
  var outputRelation = predicate.eval(inputRelation);
  var actualNames = outputRelation.entries.map(function(entry) {
    return entry.getField(table.name);
  });

  assertArrayEquals(
      ['sampleName0', 'sampleName2', 'sampleName4'],
      actualNames);
}


/**
 * Testing the case where a ValuePredicate is applied on a relation that is the
 * result of a previous join operation.
 */
function testEval_Eq_PreviousJoin() {
  var table1 = schema.getTables()[0];
  var table2 = schema.getTables()[4];

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
      [leftRow], [table1.getName()]);
  var rightRelation = lf.proc.Relation.fromRows(
      [rightRow1, rightRow2], [table2.getName()]);

  var joinPredicate = new lf.pred.JoinPredicate(
      table1.id, table2.id, lf.eval.Type.EQ);
  var joinedRelation = joinPredicate.evalRelations(leftRelation, rightRelation);

  var valuePredicate = new lf.pred.ValuePredicate(
      table2.email, rightRow2.payload()['email'], lf.eval.Type.EQ);
  var finalRelation = valuePredicate.eval(joinedRelation);
  assertEquals(1, finalRelation.entries.length);
  assertEquals(
      rightRow2.payload()['email'],
      finalRelation.entries[0].getField(table2.email));
}


/**
 * Tests the conversion of a value predicate to a KeyRange.
 */
function testToKeyRange() {
  var table = schema.getTables()[0];

  var p = new lf.pred.ValuePredicate(
      table.id, 'otherId', lf.eval.Type.EQ);
  assertTrue(p.isKeyRangeCompatible());
  assertEquals('[otherId, otherId]', p.toKeyRange().toString());

  p = new lf.pred.ValuePredicate(
      table.id, 10, lf.eval.Type.GTE);
  assertTrue(p.isKeyRangeCompatible());
  assertEquals('[10, unbound]', p.toKeyRange().toString());

  p = new lf.pred.ValuePredicate(
      table.id, 10, lf.eval.Type.GT);
  assertTrue(p.isKeyRangeCompatible());
  assertEquals('(10, unbound]', p.toKeyRange().toString());

  p = new lf.pred.ValuePredicate(
      table.id, 10, lf.eval.Type.LTE);
  assertTrue(p.isKeyRangeCompatible());
  assertEquals('[unbound, 10]', p.toKeyRange().toString());

  p = new lf.pred.ValuePredicate(
      table.id, 10, lf.eval.Type.LT);
  assertTrue(p.isKeyRangeCompatible());
  assertEquals('[unbound, 10)', p.toKeyRange().toString());

  p = new lf.pred.ValuePredicate(
      table.id, [10, 20], lf.eval.Type.BETWEEN);
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
  var table = schema.getTables()[0];
  var p = new lf.pred.ValuePredicate(
      table.id, null, lf.eval.Type.EQ);
  assertFalse(p.isKeyRangeCompatible());
}


/**
 * Generates sample table rows.
 * @param {number} rowCount The number of rows to be generated.
 * @return {!Array.<!lf.Row>} The generated rows.
 */
function getSampleRows(rowCount) {
  var table = schema.getTables()[0];
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
  var table = schema.getTables()[0];
  var sampleRow = getSampleRows(1)[0];
  var relation = lf.proc.Relation.fromRows([sampleRow], [table.getName()]);

  var binder = lf.bind(1);
  var p = new lf.pred.ValuePredicate(table.id, binder, lf.eval.Type.EQ, 1);

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
    assertEquals(lf.Exception.Type.SYNTAX, e.name);
  }
}


function testCopy_UnboundPredicate() {
  var table = schema.getTables()[0];
  var sampleRow = getSampleRows(1)[0];

  var binder = lf.bind(1);
  var p = new lf.pred.ValuePredicate(table.id, binder, lf.eval.Type.EQ, 1);
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
