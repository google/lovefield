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
goog.require('lf.fn');
goog.require('lf.proc.AggregationStep');
goog.require('lf.proc.GetRowCountPass');
goog.require('lf.proc.ProjectStep');
goog.require('lf.proc.SelectStep');
goog.require('lf.proc.TableAccessFullStep');
goog.require('lf.query.SelectContext');
goog.require('lf.schema');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.treeutil');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'GetRowCountPassTest');


/** @type {!lf.schema.Database} */
var schema;


/** @type {!lf.Global} */
var global;


/** @type {!lf.proc.GetRowCountPass} */
var pass;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  getSchemaBuilder().connect({storeType: lf.schema.DataStoreType.MEMORY}).then(
      function(db) {
        schema = db.getSchema();
        global = db.global_;
        pass = new lf.proc.GetRowCountPass(global);
        asyncTestCase.continueTesting();
      }, fail);
}


function getSchemaBuilder() {
  var schemaBuilder = lf.schema.create('testschema', 1);
  schemaBuilder.createTable('TableFoo').
      addColumn('id1', lf.Type.STRING).
      addColumn('id2', lf.Type.STRING);
  return schemaBuilder;
}


/**
 * Tests a simple tree, where only one AND predicate exists.
 */
function testSimpleTree() {
  var tf = schema.table('TableFoo');

  var treeBefore =
      'project(COUNT(*))\n' +
      '-aggregation(COUNT(*))\n' +
      '--table_access(TableFoo)\n';

  var treeAfter =
      'project(COUNT(*))\n' +
      '-aggregation(COUNT(*))\n' +
      '--get_row_count(TableFoo)\n';

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(schema);
    queryContext.from = [tf];
    queryContext.columns = [lf.fn.count()];

    var tableAccessStep = new lf.proc.TableAccessFullStep(
        global, queryContext.from[0]);
    var aggregationStep = new lf.proc.AggregationStep(queryContext.columns);
    var projectStep = new lf.proc.ProjectStep(queryContext.columns, null);
    projectStep.addChild(aggregationStep);
    aggregationStep.addChild(tableAccessStep);

    return {
      queryContext: queryContext,
      root: projectStep
    };
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeAfter, pass);
}


/**
 * Test that this optimization does not apply COUNT(column) is used.
 */
function testTreeUnaffected1() {
  var tf = schema.table('TableFoo');

  var treeBefore =
      'project(COUNT(TableFoo.id1))\n' +
      '-aggregation(COUNT(TableFoo.id1))\n' +
      '--table_access(TableFoo)\n';

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(schema);
    queryContext.from = [tf];
    queryContext.columns = [lf.fn.count(tf['id1'])];

    var tableAccessStep = new lf.proc.TableAccessFullStep(
        global, queryContext.from[0]);
    var aggregationStep = new lf.proc.AggregationStep(queryContext.columns);
    var projectStep = new lf.proc.ProjectStep(queryContext.columns, null);
    projectStep.addChild(aggregationStep);
    aggregationStep.addChild(tableAccessStep);

    return {
      queryContext: queryContext,
      root: projectStep
    };
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeBefore, pass);
}


/**
 * Test that this optimization does not apply if a WHERE clause exists.
 */
function testTreeUnaffected2() {
  var tf = schema.table('TableFoo');

  var treeBefore =
      'project(COUNT(*))\n' +
      '-aggregation(COUNT(*))\n' +
      '--select(value_pred(TableFoo.id1 eq someId))\n' +
      '---table_access(TableFoo)\n';

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(schema);
    queryContext.from = [tf];
    queryContext.columns = [lf.fn.count()];
    queryContext.where = tf['id1'].eq('someId');

    var tableAccessStep = new lf.proc.TableAccessFullStep(
        global, queryContext.from[0]);
    var selectStep = new lf.proc.SelectStep(queryContext.where.getId());
    var aggregationStep = new lf.proc.AggregationStep(queryContext.columns);
    var projectStep = new lf.proc.ProjectStep(queryContext.columns, null);
    projectStep.addChild(aggregationStep);
    aggregationStep.addChild(selectStep);
    selectStep.addChild(tableAccessStep);

    return {
      queryContext: queryContext,
      root: projectStep
    };
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeBefore, pass);
}
