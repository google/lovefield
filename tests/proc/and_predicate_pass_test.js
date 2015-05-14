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
goog.require('lf.proc.AndPredicatePass');
goog.require('lf.proc.SelectNode');
goog.require('lf.proc.TableAccessNode');
goog.require('lf.schema.DataStoreType');
goog.require('lf.tree');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'AndPredicatePassTest');


/** @type {!lf.schema.Database} */
var schema;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(function(db) {
    schema = db.getSchema();
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests a simple tree, where only one AND predicate exists.
 */
function testSimpleTree() {
  var e = schema.getEmployee();

  var treeBefore =
      'select(combined_pred_and)\n' +
      '-table_access(Employee)\n';

  var treeAfter =
      'select(value_pred(Employee.id gt 100))\n' +
      '-select(value_pred(Employee.salary lt 100))\n' +
      '--table_access(Employee)\n';

  // Generating a simple tree that has just one SelectNode corresponding to an
  // AND predicate.
  var leftPredicate = e.id.gt('100');
  var rightPredicate = e.salary.lt(100);
  var rootNodeBefore = new lf.proc.SelectNode(
      lf.op.and(leftPredicate, rightPredicate));
  var tableAccessNode = new lf.proc.TableAccessNode(schema.getEmployee());
  rootNodeBefore.addChild(tableAccessNode);
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.AndPredicatePass();
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
}
