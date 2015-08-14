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
goog.require('lf.Type');
goog.require('lf.op');
goog.require('lf.proc.IndexJoinPass');
goog.require('lf.proc.JoinStep');
goog.require('lf.proc.ProjectStep');
goog.require('lf.proc.SelectStep');
goog.require('lf.proc.TableAccessFullStep');
goog.require('lf.query.SelectContext');
goog.require('lf.schema');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.treeutil');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'IndexJoinPassTest');


/** @type {!lf.schema.Database} */
var schema;


/** @type {!lf.Global} */
var global;


/** @type {!lf.proc.IndexJoinPass} */
var pass;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  getSchemaBuilder().connect({storeType: lf.schema.DataStoreType.MEMORY}).then(
      function(db) {
        schema = db.getSchema();
        global = db.global_;
        pass = new lf.proc.IndexJoinPass();
        asyncTestCase.continueTesting();
      }, fail);
}


function getSchemaBuilder() {
  var schemaBuilder = lf.schema.create('testschema', 1);
  schemaBuilder.createTable('TableA').
      addColumn('id', lf.Type.NUMBER).
      addIndex('idx_id', ['id']);

  schemaBuilder.createTable('TableB').
      addColumn('id', lf.Type.NUMBER).
      addIndex('idx_id', ['id']);

  schemaBuilder.createTable('TableC').
      addColumn('id', lf.Type.NUMBER);
  return schemaBuilder;
}


/**
 * Tests a simple tree, where
 *  - Only one join predicate exists.
 *  - Both columns of the join predicate have an index.
 *  - The columns in the join predicate appear in the same order as the tables
 *    of the join, left TableA, right TableB.
 */
function testBothColumnsIndexed() {
  var treeBefore =
      'project()\n' +
      '-join(type: inner, impl: hash, join_pred(TableA.id eq TableB.id))\n' +
      '--table_access(TableA)\n' +
      '--table_access(TableB)\n';

  var treeAfter =
      'project()\n' +
      '-join(type: inner, impl: index_nested_loop, ' +
          'join_pred(TableA.id eq TableB.id))\n' +
      '--table_access(TableA)\n' +
      '--no_op_step(TableB)\n';

  lf.testing.treeutil.assertTreeTransformation(
      constructTree1(
          schema.table('TableA'), schema.table('TableB'), false),
      treeBefore, treeAfter, pass);
}


/**
 * Tests a simple tree, where
 *  - Only one join predicate exists.
 *  - Both columns of the join predicate have an index.
 *  - The columns in the join predicate appear in the reverse order compared
 *    to the order of the tables.
 *    Predicate has TableB on the left, TableA on the right, where as the join
 *    has TableA on the left and TableB on the right.
 */
function testBothColumnsIndexed_ReversePredicate() {
  var treeBefore =
      'project()\n' +
      '-join(type: inner, impl: hash, join_pred(TableB.id eq TableA.id))\n' +
      '--table_access(TableA)\n' +
      '--table_access(TableB)\n';

  var treeAfter =
      'project()\n' +
      '-join(type: inner, impl: index_nested_loop, ' +
          'join_pred(TableB.id eq TableA.id))\n' +
      '--table_access(TableA)\n' +
      '--no_op_step(TableB)\n';

  lf.testing.treeutil.assertTreeTransformation(
      constructTree1(
          schema.table('TableA'), schema.table('TableB'), true),
      treeBefore, treeAfter, pass);
}


/**
 * Tests a simple tree, where
 *  - Only one join predicate exists.
 *  - Only the column of the left table has an index.
 * Ensures that index join is chosen for the left table.
 */
function testLeftTableColumnIndexed() {
  var treeBefore =
      'project()\n' +
      '-join(type: inner, impl: hash, join_pred(TableA.id eq TableC.id))\n' +
      '--table_access(TableA)\n' +
      '--table_access(TableC)\n';

  var treeAfter =
      'project()\n' +
      '-join(type: inner, impl: index_nested_loop, ' +
          'join_pred(TableA.id eq TableC.id))\n' +
      '--no_op_step(TableA)\n' +
      '--table_access(TableC)\n';

  lf.testing.treeutil.assertTreeTransformation(
      constructTree2(false), treeBefore, treeAfter, pass);
}


/**
 * Tests a simple tree, where
 *  - Only one join predicate exists.
 *  - Only the column of the right table has an index.
 * Ensures that index join is chosen for the right table.
 */
function testRightTableColumnIndexed() {
  var treeBefore =
      'project()\n' +
      '-join(type: inner, impl: hash, join_pred(TableA.id eq TableC.id))\n' +
      '--table_access(TableC)\n' +
      '--table_access(TableA)\n';

  var treeAfter =
      'project()\n' +
      '-join(type: inner, impl: index_nested_loop, ' +
          'join_pred(TableA.id eq TableC.id))\n' +
      '--table_access(TableC)\n' +
      '--no_op_step(TableA)\n';

  lf.testing.treeutil.assertTreeTransformation(
      constructTree2(true), treeBefore, treeAfter, pass);
}


/**
 * Tests a simple tree, where
 *  - Only one join predicate exists, which is a self-join.
 *  - Both columns of the join predicate have an index.
 * Ensures that index join is chosen for the right table, and that a NoOpStep
 * is inserted in the tree for the chosen table.
 */
function testSelfJoinTree() {
  var treeBefore =
      'project()\n' +
      '-join(type: inner, impl: hash, join_pred(t1.id eq t2.id))\n' +
      '--table_access(TableA as t1)\n' +
      '--table_access(TableA as t2)\n';

  var treeAfter =
      'project()\n' +
      '-join(type: inner, impl: index_nested_loop, ' +
          'join_pred(t1.id eq t2.id))\n' +
      '--table_access(TableA as t1)\n' +
      '--no_op_step(t2)\n';

  lf.testing.treeutil.assertTreeTransformation(
      constructTree1(
          schema.table('TableA').as('t1'),
          schema.table('TableA').as('t2'), false),
      treeBefore, treeAfter, pass);
}


/**
 * Tests a simple tree, where
 *  - Only one join predicate exists.
 *  - Only the column of the right table has an index, but there is a SelectStep
 *    after the table access.
 * Ensures that index join optimization is not applied in this case.
 */
function testTreeUnaffected() {
  var treeBefore =
      'project()\n' +
      '-join(type: inner, impl: hash, join_pred(TableC.id eq TableB.id))\n' +
      '--table_access(TableC)\n' +
      '--select(value_pred(TableB.id gt 100))\n' +
      '---table_access(TableB)\n';

  lf.testing.treeutil.assertTreeTransformation(
      constructTree3(), treeBefore, treeBefore, pass);
}


/**
 * @param {!lf.schema.Table} table1
 * @param {!lf.schema.Table} table2
 * @param {boolean} predicateReverseOrder Whether to construct the predicate in
 *     reverse order (table2 refrred on the left side of the predicate, table1
 *     on the right);
 * @return {lf.testing.treeutil.Tree}
 */
function constructTree1(table1, table2, predicateReverseOrder) {
  var queryContext = new lf.query.SelectContext(schema);
  queryContext.from = [table1, table2];
  queryContext.columns = [];
  var joinPredicate = predicateReverseOrder ?
      table2['id'].eq(table1['id']) : table1['id'].eq(table2['id']);
  queryContext.where = joinPredicate;

  var tableAccessStep1 = new lf.proc.TableAccessFullStep(
      global, queryContext.from[0]);
  var tableAccessStep2 = new lf.proc.TableAccessFullStep(
      global, queryContext.from[1]);
  var joinStep = new lf.proc.JoinStep(
      global, joinPredicate, false /* isOuterJoin*/);
  var projectStep = new lf.proc.ProjectStep(queryContext.columns, null);
  projectStep.addChild(joinStep);
  joinStep.addChild(tableAccessStep1);
  joinStep.addChild(tableAccessStep2);

  return {
    queryContext: queryContext,
    root: projectStep
  };
}


/**
 * @param {boolean} tableRerevseOrder
 * @return {lf.testing.treeutil.Tree}
 */
function constructTree2(tableRerevseOrder) {
  var tableA = schema.table('TableA');
  var tableC = schema.table('TableC');
  var t1 = tableRerevseOrder ? tableC : tableA;
  var t2 = tableRerevseOrder ? tableA : tableC;

  var queryContext = new lf.query.SelectContext(schema);
  queryContext.from = [t1, t2];
  queryContext.columns = [];
  var joinPredicate = tableA['id'].eq(tableC['id']);
  queryContext.where = joinPredicate;

  var tableAccessStep1 = new lf.proc.TableAccessFullStep(
      global, queryContext.from[0]);
  var tableAccessStep2 = new lf.proc.TableAccessFullStep(
      global, queryContext.from[1]);
  var joinStep = new lf.proc.JoinStep(
      global, joinPredicate, false /* isOuterJoin*/);
  var projectStep = new lf.proc.ProjectStep(queryContext.columns, null);
  projectStep.addChild(joinStep);
  joinStep.addChild(tableAccessStep1);
  joinStep.addChild(tableAccessStep2);

  return {
    queryContext: queryContext,
    root: projectStep
  };
}


/** @return {lf.testing.treeutil.Tree} */
function constructTree3() {
  var t1 = schema.table('TableC');
  var t2 = schema.table('TableB');

  var queryContext = new lf.query.SelectContext(schema);
  queryContext.from = [t1, t2];
  var joinPredicate = t1['id'].eq(t2['id']);
  var valuePredicate = t2['id'].gt(100);
  queryContext.where = lf.op.and(valuePredicate, joinPredicate);
  queryContext.columns = [];

  var tableAccessStep1 = new lf.proc.TableAccessFullStep(
      global, queryContext.from[0]);
  var tableAccessStep2 = new lf.proc.TableAccessFullStep(
      global, queryContext.from[1]);
  var selectStep = new lf.proc.SelectStep(valuePredicate.getId());
  var joinStep = new lf.proc.JoinStep(
      global, joinPredicate, false /* isOuterJoin*/);
  var projectStep = new lf.proc.ProjectStep(queryContext.columns, null);

  joinStep.addChild(tableAccessStep1);
  selectStep.addChild(tableAccessStep2);
  joinStep.addChild(selectStep);
  projectStep.addChild(joinStep);

  return {
    queryContext: queryContext,
    root: projectStep
  };
}


