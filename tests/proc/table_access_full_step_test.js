/**
 * @license
 * Copyright 2015 The Lovefield Project Authors. All Rights Reserved.
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
goog.require('lf.cache.Journal');
goog.require('lf.proc.TableAccessFullStep');
goog.require('lf.testing.MockEnv');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'TableAccessFullStepTest');


/** @type {!lf.schema.Database} */
var schema;


function setUp() {
  asyncTestCase.waitForAsync('setUp');

  var env = new lf.testing.MockEnv();
  env.init().then(function() {
    schema = env.schema;
    return env.addSampleData();
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


function testTableAccessFullStep() {
  checkTableAccessFullStep('testTableAccessFullStep', schema.tables()[0]);
}


function testTableAccessFullStep_Alias() {
  checkTableAccessFullStep(
      'testTableAccessFullStep_Alias',
      schema.tables()[0].as('SomeTableAlias'));
}


/**
 * Checks that a TableAccessFullStep that refers to the given table produces
 * the expected results.
 * @param {string} description
 * @param {!lf.schema.Table} table
 */
function checkTableAccessFullStep(description, table) {
  asyncTestCase.waitForAsync(description);

  var step = new lf.proc.TableAccessFullStep(lf.Global.get(), table);
  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  step.exec(journal).then(
      function(relations) {
        var relation = relations[0];
        assertFalse(relation.isPrefixApplied());
        assertArrayEquals([table.getEffectiveName()], relation.getTables());
        assertTrue(relation.entries.length > 0);
        asyncTestCase.continueTesting();
      }, fail);
}
