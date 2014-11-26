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
goog.require('lf.Global');
goog.require('lf.Order');
goog.require('lf.eval.Type');
goog.require('lf.pred.ValuePredicate');
goog.require('lf.proc.CrossProductStep');
goog.require('lf.proc.IndexRangeScanPass');
goog.require('lf.proc.JoinStep');
goog.require('lf.proc.OrderByStep');
goog.require('lf.proc.ProjectStep');
goog.require('lf.proc.SelectStep');
goog.require('lf.proc.TableAccessFullStep');
goog.require('lf.service');
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


/** @type {!lf.index.IndexStore} */
var indexStore;


/** @type {!goog.testing.PropertyReplacer} */
var propertyReplacer;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  propertyReplacer = new goog.testing.PropertyReplacer();

  hr.db.getInstance(
      undefined, true).then(function(database) {
    e = database.getSchema().getEmployee();
    j = database.getSchema().getJob();
    d = database.getSchema().getDepartment();
    indexStore =  /** @type {!lf.index.IndexStore} */ (
        lf.Global.get().getService(lf.service.INDEX_STORE));
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
      'project()\n' +
      '-select(value_pred(Employee.id))\n' +
      '--table_access(Employee)\n';

  var treeAfter =
      'project()\n' +
      '-table_access_by_row_id(Employee)\n' +
      '--index_range_scan(Employee.pkEmployee, (100, unbound])\n';

  // Generating a simple tree that has just one SelectNode corresponding to an
  // AND predicate.
  var rootNodeBefore = new lf.proc.ProjectStep([], null);
  var predicate = e.id.gt('100');
  var selectNode = new lf.proc.SelectStep(predicate);
  rootNodeBefore.addChild(selectNode);

  var tableAccessNode = new lf.proc.TableAccessFullStep(e);
  selectNode.addChild(tableAccessNode);
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.IndexRangeScanPass(lf.Global.get());
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
}


function testTree1() {
  var treeBefore =
      'select(value_pred(Employee.id))\n' +
      '-select(value_pred(Employee.salary))\n' +
      '--table_access(Employee)\n';

  var treeAfter =
      'select(value_pred(Employee.salary))\n' +
      '-table_access_by_row_id(Employee)\n' +
      '--index_range_scan(Employee.pkEmployee, (100, unbound])\n';

  simulateIndexCost(e.salary.getIndices()[0], 100);
  simulateIndexCost(e.id.getIndices()[0], 5);

  var rootNodeBefore = constructTree1();
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.IndexRangeScanPass(lf.Global.get());
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
}


function testTree2() {
  var treeBefore =
      'project()\n' +
      '-order_by(Employee.salary)\n' +
      '--join(join_pred(Job.id, Employee.jobId))\n' +
      '---select(value_pred(Employee.id))\n' +
      '----order_by(Employee.salary)\n' +
      '-----select(value_pred(Employee.salary))\n' +
      '------table_access(Employee)\n' +
      '---select(value_pred(Job.id))\n' +
      '----order_by(Job.title)\n' +
      '-----select(value_pred(Job.maxSalary))\n' +
      '------table_access(Job)\n';

  var treeAfter =
      'project()\n' +
      '-order_by(Employee.salary)\n' +
      '--join(join_pred(Job.id, Employee.jobId))\n' +
      '---order_by(Employee.salary)\n' +
      '----select(value_pred(Employee.salary))\n' +
      '-----table_access_by_row_id(Employee)\n' +
      '------index_range_scan(Employee.pkEmployee, (100, unbound])\n' +
      '---order_by(Job.title)\n' +
      '----select(value_pred(Job.maxSalary))\n' +
      '-----table_access_by_row_id(Job)\n' +
      '------index_range_scan(Job.pkJob, (100, unbound])\n';

  simulateIndexCost(e.salary.getIndices()[0], 100);
  simulateIndexCost(e.id.getIndices()[0], 5);
  simulateIndexCost(j.maxSalary.getIndices()[0], 100);
  simulateIndexCost(j.id.getIndices()[0], 5);

  var rootNodeBefore = constructTree2();
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.IndexRangeScanPass(lf.Global.get());
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
      '-select(value_pred(Job.id))\n' +
      '--cross_product\n' +
      '---table_access(Job)\n' +
      '---table_access(Department)\n';

  var treeAfter =
      'project()\n' +
      '-cross_product\n' +
      '--table_access_by_row_id(Job)\n' +
      '---index_range_scan(Job.pkJob, [100, 100])\n' +
      '--table_access(Department)\n';

  var crossProductStep = new lf.proc.CrossProductStep();
  var tableAccessJob = new lf.proc.TableAccessFullStep(j);
  var tableAccessDepartment = new lf.proc.TableAccessFullStep(d);
  crossProductStep.addChild(tableAccessJob);
  crossProductStep.addChild(tableAccessDepartment);

  var selectStep = new lf.proc.SelectStep(new lf.pred.ValuePredicate(
      j.id, '100', lf.eval.Type.EQ));
  selectStep.addChild(crossProductStep);

  var rootNodeBefore = new lf.proc.ProjectStep([], null);
  rootNodeBefore.addChild(selectStep);
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.IndexRangeScanPass(lf.Global.get());
  var rootNodeAfter = pass.rewrite(rootNodeBefore);

  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
}


/**
 * Instruments the return value of lf.index.Index#cost().
 * @param {!lf.schema.Index} indexSchema
 * @param {number} cost The cost to be used.
 */
function simulateIndexCost(indexSchema, cost) {
  var index = indexStore.get(indexSchema.getNormalizedName());
  propertyReplacer.replace(
      index, 'cost', function() { return cost; });
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
  var tableAccessNode = new lf.proc.TableAccessFullStep(e);
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
  var tableAccessNode1 = new lf.proc.TableAccessFullStep(e);

  selectNode1.addChild(orderByNode1);
  orderByNode1.addChild(selectNode2);
  selectNode2.addChild(tableAccessNode1);

  // Constructing right sub-tree.
  var selectNode3 = new lf.proc.SelectStep(j.id.gt('100'));
  var orderByNode2 = new lf.proc.OrderByStep(
      [{column: j.title, order: lf.Order.ASC}]);
  var selectNode4 = new lf.proc.SelectStep(j.maxSalary.eq(1000));
  var tableAccessNode2 = new lf.proc.TableAccessFullStep(j);

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
