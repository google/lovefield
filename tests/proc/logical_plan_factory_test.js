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
goog.require('lf.Global');
goog.require('lf.op');
goog.require('lf.proc.LogicalPlanFactory');
goog.require('lf.query.DeleteBuilder');
goog.require('lf.query.SelectBuilder');
goog.require('lf.query.UpdateBuilder');
goog.require('lf.testing.MockEnv');
goog.require('lf.testing.getSchemaBuilder');
goog.require('lf.tree');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'LogicalPlanFactoryTest');


/** @type {!lf.proc.LogicalPlanFactory} */
var logicalPlanFactory;


/** @type {!lf.testing.MockEnv} */
var env;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  env = new lf.testing.MockEnv(lf.testing.getSchemaBuilder().getSchema());
  env.init().then(function() {
    logicalPlanFactory = new lf.proc.LogicalPlanFactory();
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that the generated logical query plan for a simple DELETE query is as
 * expected and also that the query object itself is not mutated as part of
 * generating a plan. This is essential such that calling
 * DefaultBuilder#explain() does not have any side effects which would prevent
 * a subsequent call to DefaultBuilder#exec() from operating on the same query
 * object.
 */
function testCreate_DeletePlan() {
  var table = env.schema.table('tableA');

  var queryBuilder = new lf.query.DeleteBuilder(lf.Global.get());
  queryBuilder.
      from(table).
      where(lf.op.and(table['id'].eq('id'), table['name'].eq('name')));

  var query = queryBuilder.getQuery();
  assertEquals(
      2,
      /** @type {!lf.pred.PredicateNode} */ (query.where).getChildCount());

  var expectedTree =
      'delete(tableA)\n' +
      '-select(value_pred(tableA.id eq id))\n' +
      '--select(value_pred(tableA.name eq name))\n' +
      '---table_access(tableA)\n';

  var logicalPlan = logicalPlanFactory.create(query);
  assertEquals(expectedTree, lf.tree.toString(logicalPlan.getRoot()));

  assertEquals(
      2,
      /** @type {!lf.pred.PredicateNode} */ (query.where).getChildCount());
}


/**
 * Tests that the generated logical query plan for a simple SELECT query is as
 * expected and also that the query object itself is not mutated as part of
 * generating a plan.
 */
function testCreate_SelectPlan() {
  var table = env.schema.table('tableA');

  var queryBuilder = new lf.query.SelectBuilder(lf.Global.get(), []);
  queryBuilder.
      from(table).
      where(lf.op.and(table['id'].eq('id'), table['name'].eq('name')));

  var query = queryBuilder.getQuery();
  assertEquals(
      2,
      /** @type {!lf.pred.PredicateNode} */ (query.where).getChildCount());

  var expectedTree =
      'project()\n' +
      '-select(value_pred(tableA.id eq id))\n' +
      '--select(value_pred(tableA.name eq name))\n' +
      '---table_access(tableA)\n';

  var logicalPlan = logicalPlanFactory.create(query);
  assertEquals(expectedTree, lf.tree.toString(logicalPlan.getRoot()));

  assertEquals(
      2,
      /** @type {!lf.pred.PredicateNode} */ (query.where).getChildCount());
}


/**
 * Tests that the generated logical query plan for a SELECT query with "SKIP 0"
 * does not include a "skip" node, since it has no effect on the query results.
 */
function testCreate_SelectPlan_SkipZero() {
  var table = env.schema.table('tableA');
  var queryBuilder = new lf.query.SelectBuilder(lf.Global.get(), []);
  queryBuilder.from(table).skip(0);

  var query = queryBuilder.getQuery();

  var expectedTree =
      'project()\n' +
      '-table_access(tableA)\n';

  var logicalPlan = logicalPlanFactory.create(query);
  assertEquals(expectedTree, lf.tree.toString(logicalPlan.getRoot()));
}


/**
 * Tests that the generated logical query plan for a SELECT query with "LIMIT 0"
 * does in fact include a "limit" node.
 */
function testCreate_SelectPlan_LimitZero() {
  var table = env.schema.table('tableA');
  var queryBuilder = new lf.query.SelectBuilder(lf.Global.get(), []);
  queryBuilder.from(table).limit(0);

  var query = queryBuilder.getQuery();

  var expectedTree =
      'limit(0)\n' +
      '-project()\n' +
      '--table_access(tableA)\n';

  var logicalPlan = logicalPlanFactory.create(query);
  assertEquals(expectedTree, lf.tree.toString(logicalPlan.getRoot()));
}


/**
 * Tests that the generated logical query plan for a simple UPDATE query is as
 * expected and also that the query object itself is not mutated as part of
 * generating a plan.
 */
function testCreate_UpdatePlan() {
  var table = env.schema.table('tableA');

  var queryBuilder = new lf.query.UpdateBuilder(lf.Global.get(), table);
  queryBuilder.
      set(table['name'], 'NewName').
      where(lf.op.and(table['id'].eq('id'), table['name'].eq('name')));

  var query = queryBuilder.getQuery();
  assertEquals(
      2,
      /** @type {!lf.pred.PredicateNode} */ (query.where).getChildCount());

  var expectedTree =
      'update(tableA)\n' +
      '-select(combined_pred_and)\n' +
      '--table_access(tableA)\n';

  var logicalPlan = logicalPlanFactory.create(query);
  assertEquals(expectedTree, lf.tree.toString(logicalPlan.getRoot()));

  assertEquals(
      2,
      /** @type {!lf.pred.PredicateNode} */ (query.where).getChildCount());
}
