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
goog.require('lf.op');
goog.require('lf.proc.IndexRangeScanStep');
goog.require('lf.proc.JoinStep');
goog.require('lf.proc.MultiColumnOrPass');
goog.require('lf.proc.ProjectStep');
goog.require('lf.proc.SelectStep');
goog.require('lf.proc.TableAccessByRowIdStep');
goog.require('lf.proc.TableAccessFullStep');
goog.require('lf.query.SelectContext');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.hrSchema.getSchemaBuilder');
goog.require('lf.testing.proc.MockKeyRangeCalculator');
goog.require('lf.testing.treeutil');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'MultiColumnOrPassTest');


/** @type {!lf.schema.Database} */
var schema;


/** @type {!lf.schema.Table} */
var e;


/** @type {!lf.schema.Table} */
var j;


/** @type {!lf.proc.MultiColumnOrPass} */
var pass;


/** @type {!lf.Global} */
var global;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  var builder = lf.testing.hrSchema.getSchemaBuilder();
  global = builder.getGlobal();
  builder.connect(
      {storeType: lf.schema.DataStoreType.MEMORY}).then(function(db) {
    schema = db.getSchema();
    e = schema.table('Employee');
    j = schema.table('Job');
    pass = new lf.proc.MultiColumnOrPass(global);
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests a simple tree, where only one OR predicate exists and it can leverage
 * indices.
 */
function testSingleOrPredicate() {
  var treeBefore =
      'project()\n' +
      '-select(combined_pred_or)\n' +
      '--table_access(Employee)\n';

  var treeAfter =
      'project()\n' +
      '-table_access_by_row_id(Employee)\n' +
      '--multi_index_range_scan()\n' +
      '---index_range_scan(Employee.pkEmployee, [100, 100], natural)\n' +
      '---index_range_scan(Employee.idx_salary, [200, 200], natural)\n';

  var tree = constructTreeWithPredicates(
      [lf.op.or(e['id'].eq(100), e['salary'].eq(200))]);
  lf.testing.treeutil.assertTreeTransformation(
      tree, treeBefore, treeAfter, pass);
}


/**
 * Tests a tree where two separate OR predicates exist for the same table and
 * either of them could potentially be chosen by the optimizer. Currently
 * optimizer chooses the first encountered predicate that is eligible, without
 * comparing the cost two subsequent candidate prediacates.
 */
function testMultipleOrPredicates_AllIndexed() {
  var treeBefore =
      'project()\n' +
      '-select(combined_pred_or)\n' +
      '--select(combined_pred_or)\n' +
      '---table_access(Employee)\n';

  var treeAfter =
      'project()\n' +
      '-select(combined_pred_or)\n' +
      '--table_access_by_row_id(Employee)\n' +
      '---multi_index_range_scan()\n' +
      '----index_range_scan(Employee.pkEmployee, (100, unbound], natural)\n' +
      '----index_range_scan(Employee.idx_salary, (200, unbound], natural)\n';

  var tree = constructTreeWithPredicates(
      [lf.op.or(e['id'].gt(100), e['salary'].gt(200)),
       lf.op.or(e['jobId'].gt(300), e['departmentId'].gt(400))]);
  lf.testing.treeutil.assertTreeTransformation(
      tree, treeBefore, treeAfter, pass);
}


/**
 * Tests a tree where two separate OR predicates exist for the same table, but
 * only one of them could potentially be chosen by the optimizer. Ensures that
 * the optimizer finds that predicate and optimizes it.
 */
function testMultipleOrPredicates_SomeIndexed() {
  var treeBefore =
      'project()\n' +
      '-select(combined_pred_or)\n' +
      '--select(combined_pred_or)\n' +
      '---table_access(Employee)\n';

  var treeAfter =
      'project()\n' +
      '-select(combined_pred_or)\n' +
      '--table_access_by_row_id(Employee)\n' +
      '---multi_index_range_scan()\n' +
      '----index_range_scan(Employee.fk_JobId, (300, unbound], natural)\n' +
      '----index_range_scan(' +
          'Employee.fk_DepartmentId, (400, unbound], natural)\n';

  var tree = constructTreeWithPredicates(
      [lf.op.or(e['id'].gt(100), e['commissionPercent'].gt(200)),
       lf.op.or(e['jobId'].gt(300), e['departmentId'].gt(400))]);
  lf.testing.treeutil.assertTreeTransformation(
      tree, treeBefore, treeAfter, pass);
}


/**
 * Constructs a tree with multiple predicates.
 * @param {!Array<!lf.Predicate>} predicates
 * @return {lf.testing.treeutil.Tree} The constructed tree and corresponding
 *     query context.
 */
function constructTreeWithPredicates(predicates) {
  var queryContext = new lf.query.SelectContext(schema);
  queryContext.from = [e];
  queryContext.where = lf.op.and.apply(null, predicates);

  var tableAccessNode = new lf.proc.TableAccessFullStep(
      global, queryContext.from[0]);
  var selectNodes = predicates.map(function(predicate) {
    return new lf.proc.SelectStep(predicate.getId());
  });
  var projectNode = new lf.proc.ProjectStep([], null);
  var lastSelectNode = selectNodes[0];
  projectNode.addChild(lastSelectNode);
  for (var i = 1; i < selectNodes.length; i++) {
    lastSelectNode.addChild(selectNodes[i]);
    lastSelectNode = selectNodes[i];
  }
  selectNodes[selectNodes.length - 1].addChild(tableAccessNode);

  return {
    queryContext: queryContext,
    root: projectNode
  };
}


/**
 * Tests a tree where an OR predicate that refers to multiple tables exists.
 * Ensures that the optimization is not be applied and the tree remains
 * unaffected.
 */
function testCrossTableOrPredicates_Unaffected() {
  var treeBefore =
      'project()\n' +
      '-select(combined_pred_or)\n' +
      '--join(type: inner, impl: hash, join_pred(Job.id eq Employee.jobId))\n' +
      '---table_access(Employee)\n' +
      '---table_access(Job)\n';

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(schema);
    queryContext.from = [e, j];
    var joinPredicate = j['id'].eq(e['jobId']);
    var orPredicate = lf.op.or(e['salary'].lte(1000), j['maxSalary'].gte(200));
    queryContext.where = lf.op.and(orPredicate, joinPredicate);

    var projectStep = new lf.proc.ProjectStep([], null);
    var selectStep = new lf.proc.SelectStep(orPredicate.getId());
    var joinStep = new lf.proc.JoinStep(global, joinPredicate, false);
    var tableAccessStep1 = new lf.proc.TableAccessFullStep(
        global, queryContext.from[0]);
    var tableAccessStep2 = new lf.proc.TableAccessFullStep(
        global, queryContext.from[1]);

    projectStep.addChild(selectStep);
    selectStep.addChild(joinStep);
    joinStep.addChild(tableAccessStep1);
    joinStep.addChild(tableAccessStep2);

    return {
      queryContext: queryContext,
      root: projectStep
    };
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeBefore, pass);
}


/**
 * Test the case where a predicate of the form AND(c1, OR(c2, c3)) exists and
 * c1 has already been optimized by previous optimization passes. This
 * optimization does not apply.
 */
function testAlreadyOptimized_Unaffected() {
  var treeBefore =
      'project()\n' +
      '-select(combined_pred_or)\n' +
      '--table_access_by_row_id(Job)\n' +
      '---index_range_scan(Job.pkJob, [1, 1], natural)\n';

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(schema);
    queryContext.from = [j];
    var simplePredicate = j['id'].eq('1');
    var orPredicate = lf.op.or(
        j['id'].eq('2'), j['maxSalary'].eq(100));
    queryContext.where = lf.op.and(simplePredicate, orPredicate);

    var projectStep = new lf.proc.ProjectStep([], null);
    var selectStep = new lf.proc.SelectStep(orPredicate.getId());
    var tableAccessByRowIdStep = new lf.proc.TableAccessByRowIdStep(
        global, queryContext.from[0]);
    var indexRangeScanStep = new lf.proc.IndexRangeScanStep(
        global, j['id'].getIndex(),
        new lf.testing.proc.MockKeyRangeCalculator(
            simplePredicate.toKeyRange()), false);

    projectStep.addChild(selectStep);
    selectStep.addChild(tableAccessByRowIdStep);
    tableAccessByRowIdStep.addChild(indexRangeScanStep);

    return {
      queryContext: queryContext,
      root: projectStep
    };
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeBefore, pass);
}
