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
goog.require('lf.proc.DeleteNode');
goog.require('lf.proc.PhysicalPlanFactory');
goog.require('lf.proc.SelectNode');
goog.require('lf.proc.TableAccessNode');
goog.require('lf.testing.MockEnv');
goog.require('lf.tree');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'PhysicalPlanFactoryTest');


/** @type {!lf.proc.PhysicalPlanFactory} */
var physicalPlanFactory;


/** @type {!lf.testing.MockEnv} */
var env;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  env = new lf.testing.MockEnv();
  env.init().then(function() {
    physicalPlanFactory = new lf.proc.PhysicalPlanFactory();
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that the conversion of a DELETE logical query plan to a physical query
 * plan in the case where multiple predicates exist is performed as expected.
 * TODO(dpapad): Add similar test for remaining query types (INSERT,
 * INSERT_OR_REPLACE, UPDATE, SELECT).
 */
function testCreate_DeletePlan() {
  var logicalTree =
      'delete(tableA)\n' +
      '-select(value_pred(tableA.id))\n' +
      '--select(value_pred(tableA.name))\n' +
      '---table_access(tableA)\n';

  var physicalTree =
      'delete(tableA)\n' +
      '-select(value_pred(tableA.id))\n' +
      '--table_access_by_row_id(tableA)\n' +
      '---index_range_scan(tableA.idxName, [name, name])\n';

  var table = env.schema.getTables()[0];
  var deleteNode = new lf.proc.DeleteNode(table);
  var selectNode1 = new lf.proc.SelectNode(table.id.eq('id'));
  deleteNode.addChild(selectNode1);
  var selectNode2 = new lf.proc.SelectNode(table.name.eq('name'));
  selectNode1.addChild(selectNode2);
  var tableAccessNode = new lf.proc.TableAccessNode(table);
  selectNode2.addChild(tableAccessNode);

  assertEquals(logicalTree, lf.tree.toString(deleteNode));

  var physicalPlan = physicalPlanFactory.create(deleteNode);
  assertEquals(physicalTree, lf.tree.toString(physicalPlan.getRoot()));
}
