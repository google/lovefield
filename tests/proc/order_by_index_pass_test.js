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
goog.require('hr.db');
goog.require('lf.Order');
goog.require('lf.index.SingleKeyRange');
goog.require('lf.proc.IndexRangeScanStep');
goog.require('lf.proc.OrderByIndexPass');
goog.require('lf.proc.OrderByStep');
goog.require('lf.proc.ProjectStep');
goog.require('lf.proc.SelectStep');
goog.require('lf.proc.TableAccessByRowIdStep');
goog.require('lf.proc.TableAccessFullStep');
goog.require('lf.schema.DataStoreType');
goog.require('lf.tree');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'OrderByIndexPassTest');


/** @type {!hr.db.schema.Employee} */
var e;


/** @type {!hr.db.schema.DummyTable} */
var dt;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(function(
      database) {
        e = database.getSchema().getEmployee();
        dt = database.getSchema().getDummyTable();
      }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests a tree where the contents of a table are filtered by a value predicate
 * referring to a different column than the one used for sorting.
 */
function testTree1() {
  var treeBefore =
      'project()\n' +
      '-order_by(Employee.salary DESC)\n' +
      '--select(value_pred(Employee.id gt 100))\n' +
      '---table_access(Employee)\n';

  var treeAfter =
      'project()\n' +
      '-select(value_pred(Employee.id gt 100))\n' +
      '--table_access_by_row_id(Employee)\n' +
      '---index_range_scan(Employee.idx_salary, [unbound, unbound], natural)\n';

  var rootNodeBefore = constructTree1(e.salary, lf.Order.DESC);
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.OrderByIndexPass(hr.db.getGlobal());
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
}


/**
 * Tests a tree where an IndexRangeScanStep for the same column used for
 * sorting already exists.
 */
function testTree2() {
  var treeBefore =
      'project()\n' +
      '-order_by(Employee.salary DESC)\n' +
      '--table_access_by_row_id(Employee)\n' +
      '---index_range_scan(Employee.idx_salary, [10000, unbound], reverse)\n';

  var treeAfter =
      'project()\n' +
      '-table_access_by_row_id(Employee)\n' +
      '--index_range_scan(Employee.idx_salary, [10000, unbound], natural)\n';

  var rootNodeBefore = new lf.proc.ProjectStep([], null);
  var orderByNode = new lf.proc.OrderByStep([{
    column: e.salary,
    order: lf.Order.DESC
  }]);
  var tableAccessByRowIdNode = new lf.proc.TableAccessByRowIdStep(
      hr.db.getGlobal(), e);
  var indexRangeScanNode = new lf.proc.IndexRangeScanStep(
      hr.db.getGlobal(), e.getIndices()[1],
      [lf.index.SingleKeyRange.lowerBound(10000)], true);
  tableAccessByRowIdNode.addChild(indexRangeScanNode);
  orderByNode.addChild(tableAccessByRowIdNode);
  rootNodeBefore.addChild(orderByNode);

  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.OrderByIndexPass(hr.db.getGlobal());
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
}


/**
 * Tests the case where an OrderByNode exists in the tree, but there is no index
 * for the column that is used for sorting. The tree should remain unaffected.
 */
function testTree3() {
  var treeBefore =
      'project()\n' +
      '-order_by(Employee.hireDate ASC)\n' +
      '--select(value_pred(Employee.id gt 100))\n' +
      '---table_access(Employee)\n';

  var rootNodeBefore = constructTree1(e.hireDate, lf.Order.ASC);
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.OrderByIndexPass(hr.db.getGlobal());
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  // Tree should be unaffected, since no index exists on Employee#hireDate.
  assertEquals(treeBefore, lf.tree.toString(rootNodeAfter));
}


/**
 * Tests the case where a cross-column index can be leveraged to perform the
 * ORDER BY, using the index's natural order.
 */
function testTree_TableAccess_CrossColumnIndex_Natural() {
  var treeBefore =
      'project()\n' +
      '-order_by(DummyTable.string ASC, DummyTable.number ASC)\n' +
      '--select(value_pred(DummyTable.boolean eq false))\n' +
      '---table_access(DummyTable)\n';

  var treeAfter =
      'project()\n' +
      '-select(value_pred(DummyTable.boolean eq false))\n' +
      '--table_access_by_row_id(DummyTable)\n' +
      '---index_range_scan(DummyTable.pkDummyTable, ' +
          '[unbound, unbound],[unbound, unbound], natural)\n';

  var rootNodeBefore = constructTree2(lf.Order.ASC, lf.Order.ASC);
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.OrderByIndexPass(hr.db.getGlobal());
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
}


/**
 * Tests the case where a cross-column index can be leveraged to perform the
 * ORDER BY, using the index's reverse order.
 */
function testTree_TableAccess_CrossColumnIndex_Reverse() {
  var treeBefore =
      'project()\n' +
      '-order_by(DummyTable.string DESC, DummyTable.number DESC)\n' +
      '--select(value_pred(DummyTable.boolean eq false))\n' +
      '---table_access(DummyTable)\n';

  var treeAfter =
      'project()\n' +
      '-select(value_pred(DummyTable.boolean eq false))\n' +
      '--table_access_by_row_id(DummyTable)\n' +
      '---index_range_scan(DummyTable.pkDummyTable, ' +
          '[unbound, unbound],[unbound, unbound], reverse)\n';

  var rootNodeBefore = constructTree2(lf.Order.DESC, lf.Order.DESC);
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.OrderByIndexPass(hr.db.getGlobal());
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
}


/**
 * Tests the case where an existing cross-column index can't be leveraged to
 * perform the ORDER BY, even though it refers to the same columns as the ORDER
 * BY because the requested order does not match the index's natural or reverse
 * order.
 */
function testTree_TableAccess_CrossColumnIndex_Unaffected() {
  var treeBefore =
      'project()\n' +
      '-order_by(DummyTable.string DESC, DummyTable.number ASC)\n' +
      '--select(value_pred(DummyTable.boolean eq false))\n' +
      '---table_access(DummyTable)\n';

  var rootNodeBefore = constructTree2(lf.Order.DESC, lf.Order.ASC);
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.OrderByIndexPass(hr.db.getGlobal());
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeBefore, lf.tree.toString(rootNodeAfter));
}


/**
 * Constructs a tree to be used for testing.
 * @param {!lf.schema.Column} sortColumn The column on which to sort.
 * @param {!lf.Order} sortOrder The sort order.
 * @return {!lf.proc.PhysicalQueryPlanNode}
 */
function constructTree1(sortColumn, sortOrder) {
  var rootNode = new lf.proc.ProjectStep([], null);
  var orderByNode = new lf.proc.OrderByStep([{
    column: sortColumn,
    order: sortOrder
  }]);
  var selectNode = new lf.proc.SelectStep(e.id.gt('100'));
  var tableAccessNode = new lf.proc.TableAccessFullStep(hr.db.getGlobal(), e);

  selectNode.addChild(tableAccessNode);
  orderByNode.addChild(selectNode);
  rootNode.addChild(orderByNode);

  return rootNode;
}


/**
 * Constructs a tree to be used for testing.
 * @param {!lf.Order} sortOrder1 The sort order for the 1st column.
 * @param {!lf.Order} sortOrder2 The sort order for the 2nd column.
 * @return {!lf.proc.PhysicalQueryPlanNode}
 */
function constructTree2(sortOrder1, sortOrder2) {
  var projectNode = new lf.proc.ProjectStep([], null);
  var orderByNode = new lf.proc.OrderByStep([
    {
      column: dt.string,
      order: sortOrder1
    }, {
      column: dt.number,
      order: sortOrder2
    }
  ]);
  var selectNode = new lf.proc.SelectStep(dt.boolean.eq(false));
  var tableAccessNode = new lf.proc.TableAccessFullStep(hr.db.getGlobal(), dt);

  selectNode.addChild(tableAccessNode);
  orderByNode.addChild(selectNode);
  projectNode.addChild(orderByNode);

  return projectNode;
}
