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
goog.require('lf.eval.Type');
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


function testEvalRow_Eq() {
  var table = schema.getTables()[0];
  var sampleRow = getSampleRows(1)[0];

  var predicate = new lf.pred.ValuePredicate(
      table.id, sampleRow.payload().id, lf.eval.Type.EQ);
  assertTrue(predicate.evalRow(sampleRow));

  predicate = new lf.pred.ValuePredicate(
      table.id, 'otherId', lf.eval.Type.EQ);
  assertFalse(predicate.evalRow(sampleRow));
}


function testEvalRow_Match() {
  var table = schema.getTables()[0];
  var sampleRow = getSampleRows(1)[0];

  // Testing true case.
  var predicate = new lf.pred.ValuePredicate(
      table.name, /sampleName0/, lf.eval.Type.MATCH);
  assertTrue(predicate.evalRow(sampleRow));

  predicate = new lf.pred.ValuePredicate(
      table.name, /\bsample[A-Za-z0-9]+\b/, lf.eval.Type.MATCH);
  assertTrue(predicate.evalRow(sampleRow));

  // Testing false case.
  predicate = new lf.pred.ValuePredicate(
      table.name, /SAMPLENAME0/, lf.eval.Type.MATCH);
  assertFalse(predicate.evalRow(sampleRow));
}


function testEvalRow_In() {
  var table = schema.getTables()[0];
  var sampleRow = getSampleRows(1)[0];

  // Testing true case.
  var predicate = new lf.pred.ValuePredicate(
      table.name, ['otherSampleName', 'sampleName0'],
      lf.eval.Type.IN);
  assertTrue(predicate.evalRow(sampleRow));

  predicate = new lf.pred.ValuePredicate(
      table.name, ['sampleName0'],
      lf.eval.Type.IN);
  assertTrue(predicate.evalRow(sampleRow));

  // Testing false case.
  predicate = new lf.pred.ValuePredicate(
      table.name, [], lf.eval.Type.IN);
  assertFalse(predicate.evalRow(sampleRow));

  predicate = new lf.pred.ValuePredicate(
      table.name, ['otherSampleName'], lf.eval.Type.IN);
  assertFalse(predicate.evalRow(sampleRow));
}


function testEvalRow_In_Reversed() {
  var table = schema.getTables()[0];
  var sampleRow = getSampleRows(1)[0];

  // Testing false case.
  var predicate = new lf.pred.ValuePredicate(
      table.name, ['otherSampleName', 'sampleName0'],
      lf.eval.Type.IN);
  predicate.setComplement(true);
  assertFalse(predicate.evalRow(sampleRow));

  predicate = new lf.pred.ValuePredicate(
      table.name, ['sampleName0'],
      lf.eval.Type.IN);
  predicate.setComplement(true);
  assertFalse(predicate.evalRow(sampleRow));

  // Testing true case.
  predicate = new lf.pred.ValuePredicate(
      table.name, [], lf.eval.Type.IN);
  predicate.setComplement(true);
  assertTrue(predicate.evalRow(sampleRow));

  predicate = new lf.pred.ValuePredicate(
      table.name, ['otherSampleName'], lf.eval.Type.IN);
  predicate.setComplement(true);
  assertTrue(predicate.evalRow(sampleRow));
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
    return entry.row.payload().name;
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
    return entry.row.payload().name;
  });

  assertArrayEquals(
      ['sampleName0', 'sampleName2', 'sampleName4'],
      actualNames);
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
