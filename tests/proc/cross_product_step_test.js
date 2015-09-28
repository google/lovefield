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
goog.require('lf.proc.CrossProductStep');
goog.require('lf.proc.NoOpStep');
goog.require('lf.proc.Relation');
goog.require('lf.testing.MockEnv');
goog.require('lf.testing.getSchemaBuilder');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'CrossProductTest');


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


/**
 * Tests that a cross product is calculated correctly.
 */
function testCrossProduct() {
  asyncTestCase.waitForAsync('testCrossProduct');

  var leftRowCount = 3;
  var rightRowCount = 4;

  var leftRows = new Array(leftRowCount);
  var leftTable = schema.table('tableA');
  for (var i = 0; i < leftRowCount; i++) {
    leftRows[i] = leftTable.createRow({
      'id': 'id' + i.toString(),
      'name': 'name' + i.toString()
    });
  }

  var rightRows = new Array(rightRowCount);
  var rightTable = schema.table('tableE');
  for (var i = 0; i < rightRowCount; i++) {
    rightRows[i] = rightTable.createRow({
      'id': 'id' + i.toString(),
      'email': 'email' + i.toString()
    });
  }

  var leftChild = new lf.proc.NoOpStep(
      [lf.proc.Relation.fromRows(leftRows, [leftTable.getName()])]);
  var rightChild = new lf.proc.NoOpStep(
      [lf.proc.Relation.fromRows(rightRows, [rightTable.getName()])]);

  var step = new lf.proc.CrossProductStep();
  step.addChild(leftChild);
  step.addChild(rightChild);

  step.exec().then(function(relations) {
    var relation = relations[0];
    assertEquals(leftRowCount * rightRowCount, relation.entries.length);
    relation.entries.forEach(function(entry) {
      assertTrue(goog.isDefAndNotNull(entry.getField(leftTable['id'])));
      assertTrue(goog.isDefAndNotNull(entry.getField(leftTable['name'])));
      assertTrue(goog.isDefAndNotNull(entry.getField(rightTable['id'])));
      assertTrue(goog.isDefAndNotNull(entry.getField(rightTable['email'])));
    });
    asyncTestCase.continueTesting();
  }, fail);
}


function testCrossProduct_PreviousJoins() {
  asyncTestCase.waitForAsync('testCrossProduct_PreviousJoins');

  var relation1Count = 3;
  var relation2Count = 4;
  var relation3Count = 5;

  var relation1Rows = [];
  var table1 = schema.table('tableA');
  for (var i = 0; i < relation1Count; i++) {
    var row = table1.createRow({
      'id': 'id' + i.toString(),
      'name': 'name' + i.toString()
    });
    relation1Rows.push(row);
  }

  var relation2Rows = [];
  var table2 = schema.table('tableB');
  for (var i = 0; i < relation2Count; i++) {
    var row = table2.createRow({
      'id': 'id' + i.toString(),
      'name': 'name' + i.toString()
    });
    relation2Rows.push(row);
  }

  var relation3Rows = [];
  var table3 = schema.table('tableE');
  for (var i = 0; i < relation3Count; i++) {
    var row = table3.createRow({
      'id': 'id' + i.toString(),
      'email': 'email' + i.toString()
    });
    relation3Rows.push(row);
  }

  var relation1 = lf.proc.Relation.fromRows(relation1Rows, [table1.getName()]);
  var relation2 = lf.proc.Relation.fromRows(relation2Rows, [table2.getName()]);
  var relation3 = lf.proc.Relation.fromRows(relation3Rows, [table3.getName()]);

  var relation1Step = new lf.proc.NoOpStep([relation1]);
  var relation2Step = new lf.proc.NoOpStep([relation2]);
  var relation3Step = new lf.proc.NoOpStep([relation3]);

  // Creating a tree structure composed of two cross product steps.
  var crossProductStep12 = new lf.proc.CrossProductStep();
  crossProductStep12.addChild(relation1Step);
  crossProductStep12.addChild(relation2Step);

  var crossProductStep123 = new lf.proc.CrossProductStep();
  crossProductStep123.addChild(crossProductStep12);
  crossProductStep123.addChild(relation3Step);

  crossProductStep123.exec().then(function(results) {
    var result = results[0];

    // Expecting the final result to be a cross product of all 3 tables.
    assertEquals(
        relation1Count * relation2Count * relation3Count,
        result.entries.length);
    result.entries.forEach(function(entry) {
      assertTrue(goog.isDefAndNotNull(entry.getField(table1['id'])));
      assertTrue(goog.isDefAndNotNull(entry.getField(table1['name'])));
      assertTrue(goog.isDefAndNotNull(entry.getField(table2['id'])));
      assertTrue(goog.isDefAndNotNull(entry.getField(table2['name'])));
      assertTrue(goog.isDefAndNotNull(entry.getField(table3['id'])));
      assertTrue(goog.isDefAndNotNull(entry.getField(table3['email'])));
    });
    asyncTestCase.continueTesting();
  }, fail);
}
