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
goog.require('lf.fn');
goog.require('lf.index.SingleKeyRange');
goog.require('lf.proc.IndexRangeScanStep');
goog.require('lf.proc.LimitSkipByIndexPass');
goog.require('lf.proc.LimitStep');
goog.require('lf.proc.OrderByStep');
goog.require('lf.proc.ProjectStep');
goog.require('lf.proc.SelectStep');
goog.require('lf.proc.SkipStep');
goog.require('lf.proc.TableAccessByRowIdStep');
goog.require('lf.schema.DataStoreType');
goog.require('lf.tree');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'LimitSkipByIndexPassTest');


/** @type {!hr.db.schema.Employee} */
var e;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(function(db) {
    e = db.getSchema().getEmployee();
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests a tree where an existing IndexRangeScanStep can be leveraged for
 * limiting and skipping results.
 */
function testTree1() {
  var treeBefore =
      'limit(100)\n' +
      '-skip(200)\n' +
      '--project()\n' +
      '---table_access_by_row_id(Employee)\n' +
      '----index_range_scan(Employee.idx_salary, [unbound, unbound], ASC)\n';

  var treeAfter =
      'project()\n' +
      '-table_access_by_row_id(Employee)\n' +
      '--index_range_scan(Employee.idx_salary, ' +
          '[unbound, unbound], ASC, limit:100, skip:200)\n';

  var limitNode = new lf.proc.LimitStep(100);
  var skipNode = new lf.proc.SkipStep(200);
  limitNode.addChild(skipNode);
  var projectNode = new lf.proc.ProjectStep([], null);
  skipNode.addChild(projectNode);
  var tableAccessByRowIdNode = new lf.proc.TableAccessByRowIdStep(
      hr.db.getGlobal(), e);
  projectNode.addChild(tableAccessByRowIdNode);
  var indexRangeScanStep = new lf.proc.IndexRangeScanStep(
      hr.db.getGlobal(), e.getIndices()[1], [lf.index.SingleKeyRange.all()],
      lf.Order.ASC);
  tableAccessByRowIdNode.addChild(indexRangeScanStep);

  var rootNodeBefore = limitNode;
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.LimitSkipByIndexPass();
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
}


/**
 * Tests a tree where an existing IndexRangeScanStep exists, but it can't be
 * leveraged for limiting and skipping results, because a SelectStep exists in
 * the tree.
 */
function testTree2() {
  var treeBefore =
      'limit(100)\n' +
      '-skip(200)\n' +
      '--project()\n' +
      '---select(value_pred(Employee.id lt 300))\n' +
      '----table_access_by_row_id(Employee)\n' +
      '-----index_range_scan(Employee.idx_salary, [unbound, unbound], ASC)\n';

  var limitNode = new lf.proc.LimitStep(100);
  var skipNode = new lf.proc.SkipStep(200);
  limitNode.addChild(skipNode);
  var projectNode = new lf.proc.ProjectStep([], null);
  skipNode.addChild(projectNode);
  var selectNode = new lf.proc.SelectStep(e.id.lt('300'));
  projectNode.addChild(selectNode);
  var tableAccessByRowIdNode = new lf.proc.TableAccessByRowIdStep(
      hr.db.getGlobal(), e);
  selectNode.addChild(tableAccessByRowIdNode);
  var indexRangeScanStep = new lf.proc.IndexRangeScanStep(
      hr.db.getGlobal(), e.getIndices()[1], [lf.index.SingleKeyRange.all()],
      lf.Order.ASC);
  tableAccessByRowIdNode.addChild(indexRangeScanStep);

  var rootNodeBefore = limitNode;
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.LimitSkipByIndexPass();
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeBefore, lf.tree.toString(rootNodeAfter));
}


/**
 * Tests a tree where an existing IndexRangeScanStep exists, but it can't
 * leveraged because it uses multiple key ranges.
 */
function testTree3() {
  var treeBefore =
      'limit(100)\n' +
      '-skip(200)\n' +
      '--project()\n' +
      '---table_access_by_row_id(Employee)\n' +
      '----index_range_scan(Employee.idx_salary, ' +
          '[unbound, 1000],[2000, unbound], ASC)\n';

  var limitNode = new lf.proc.LimitStep(100);
  var skipNode = new lf.proc.SkipStep(200);
  limitNode.addChild(skipNode);
  var projectNode = new lf.proc.ProjectStep([], null);
  skipNode.addChild(projectNode);
  var tableAccessByRowIdNode = new lf.proc.TableAccessByRowIdStep(
      hr.db.getGlobal(), e);
  projectNode.addChild(tableAccessByRowIdNode);
  var indexRangeScanStep = new lf.proc.IndexRangeScanStep(
      hr.db.getGlobal(),
      e.getIndices()[1],
      [
        lf.index.SingleKeyRange.upperBound(1000),
        lf.index.SingleKeyRange.lowerBound(2000)
      ],
      lf.Order.ASC);
  tableAccessByRowIdNode.addChild(indexRangeScanStep);

  var rootNodeBefore = limitNode;
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.LimitSkipByIndexPass();
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeBefore, lf.tree.toString(rootNodeAfter));
}


/**
 * Tests a tree where an existing IndexRangeScanStep exists, but it can't be
 * leveraged for limiting and skipping results, because a GROUP_BY operation
 * exists.
 */
function testTree4() {
  var treeBefore =
      'limit(100)\n' +
      '-skip(200)\n' +
      '--project(Employee.id, groupBy(Employee.jobId))\n' +
      '---table_access_by_row_id(Employee)\n' +
      '----index_range_scan(Employee.idx_salary, [unbound, unbound], ASC)\n';

  var limitNode = new lf.proc.LimitStep(100);
  var skipNode = new lf.proc.SkipStep(200);
  limitNode.addChild(skipNode);
  var projectNode = new lf.proc.ProjectStep([e.id], [e.jobId]);
  skipNode.addChild(projectNode);
  var tableAccessByRowIdNode = new lf.proc.TableAccessByRowIdStep(
      hr.db.getGlobal(), e);
  projectNode.addChild(tableAccessByRowIdNode);
  var indexRangeScanStep = new lf.proc.IndexRangeScanStep(
      hr.db.getGlobal(), e.getIndices()[1], [lf.index.SingleKeyRange.all()],
      lf.Order.ASC);
  tableAccessByRowIdNode.addChild(indexRangeScanStep);

  var rootNodeBefore = limitNode;
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.LimitSkipByIndexPass();
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeBefore, lf.tree.toString(rootNodeAfter));
}


/**
 * Tests a tree where an existing IndexRangeScanStep exists, but it can't be
 * leveraged for limiting and skipping results, because a project step that
 * includes aggregators exists.
 */
function testTree5() {
  var treeBefore =
      'limit(100)\n' +
      '-skip(200)\n' +
      '--project(MAX(Employee.salary),MIN(Employee.salary))\n' +
      '---table_access_by_row_id(Employee)\n' +
      '----index_range_scan(Employee.idx_salary, [unbound, unbound], ASC)\n';

  var limitNode = new lf.proc.LimitStep(100);
  var skipNode = new lf.proc.SkipStep(200);
  limitNode.addChild(skipNode);
  var projectNode = new lf.proc.ProjectStep([
    lf.fn.max(e.salary),
    lf.fn.min(e.salary)
  ], null);
  skipNode.addChild(projectNode);
  var tableAccessByRowIdNode = new lf.proc.TableAccessByRowIdStep(
      hr.db.getGlobal(), e);
  projectNode.addChild(tableAccessByRowIdNode);
  var indexRangeScanStep = new lf.proc.IndexRangeScanStep(
      hr.db.getGlobal(), e.getIndices()[1], [lf.index.SingleKeyRange.all()],
      lf.Order.ASC);
  tableAccessByRowIdNode.addChild(indexRangeScanStep);

  var rootNodeBefore = limitNode;
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.LimitSkipByIndexPass();
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeBefore, lf.tree.toString(rootNodeAfter));
}


/**
 * Tests a tree where an existing IndexRangeScanStep exists, but it can't be
 * leveraged for limiting and skipping results, because an ORDER BY step exists.
 */
function testTree6() {
  var treeBefore =
      'limit(100)\n' +
      '-skip(200)\n' +
      '--project()\n' +
      '---order_by(Employee.salary)\n' +
      '----table_access_by_row_id(Employee)\n' +
      '-----index_range_scan(Employee.idx_salary, [unbound, unbound], ASC)\n';

  var limitNode = new lf.proc.LimitStep(100);
  var skipNode = new lf.proc.SkipStep(200);
  limitNode.addChild(skipNode);
  var projectNode = new lf.proc.ProjectStep([], null);
  skipNode.addChild(projectNode);
  var orderByNode = new lf.proc.OrderByStep([{
    column: e.salary,
    order: lf.Order.DESC
  }]);
  projectNode.addChild(orderByNode);
  var tableAccessByRowIdNode = new lf.proc.TableAccessByRowIdStep(
      hr.db.getGlobal(), e);
  orderByNode.addChild(tableAccessByRowIdNode);
  var indexRangeScanStep = new lf.proc.IndexRangeScanStep(
      hr.db.getGlobal(), e.getIndices()[1], [lf.index.SingleKeyRange.all()],
      lf.Order.ASC);
  tableAccessByRowIdNode.addChild(indexRangeScanStep);

  var rootNodeBefore = limitNode;
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.LimitSkipByIndexPass();
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeBefore, lf.tree.toString(rootNodeAfter));
}
