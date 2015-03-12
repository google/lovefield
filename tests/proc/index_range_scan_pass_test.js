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
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.Order');
goog.require('lf.eval.Type');
goog.require('lf.pred.ValuePredicate');
goog.require('lf.proc.CrossProductStep');
goog.require('lf.proc.IndexRangeScanPass');
goog.require('lf.proc.JoinStep');
goog.require('lf.proc.LimitStep');
goog.require('lf.proc.OrderByStep');
goog.require('lf.proc.ProjectStep');
goog.require('lf.proc.SelectStep');
goog.require('lf.proc.TableAccessFullStep');
goog.require('lf.schema.DataStoreType');
goog.require('lf.service');
goog.require('lf.testing.util');
goog.require('lf.tree');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'IndexRangeScanPassTest');


/** @type {!hr.db.schema.Employee} */
var e;


/** @type {!hr.db.schema.Job} */
var j;


/** @type {!hr.db.schema.Department} */
var d;


/** @type {!hr.db.schema.DummyTable} */
var dt;


/** @type {!lf.index.IndexStore} */
var indexStore;


/** @type {!goog.testing.PropertyReplacer} */
var propertyReplacer;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  propertyReplacer = new goog.testing.PropertyReplacer();

  hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(function(db) {
    e = db.getSchema().getEmployee();
    j = db.getSchema().getJob();
    d = db.getSchema().getDepartment();
    dt = db.getSchema().getDummyTable();
    indexStore =  /** @type {!lf.index.IndexStore} */ (
        hr.db.getGlobal().getService(lf.service.INDEX_STORE));
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


function tearDown() {
  propertyReplacer.reset();
}


/**
 * Tests a simple tree, where only one AND predicate exists.
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
      '---index_range_scan(Employee.pkEmployee, (100, unbound], ASC)\n';

  // Generating a simple tree that has just one SelectNode corresponding to an
  // AND predicate.
  var limitNode = new lf.proc.LimitStep(20);
  var projectNode = new lf.proc.ProjectStep([], null);
  limitNode.addChild(projectNode);
  var predicate = e.id.gt('100');
  var selectNode = new lf.proc.SelectStep(predicate);
  projectNode.addChild(selectNode);
  var tableAccessNode = new lf.proc.TableAccessFullStep(hr.db.getGlobal(), e);
  selectNode.addChild(tableAccessNode);

  var rootNodeBefore = limitNode;
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.IndexRangeScanPass(hr.db.getGlobal());
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
}


function testTree1() {
  var treeBefore =
      'select(value_pred(Employee.id gt 100))\n' +
      '-select(value_pred(Employee.salary eq 10000))\n' +
      '--table_access(Employee)\n';

  var treeAfter =
      'select(value_pred(Employee.salary eq 10000))\n' +
      '-table_access_by_row_id(Employee)\n' +
      '--index_range_scan(Employee.pkEmployee, (100, unbound], ASC)\n';

  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, e.salary.getIndices()[0], 100);
  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, e.id.getIndices()[0], 5);

  var rootNodeBefore = constructTree1();
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.IndexRangeScanPass(hr.db.getGlobal());
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
}


function testTree2() {
  var treeBefore =
      'project()\n' +
      '-order_by(Employee.salary ASC)\n' +
      '--join(join_pred(Job.id, Employee.jobId))\n' +
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
      '--join(join_pred(Job.id, Employee.jobId))\n' +
      '---order_by(Employee.salary ASC)\n' +
      '----select(value_pred(Employee.salary eq 10000))\n' +
      '-----table_access_by_row_id(Employee)\n' +
      '------index_range_scan(Employee.pkEmployee, (100, unbound], ASC)\n' +
      '---order_by(Job.title ASC)\n' +
      '----select(value_pred(Job.maxSalary eq 1000))\n' +
      '-----table_access_by_row_id(Job)\n' +
      '------index_range_scan(Job.pkJob, (100, unbound], ASC)\n';

  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, e.salary.getIndices()[0], 100);
  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, e.id.getIndices()[0], 5);
  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, j.maxSalary.getIndices()[0], 100);
  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, j.id.getIndices()[0], 5);

  var rootNodeBefore = constructTree2();
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.IndexRangeScanPass(hr.db.getGlobal());
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
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
      '---index_range_scan(Job.pkJob, [100, 100], ASC)\n' +
      '--table_access(Department)\n';

  var crossProductStep = new lf.proc.CrossProductStep();
  var tableAccessJob = new lf.proc.TableAccessFullStep(hr.db.getGlobal(), j);
  var tableAccessDepartment = new lf.proc.TableAccessFullStep(
      hr.db.getGlobal(), d);
  crossProductStep.addChild(tableAccessJob);
  crossProductStep.addChild(tableAccessDepartment);

  var selectStep = new lf.proc.SelectStep(new lf.pred.ValuePredicate(
      j.id, '100', lf.eval.Type.EQ));
  selectStep.addChild(crossProductStep);

  var rootNodeBefore = new lf.proc.ProjectStep([], null);
  rootNodeBefore.addChild(selectStep);
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.IndexRangeScanPass(hr.db.getGlobal());
  var rootNodeAfter = pass.rewrite(rootNodeBefore);

  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
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
      '--index_range_scan(Employee.idx_salary, [100, 200], DESC)\n';

  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, e.salary.getIndices()[0], 10);
  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, e.id.getIndices()[0], 500);

  var rootNodeBefore = constructTree3();
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.IndexRangeScanPass(hr.db.getGlobal());
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
}


/**
 * Tests a tree where
 *  - two cross-column indices exist, each index is indexing two columns.
 *  - two predicates exist for the first cross-column index.
 *  - two predicates exist for the second cross-column index.
 *
 *  It ensures that the most selective index is chosen by the optimizer and that
 *  the predicates are correctly replaced by an IndexRangeScanStep in the tree.
 */
function testTree_MultipleCrossColumnIndices() {
  var treeBefore =
      'select(value_pred(DummyTable.string eq StringValue))\n' +
      '-select(value_pred(DummyTable.integer gt 100))\n' +
      '--select(value_pred(DummyTable.number gte 400))\n' +
      '---select(value_pred(DummyTable.string2 eq StringValue2))\n' +
      '----table_access(DummyTable)\n';

  var treeAfter =
      'select(value_pred(DummyTable.string eq StringValue))\n' +
      '-select(value_pred(DummyTable.number gte 400))\n' +
      '--table_access_by_row_id(DummyTable)\n' +
      '---index_range_scan(DummyTable.uq_constraint, ' +
          '(100, unbound],[StringValue2, StringValue2], ASC)\n';

  var indices = dt.getIndices();
  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, indices[0], 100);
  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, indices[1], 10);

  var selectNode1 = new lf.proc.SelectStep(dt.string.eq('StringValue'));
  var selectNode2 = new lf.proc.SelectStep(dt.integer.gt(100));
  var selectNode3 = new lf.proc.SelectStep(dt.number.gte(400));
  var selectNode4 = new lf.proc.SelectStep(dt.string2.eq('StringValue2'));
  var tableAccessNode = new lf.proc.TableAccessFullStep(hr.db.getGlobal(), dt);
  selectNode1.addChild(selectNode2);
  selectNode2.addChild(selectNode3);
  selectNode3.addChild(selectNode4);
  selectNode4.addChild(tableAccessNode);

  var rootNodeBefore = selectNode1;
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.IndexRangeScanPass(hr.db.getGlobal());
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
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
          '[StringValue, StringValue],[unbound, unbound], ASC)\n';

  var indices = dt.getIndices();
  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, indices[0], 10);
  lf.testing.util.simulateIndexCost(
      propertyReplacer, indexStore, indices[1], 100);

  var selectNode1 = new lf.proc.SelectStep(dt.string.eq('StringValue'));
  var selectNode2 = new lf.proc.SelectStep(dt.integer.gt(100));
  var tableAccessNode = new lf.proc.TableAccessFullStep(hr.db.getGlobal(), dt);
  selectNode1.addChild(selectNode2);
  selectNode2.addChild(tableAccessNode);

  var rootNodeBefore = selectNode1;
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.IndexRangeScanPass(hr.db.getGlobal());
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
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

  var selectNode1 = new lf.proc.SelectStep(dt.boolean.eq(false));
  var selectNode2 = new lf.proc.SelectStep(dt.number.gt(100));
  var selectNode3 = new lf.proc.SelectStep(dt.string2.eq('OtherStringValue'));
  var tableAccessNode = new lf.proc.TableAccessFullStep(hr.db.getGlobal(), dt);
  selectNode1.addChild(selectNode2);
  selectNode2.addChild(selectNode3);
  selectNode3.addChild(tableAccessNode);

  var rootNodeBefore = selectNode1;
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.IndexRangeScanPass(hr.db.getGlobal());
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeBefore, lf.tree.toString(rootNodeAfter));
}


/**
 * Constructs a tree where:
 *  - One TableAccessFullStep node exists.
 *  - Multiple SelectStep nodes exist without any nodes in-between them.
 * @return {!lf.proc.PhysicalQueryPlanNode} The root of the constructed tree.
 */
function constructTree1() {
  var selectNode1 = new lf.proc.SelectStep(e.id.gt('100'));
  var selectNode2 = new lf.proc.SelectStep(e.salary.eq(10000));
  selectNode1.addChild(selectNode2);
  var tableAccessNode = new lf.proc.TableAccessFullStep(
      hr.db.getGlobal(), e);
  selectNode2.addChild(tableAccessNode);
  return selectNode1;
}


/**
 * Constructs a tree where:
 *  - Two TableAccessFullStep nodes exist.
 *  - Multiple SelectStep nodes per TableAcessFullStep node exist.
 *  - SelectStep nodes are separated by an OrderByStep node in between them.
 * @return {!lf.proc.PhysicalQueryPlanNode} The root of the constructed tree.
 */
function constructTree2() {
  // Constructnig left sub-tree.
  var selectNode1 = new lf.proc.SelectStep(e.id.gt('100'));
  var orderByNode1 = new lf.proc.OrderByStep(
      [{column: e.salary, order: lf.Order.ASC}]);
  var selectNode2 = new lf.proc.SelectStep(e.salary.eq(10000));
  var tableAccessNode1 = new lf.proc.TableAccessFullStep(hr.db.getGlobal(), e);

  selectNode1.addChild(orderByNode1);
  orderByNode1.addChild(selectNode2);
  selectNode2.addChild(tableAccessNode1);

  // Constructing right sub-tree.
  var selectNode3 = new lf.proc.SelectStep(j.id.gt('100'));
  var orderByNode2 = new lf.proc.OrderByStep(
      [{column: j.title, order: lf.Order.ASC}]);
  var selectNode4 = new lf.proc.SelectStep(j.maxSalary.eq(1000));
  var tableAccessNode2 = new lf.proc.TableAccessFullStep(hr.db.getGlobal(), j);

  selectNode3.addChild(orderByNode2);
  orderByNode2.addChild(selectNode4);
  selectNode4.addChild(tableAccessNode2);

  // Constructing the overall tree.
  var rootNode = new lf.proc.ProjectStep([], null);
  var orderByNode3 = new lf.proc.OrderByStep(
      [{column: e.salary, order: lf.Order.ASC}]);
  var joinNode = new lf.proc.JoinStep(j.id.eq(e.jobId));

  rootNode.addChild(orderByNode3);
  orderByNode3.addChild(joinNode);
  joinNode.addChild(selectNode1);
  joinNode.addChild(selectNode3);

  return rootNode;
}


/**
 * @return {!lf.proc.PhysicalQueryPlanNode} The root of the constructed tree.
 */
function constructTree3() {
  var selectNode1 = new lf.proc.SelectStep(e.salary.lte(200));
  var selectNode2 = new lf.proc.SelectStep(e.id.gt('100'));
  var selectNode3 = new lf.proc.SelectStep(e.salary.gte(100));
  var tableAccessNode = new lf.proc.TableAccessFullStep(
      hr.db.getGlobal(), e);

  selectNode1.addChild(selectNode2);
  selectNode2.addChild(selectNode3);
  selectNode3.addChild(tableAccessNode);
  return selectNode1;
}
