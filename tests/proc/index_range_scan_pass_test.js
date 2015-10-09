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
goog.require('hr.db');
goog.require('lf.Order');
goog.require('lf.index.Stats');
goog.require('lf.op');
goog.require('lf.proc.CrossProductStep');
goog.require('lf.proc.IndexRangeScanPass');
goog.require('lf.proc.JoinStep');
goog.require('lf.proc.LimitStep');
goog.require('lf.proc.OrderByStep');
goog.require('lf.proc.ProjectStep');
goog.require('lf.proc.SelectStep');
goog.require('lf.proc.TableAccessFullStep');
goog.require('lf.query.SelectContext');
goog.require('lf.schema.DataStoreType');
goog.require('lf.service');
goog.require('lf.testing.treeutil');
goog.require('lf.testing.util');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'IndexRangeScanPassTest');


/** @type {!lf.Database} */
var db;


/** @type {!hr.db.schema.Employee} */
var e;


/** @type {!hr.db.schema.Job} */
var j;


/** @type {!hr.db.schema.Department} */
var d;


/** @type {!hr.db.schema.CrossColumnTable} */
var cct;


/** @type {!hr.db.schema.DummyTable} */
var dt;


/** @type {!lf.index.IndexStore} */
var indexStore;


/** @type {!lf.proc.IndexRangeScanPass} */
var pass;


/** @type {!goog.testing.PropertyReplacer} */
var propertyReplacer;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  propertyReplacer = new goog.testing.PropertyReplacer();

  var schema = hr.db.getSchema();
  e = schema.getEmployee();
  j = schema.getJob();
  d = schema.getDepartment();
  cct = schema.getCrossColumnTable();
  dt = schema.getDummyTable();

  hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(
      function(database) {
        db = database;
        indexStore =  /** @type {!lf.index.IndexStore} */ (
            hr.db.getGlobal().getService(lf.service.INDEX_STORE));
        pass = new lf.proc.IndexRangeScanPass(hr.db.getGlobal());
      }).then(
      function() {
        asyncTestCase.continueTesting();
      }, fail);
}


function tearDown() {
  propertyReplacer.reset();
  db.close();
}


/**
 * Tests a simple tree, where only one value predicate exists.
 */
function testSimpleTree() {
  var treeBefore =
      'limit(20)\n' +
      '-project()\n' +
      '--select(value_pred(Employee.id gt 100))\n' +
      '---table_access(Employee)\n';

  var treeAfter =
      'limit(20)\n' +
      '-project()\n' +
      '--table_access_by_row_id(Employee)\n' +
      '---index_range_scan(Employee.pkEmployee, (100, unbound], natural)\n';

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(hr.db.getSchema());
    queryContext.from = [e];
    queryContext.where = e.id.gt('100');
    queryContext.limit = 20;

    var limitNode = new lf.proc.LimitStep();
    var projectNode = new lf.proc.ProjectStep([], null);
    limitNode.addChild(projectNode);
    var selectNode = new lf.proc.SelectStep(queryContext.where.getId());
    projectNode.addChild(selectNode);
    var tableAccessNode = new lf.proc.TableAccessFullStep(
        hr.db.getGlobal(), queryContext.from[0]);
    selectNode.addChild(tableAccessNode);

    return {
      queryContext: queryContext,
      root: limitNode
    };
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeAfter, pass);
}


/**
 * Test a tree that has an IN predicate on a column that has an index. It
 * ensures that the optimization is applied only if the number of values in the
 * IN predicate is small enough compared to the total number of rows.
 */
function testTree_WithInPredicate() {
  var treeBefore =
      'project()\n' +
      '-select(value_pred(Employee.id in 1,2,3))\n' +
      '--table_access(Employee)\n';

  var treeAfter =
      'project()\n' +
      '-table_access_by_row_id(Employee)\n' +
      '--index_range_scan(' +
          'Employee.pkEmployee, [1, 1],[2, 2],[3, 3], natural)\n';

  var indexStats = new lf.index.Stats();
  lf.testing.util.simulateIndexStats(
      propertyReplacer, indexStore, e.getRowIdIndexName(), indexStats);

  // Simulating case where the IN predicate has a low enough number of values
  // with respect to the total number of rows to be eligible for optimization.
  indexStats.totalRows = 200; // limit = 200 * 0.02 = 4
  lf.testing.treeutil.assertTreeTransformation(
      constructTreeWithInPredicate(3), treeBefore, treeAfter, pass);

  // Simulating case where the IN predicate has a high enough number of values
  // with respect to the total number of rows to NOT be eligible for
  // optimization.
  indexStats.totalRows = 100; // limit = 100 * 0.02 = 2
  lf.testing.treeutil.assertTreeTransformation(
      constructTreeWithInPredicate(3), treeBefore, treeBefore, pass);
}


function testTree_WithOrPredicate() {
  var treeBefore =
      'project()\n' +
      '-select(combined_pred_or)\n' +
      '--table_access(Employee)\n';

  var treeAfter =
      'project()\n' +
      '-table_access_by_row_id(Employee)\n' +
      '--index_range_scan(' +
          'Employee.pkEmployee, [1, 1],[2, 2],[3, 3], natural)\n';

  var indexStats = new lf.index.Stats();
  lf.testing.util.simulateIndexStats(
      propertyReplacer, indexStore, e.getRowIdIndexName(), indexStats);

  // Simulating case where the OR predicate has a low enough number of children
  // with respect to the total number of rows to be eligible for optimization.
  indexStats.totalRows = 200; // limit = 200 * 0.02 = 4
  lf.testing.treeutil.assertTreeTransformation(
      constructTreeWithOrPredicate(3), treeBefore, treeAfter, pass);

  // Simulating case where the OR predicate has a high enough number of children
  // with respect to the total number of rows to NOT be eligible for
  // optimization.
  indexStats.totalRows = 100; // limit = 100 * 0.02 = 2
  lf.testing.treeutil.assertTreeTransformation(
      constructTreeWithOrPredicate(3), treeBefore, treeBefore, pass);
}


function testTree1() {
  var treeBefore =
      'select(value_pred(Employee.id gt 100))\n' +
      '-select(value_pred(Employee.salary eq 10000))\n' +
      '--table_access(Employee)\n';

  var treeAfter =
      'select(value_pred(Employee.salary eq 10000))\n' +
      '-table_access_by_row_id(Employee)\n' +
      '--index_range_scan(Employee.pkEmployee, (100, unbound], natural)\n';

  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, e.salary.getIndices()[0], 100);
  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, e.id.getIndices()[0], 5);

  lf.testing.treeutil.assertTreeTransformation(
      constructTree1(), treeBefore, treeAfter, pass);
}


function testTree2() {
  var treeBefore =
      'project()\n' +
      '-order_by(Employee.salary ASC)\n' +
      '--join(type: inner, impl: hash, join_pred(Job.id eq Employee.jobId))\n' +
      '---select(value_pred(Employee.id gt 100))\n' +
      '----order_by(Employee.salary ASC)\n' +
      '-----select(value_pred(Employee.salary eq 10000))\n' +
      '------table_access(Employee)\n' +
      '---select(value_pred(Job.id gt 100))\n' +
      '----order_by(Job.title ASC)\n' +
      '-----select(value_pred(Job.maxSalary eq 1000))\n' +
      '------table_access(Job)\n';

  var treeAfter =
      'project()\n' +
      '-order_by(Employee.salary ASC)\n' +
      '--join(type: inner, impl: hash, join_pred(Job.id eq Employee.jobId))\n' +
      '---order_by(Employee.salary ASC)\n' +
      '----select(value_pred(Employee.salary eq 10000))\n' +
      '-----table_access_by_row_id(Employee)\n' +
      '------index_range_scan(Employee.pkEmployee, (100, unbound], natural)\n' +
      '---order_by(Job.title ASC)\n' +
      '----select(value_pred(Job.maxSalary eq 1000))\n' +
      '-----table_access_by_row_id(Job)\n' +
      '------index_range_scan(Job.pkJob, (100, unbound], natural)\n';

  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, e.salary.getIndices()[0], 100);
  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, e.id.getIndices()[0], 5);
  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, j.maxSalary.getIndices()[0], 100);
  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, j.id.getIndices()[0], 5);

  lf.testing.treeutil.assertTreeTransformation(
      constructTree2(), treeBefore, treeAfter, pass);
}


/**
 * Tests the case where a SelectStep node is paired with a TableAccessFullStep
 * and the two are separated by a CrossProductStep. It ensures that other
 * children of the CrossProductStep are not affected.
 */
function testTree3() {
  var treeBefore =
      'project()\n' +
      '-select(value_pred(Job.id eq 100))\n' +
      '--cross_product\n' +
      '---table_access(Job)\n' +
      '---table_access(Department)\n';

  var treeAfter =
      'project()\n' +
      '-cross_product\n' +
      '--table_access_by_row_id(Job)\n' +
      '---index_range_scan(Job.pkJob, [100, 100], natural)\n' +
      '--table_access(Department)\n';

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(hr.db.getSchema());
    queryContext.from = [j, d];
    queryContext.where = j.id.eq('100');

    var crossProductStep = new lf.proc.CrossProductStep();
    var tableAccessJob = new lf.proc.TableAccessFullStep(
        hr.db.getGlobal(), queryContext.from[0]);
    var tableAccessDepartment = new lf.proc.TableAccessFullStep(
        hr.db.getGlobal(), queryContext.from[1]);
    crossProductStep.addChild(tableAccessJob);
    crossProductStep.addChild(tableAccessDepartment);

    var selectStep = new lf.proc.SelectStep(queryContext.where.getId());
    selectStep.addChild(crossProductStep);
    var rootNode = new lf.proc.ProjectStep([], null);
    rootNode.addChild(selectStep);

    return {
      queryContext: queryContext,
      root: rootNode
    };
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeAfter, pass);
}


/**
 * Tests a tree where
 *  - 2 predicates for 'salary' column exist.
 *  - 1 predicate for 'id' column exists.
 *  - 2 indices exist, one for each colmn.
 * This test checks that two separate predicates can be replaced by an
 * IndexRangeScanPass if they refer to the same colmun in the case where that
 * column's index is chosen to be used for optimization.
 */
function testTree_MultiplePredicates_SingleColumnIndices() {
  var treeBefore =
      'select(value_pred(Employee.salary lte 200))\n' +
      '-select(value_pred(Employee.id gt 100))\n' +
      '--select(value_pred(Employee.salary gte 100))\n' +
      '---table_access(Employee)\n';

  var treeAfter =
      'select(value_pred(Employee.id gt 100))\n' +
      '-table_access_by_row_id(Employee)\n' +
      '--index_range_scan(Employee.idx_salary, [100, 200], natural)\n';

  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, e.salary.getIndices()[0], 10);
  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, e.id.getIndices()[0], 500);

  lf.testing.treeutil.assertTreeTransformation(
      constructTree3(), treeBefore, treeAfter, pass);
}


/**
 * Tests a tree where
 *  - two cross-column indices exist, each index is indexing two columns (one of
 *    which is a nullable index).
 *  - two predicates exist for the first cross-column index.
 *  - two predicates exist for the second cross-column index.
 *
 *  It ensures that the most selective index is chosen by the optimizer and that
 *  the predicates are correctly replaced by an IndexRangeScanStep in the tree.
 */
function testTree_MultipleCrossColumnIndices() {
  var treeBefore =
      'select(value_pred(CrossColumnTable.string1 gt StringValue1))\n' +
      '-select(value_pred(CrossColumnTable.integer2 gt 100))\n' +
      '--select(value_pred(CrossColumnTable.integer1 gte 400))\n' +
      '---select(value_pred(CrossColumnTable.string2 eq StringValue2))\n' +
      '----table_access(CrossColumnTable)\n';

  var treeAfter =
      'select(value_pred(CrossColumnTable.integer2 gt 100))\n' +
      '-select(value_pred(CrossColumnTable.integer1 gte 400))\n' +
      '--table_access_by_row_id(CrossColumnTable)\n' +
      '---index_range_scan(CrossColumnTable.idx_crossNull, ' +
          '(StringValue1, unbound],[StringValue2, StringValue2], natural)\n';

  var indices = cct.getIndices();
  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, indices[0], 100);
  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, indices[1], 10);

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(hr.db.getSchema());
    queryContext.from = [cct];
    queryContext.where = lf.op.and(
        cct.string1.gt('StringValue1'),
        cct.integer2.gt(100),
        cct.integer1.gte(400),
        cct.string2.eq('StringValue2'));

    var selectNode1 = createSelectStep(queryContext, 0);
    var selectNode2 = createSelectStep(queryContext, 1);
    var selectNode3 = createSelectStep(queryContext, 2);
    var selectNode4 = createSelectStep(queryContext, 3);
    var tableAccessNode = new lf.proc.TableAccessFullStep(
        hr.db.getGlobal(), queryContext.from[0]);
    selectNode1.addChild(selectNode2);
    selectNode2.addChild(selectNode3);
    selectNode3.addChild(selectNode4);
    selectNode4.addChild(tableAccessNode);

    return {
      queryContext: queryContext,
      root: selectNode1
    };
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeAfter, pass);
}


/**
 * Tests a tree where
 *  - two cross-column indices exist, each index is indexing two columns.
 *  - a predicate that refers to a subset of the cross column index's columns
 *    exists. The referred columns are enough to leverage the index, since
 *    they do form a prefix. Cross-column indices exist on
 *    ['string', 'number'] and ['integer', 'string2'], and the predicates refer
 *    to 'string', and 'integer', therefore both indices are valid candidates
 *    and the most selective one should be leveraged.
 */
function testTree_MultipleCrossColumnIndices_PartialMatching() {
  var treeBefore =
      'select(value_pred(DummyTable.string eq StringValue))\n' +
      '-select(value_pred(DummyTable.integer gt 100))\n' +
      '--table_access(DummyTable)\n';

  var treeAfter =
      'select(value_pred(DummyTable.integer gt 100))\n' +
      '-table_access_by_row_id(DummyTable)\n' +
      '--index_range_scan(DummyTable.pkDummyTable, ' +
          '[StringValue, StringValue],[unbound, unbound], natural)\n';

  var indices = dt.getIndices();
  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, indices[0], 10);
  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, indices[1], 100);

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(hr.db.getSchema());
    queryContext.from = [dt];
    queryContext.where = lf.op.and(
        dt.string.eq('StringValue'),
        dt.integer.gt(100));

    var selectNode1 = createSelectStep(queryContext, 0);
    var selectNode2 = createSelectStep(queryContext, 1);
    var tableAccessNode = new lf.proc.TableAccessFullStep(
        hr.db.getGlobal(), queryContext.from[0]);
    selectNode1.addChild(selectNode2);
    selectNode2.addChild(tableAccessNode);

    return {
      queryContext: queryContext,
      root: selectNode1
    };
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeAfter, pass);
}


/**
 * Tests a tree where
 *  - two cross-column indices exist, each index is indexing two columns.
 *  - a predicate that refers to a subset of the cross column index's columns
 *    exists. The referred columns are not enough to leverage the index, since
 *    they don't form a prefix. Cross-column indices exist on
 *    ['string', 'number'] and ['integer', 'string2'], but only 'number' and
 *    'string2' are bound with a predicate.
 *  - a predicate that refers to a non-indexed column ('boolean') exists.
 *
 *  It ensures that the tree remains unaffected since no index can be leveraged.
 */
function testTree_Unaffected() {
  var treeBefore =
      'select(value_pred(DummyTable.boolean eq false))\n' +
      '-select(value_pred(DummyTable.number gt 100))\n' +
      '--select(value_pred(DummyTable.string2 eq OtherStringValue))\n' +
      '---table_access(DummyTable)\n';

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(hr.db.getSchema());
    queryContext.from = [dt];
    queryContext.where = lf.op.and(
        dt.boolean.eq(false),
        dt.number.gt(100),
        dt.string2.eq('OtherStringValue'));

    var selectNode1 = createSelectStep(queryContext, 0);
    var selectNode2 = createSelectStep(queryContext, 1);
    var selectNode3 = createSelectStep(queryContext, 2);
    var tableAccessNode = new lf.proc.TableAccessFullStep(
        hr.db.getGlobal(), queryContext.from[0]);
    selectNode1.addChild(selectNode2);
    selectNode2.addChild(selectNode3);
    selectNode3.addChild(tableAccessNode);

    return {
      queryContext: queryContext,
      root: selectNode1
    };
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeBefore, pass);
}


/**
 * Constructs a tree where:
 *  - One TableAccessFullStep node exists.
 *  - Multiple SelectStep nodes exist without any nodes in-between them.
 * @return {lf.testing.treeutil.Tree} The constructed tree and corresponding
 *     query context.
 */
function constructTree1() {
  var queryContext = new lf.query.SelectContext(hr.db.getSchema());
  queryContext.from = [e];
  queryContext.where = lf.op.and(e.id.gt('100'), e.salary.eq(10000));

  var selectNode1 = createSelectStep(queryContext, 0);
  var selectNode2 = createSelectStep(queryContext, 1);
  selectNode1.addChild(selectNode2);
  var tableAccessNode = new lf.proc.TableAccessFullStep(
      hr.db.getGlobal(), queryContext.from[0]);
  selectNode2.addChild(tableAccessNode);
  return {
    queryContext: queryContext,
    root: selectNode1
  };
}


/**
 * Constructs a tree where:
 *  - Two TableAccessFullStep nodes exist.
 *  - Multiple SelectStep nodes per TableAcessFullStep node exist.
 *  - SelectStep nodes are separated by an OrderByStep node in between them.
 * @return {lf.testing.treeutil.Tree} The constructed tree and corresponding
 *     query context.
 */
function constructTree2() {
  var queryContext = new lf.query.SelectContext(hr.db.getSchema());
  queryContext.from = [e, j];
  queryContext.where = lf.op.and(
      e.id.gt('100'),
      e.salary.eq(10000),
      j.id.gt('100'),
      j.maxSalary.eq(1000),
      j.id.eq(e.jobId));

  // Constructing left sub-tree.
  var selectNode1 = createSelectStep(queryContext, 0);
  var orderByNode1 = new lf.proc.OrderByStep(
      [{column: e.salary, order: lf.Order.ASC}]);
  var selectNode2 = createSelectStep(queryContext, 1);
  var tableAccessNode1 = new lf.proc.TableAccessFullStep(
      hr.db.getGlobal(), queryContext.from[0]);

  selectNode1.addChild(orderByNode1);
  orderByNode1.addChild(selectNode2);
  selectNode2.addChild(tableAccessNode1);

  // Constructing right sub-tree.
  var selectNode3 = createSelectStep(queryContext, 2);
  var orderByNode2 = new lf.proc.OrderByStep(
      [{column: j.title, order: lf.Order.ASC}]);
  var selectNode4 = createSelectStep(queryContext, 3);
  var tableAccessNode2 = new lf.proc.TableAccessFullStep(
      hr.db.getGlobal(), queryContext.from[1]);

  selectNode3.addChild(orderByNode2);
  orderByNode2.addChild(selectNode4);
  selectNode4.addChild(tableAccessNode2);

  // Constructing the overall tree.
  var rootNode = new lf.proc.ProjectStep([], null);
  var orderByNode3 = new lf.proc.OrderByStep(
      [{column: e.salary, order: lf.Order.ASC}]);
  var joinPredicate = /** @type {!lf.pred.JoinPredicate} */ (
      /** @type {!lf.pred.PredicateNode} */ (
          queryContext.where).getChildAt(4));
  var joinNode = new lf.proc.JoinStep(hr.db.getGlobal(), joinPredicate, false);

  rootNode.addChild(orderByNode3);
  orderByNode3.addChild(joinNode);
  joinNode.addChild(selectNode1);
  joinNode.addChild(selectNode3);

  return {
    queryContext: queryContext,
    root: rootNode
  };
}


/**
 * @return {lf.testing.treeutil.Tree} The constructed tree and corresponding
 *     query context.
 */
function constructTree3() {
  var queryContext = new lf.query.SelectContext(hr.db.getSchema());
  queryContext.from = [e];
  queryContext.where = lf.op.and(
      e.salary.lte(200),
      e.id.gt('100'),
      e.salary.gte(100));

  var selectNode1 = createSelectStep(queryContext, 0);
  var selectNode2 = createSelectStep(queryContext, 1);
  var selectNode3 = createSelectStep(queryContext, 2);
  var tableAccessNode = new lf.proc.TableAccessFullStep(
      hr.db.getGlobal(), queryContext.from[0]);

  selectNode1.addChild(selectNode2);
  selectNode2.addChild(selectNode3);
  selectNode3.addChild(tableAccessNode);

  return {
    queryContext: queryContext,
    root: selectNode1
  };
}


/**
 * Constructs a tree that has an IN predicate.
 * @param {number} valueCount The number of values in the IN predicate.
 * @return {lf.testing.treeutil.Tree} The constructed tree and corresponding
 *     query context.
 */
function constructTreeWithInPredicate(valueCount) {
  var values = new Array(valueCount);
  for (var i = 0; i < values.length; i++) {
    values[i] = (i + 1).toString();
  }
  return constructTreeWithPredicate(e.id.in(values));
}


function constructTreeWithOrPredicate(valueCount) {
  var predicates = new Array(valueCount);
  for (var i = 0; i < predicates.length; i++) {
    predicates[i] = e.id.eq((i + 1).toString());
  }
  var orPredicate = lf.op.or.apply(null, predicates);
  return constructTreeWithPredicate(orPredicate);
}


function constructTreeWithPredicate(predicate) {
  var queryContext = new lf.query.SelectContext(hr.db.getSchema());
  queryContext.from = [e];
  queryContext.where = predicate;

  var projectNode = new lf.proc.ProjectStep([], null);
  var selectNode = new lf.proc.SelectStep(queryContext.where.getId());
  projectNode.addChild(selectNode);
  var tableAccessNode = new lf.proc.TableAccessFullStep(
      hr.db.getGlobal(), queryContext.from[0]);
  selectNode.addChild(tableAccessNode);

  return {
    queryContext: queryContext,
    root: projectNode
  };
}


/**
 * @param {!lf.query.SelectContext} queryContext
 * @param {number} predicateIndex
 * @return {!lf.proc.SelectStep}
 */
function createSelectStep(queryContext, predicateIndex) {
  return new lf.proc.SelectStep(
      /** @type {!lf.pred.PredicateNode} */ (
      /** @type {!lf.pred.PredicateNode} */ (queryContext.where).getChildAt(
          predicateIndex)).getId());
}
