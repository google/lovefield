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
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('lf.Global');
goog.require('lf.op');
goog.require('lf.proc.DeleteNode');
goog.require('lf.proc.LogicalQueryPlan');
goog.require('lf.proc.PhysicalPlanFactory');
goog.require('lf.proc.SelectNode');
goog.require('lf.proc.TableAccessNode');
goog.require('lf.query.DeleteContext');
goog.require('lf.structs.set');
goog.require('lf.testing.MockEnv');
goog.require('lf.testing.getSchemaBuilder');
goog.require('lf.testing.util');
goog.require('lf.tree');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'PhysicalPlanFactoryTest');


/** @type {!lf.proc.PhysicalPlanFactory} */
var physicalPlanFactory;


/** @type {!lf.testing.MockEnv} */
var env;


/** @type {!goog.testing.PropertyReplacer} */
var propertyReplacer;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  propertyReplacer = new goog.testing.PropertyReplacer();

  env = new lf.testing.MockEnv(lf.testing.getSchemaBuilder().getSchema());
  env.init().then(function() {
    physicalPlanFactory = new lf.proc.PhysicalPlanFactory(lf.Global.get());
    asyncTestCase.continueTesting();
  }, fail);
}


function tearDown() {
  propertyReplacer.reset();
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
      '-select(value_pred(tableA.id eq id))\n' +
      '--select(value_pred(tableA.name eq name))\n' +
      '---table_access(tableA)\n';

  var physicalTree =
      'delete(tableA)\n' +
      '-select(value_pred(tableA.id eq id))\n' +
      '--table_access_by_row_id(tableA)\n' +
      '---index_range_scan(tableA.idxName, [name, name], natural)\n';

  var table = env.schema.table('tableA');
  var queryContext = new lf.query.DeleteContext(env.schema);
  queryContext.from = table;
  queryContext.where = lf.op.and(
      table['id'].eq('id'), table['name'].eq('name'));

  lf.testing.util.simulateIndexCost(
      propertyReplacer, env.indexStore, table['id'].getIndices()[0], 100);
  lf.testing.util.simulateIndexCost(
      propertyReplacer, env.indexStore, table['name'].getIndices()[0], 1);

  var deleteNode = new lf.proc.DeleteNode(table);
  var selectNode1 = new lf.proc.SelectNode(/** @type {!lf.Predicate} */ (
      /** @type {!lf.pred.PredicateNode} */ (
          queryContext.where).getChildAt(0)));
  deleteNode.addChild(selectNode1);
  var selectNode2 = new lf.proc.SelectNode(/** @type {!lf.Predicate} */ (
      /** @type {!lf.pred.PredicateNode} */ (
          queryContext.where).getChildAt(1)));
  selectNode1.addChild(selectNode2);
  var tableAccessNode = new lf.proc.TableAccessNode(queryContext.from);
  selectNode2.addChild(tableAccessNode);

  assertEquals(logicalTree, lf.tree.toString(deleteNode));
  var testScope = lf.structs.set.create();
  testScope.add(table);
  var logicalPlan = new lf.proc.LogicalQueryPlan(deleteNode, testScope);
  var physicalPlan = physicalPlanFactory.create(logicalPlan, queryContext);
  var toStringFn = function(node) {
    return node.toContextString(queryContext) + '\n';
  };
  assertEquals(
      physicalTree, lf.tree.toString(physicalPlan.getRoot(), toStringFn));
}
