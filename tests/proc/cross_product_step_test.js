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
goog.require('lf.Row');
goog.require('lf.cache.Journal');
goog.require('lf.proc.CrossProductStep');
goog.require('lf.proc.Relation');
goog.require('lf.testing.MockEnv');
goog.require('lf.testing.proc.DummyStep');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'CrossProductTest');


function setUp() {
  asyncTestCase.waitForAsync('setUp');

  var env = new lf.testing.MockEnv();
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
  for (var i = 0; i < leftRowCount; i++) {
    leftRows[i] = lf.Row.create({
      'a': 'A' + i.toString(),
      'b': 'B' + i.toString()
    });
  }

  var rightRows = new Array(rightRowCount);
  for (var i = 0; i < rightRowCount; i++) {
    rightRows[i] = lf.Row.create({
      'c': 'C' + i.toString(),
      'd': 'D' + i.toString()
    });
  }

  var leftTableName = 'left';
  var rightTableName = 'right';
  var leftChild = new lf.testing.proc.DummyStep(
      lf.proc.Relation.fromRows(leftRows, [leftTableName]));
  var rightChild = new lf.testing.proc.DummyStep(
      lf.proc.Relation.fromRows(rightRows, [rightTableName]));

  var step = new lf.proc.CrossProductStep();
  step.addChild(leftChild);
  step.addChild(rightChild);

  var journal = new lf.cache.Journal([]);
  step.exec(journal).then(function(relation) {
    assertEquals(leftRowCount * rightRowCount, relation.entries.length);
    relation.entries.forEach(function(entry) {
      assertTrue(goog.isDefAndNotNull(entry.row.payload()[leftTableName]['a']));
      assertTrue(goog.isDefAndNotNull(entry.row.payload()[leftTableName]['b']));
      assertTrue(goog.isDefAndNotNull(
          entry.row.payload()[rightTableName]['c']));
      assertTrue(goog.isDefAndNotNull(
          entry.row.payload()[rightTableName]['d']));
    });
    asyncTestCase.continueTesting();
  }, fail);
}
