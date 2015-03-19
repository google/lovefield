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
goog.require('lf.Global');
goog.require('lf.Row');
goog.require('lf.cache.Journal');
goog.require('lf.proc.LimitStep');
goog.require('lf.proc.Relation');
goog.require('lf.testing.MockEnv');
goog.require('lf.testing.proc.DummyStep');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'LimitStepTest');


function setUp() {
  asyncTestCase.waitForAsync('setUp');

  var env = new lf.testing.MockEnv();
  env.init().then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


function testExec_LimitLessThanResults() {
  checkExec(/* sampleDataCount */ 20, /* limit */ 10);
}


function testExec_LimitMoreThanResults() {
  checkExec(/* sampleDataCount */ 20, /* limit */ 100);
}


function testExec_LimitEqualToResults() {
  checkExec(/* sampleDataCount */ 20, /* limit */ 20);
}


function testExec_LimitZero() {
  checkExec(/* sampleDataCount */ 20, /* limit */ 0);
}


/**
 * Checks that the number of returned results is as expected.
 * @param {number} sampleDataCount The total number of rows available.
 * @param {number} limit The max number of rows requested by the user.
 */
function checkExec(sampleDataCount, limit) {
  asyncTestCase.waitForAsync('testExec' + sampleDataCount + limit);
  var rows = generateSampleRows(sampleDataCount);
  var tableName = 'dummyTable';
  var childStep = new lf.testing.proc.DummyStep(
      [lf.proc.Relation.fromRows(rows, [tableName])]);

  var step = new lf.proc.LimitStep(limit);
  step.addChild(childStep);

  var journal = new lf.cache.Journal(lf.Global.get(), []);
  step.exec(journal).then(function(relations) {
    assertEquals(
        Math.min(limit, sampleDataCount),
        relations[0].entries.length);
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Generates sample data for testing.
 * @param {number} rowCount The number of sample rows to be generated.
 * @return {!Array<!lf.Row>}
 */
function generateSampleRows(rowCount) {
  var rows = new Array(rowCount);

  for (var i = 0; i < rowCount; i++) {
    rows[i] = lf.Row.create({
      'id': 'id' + i.toString()
    });
  }

  return rows;
}
