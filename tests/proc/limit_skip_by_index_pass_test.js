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
goog.require('lf.proc.LimitSkipByIndexPass');
goog.require('lf.proc.LimitStep');
goog.require('lf.proc.ProjectStep');
goog.require('lf.proc.SelectStep');
goog.require('lf.proc.SkipStep');
goog.require('lf.proc.TableAccessByRowIdStep');
goog.require('lf.tree');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'LimitSkipByIndexPassTest');


/** @type {!hr.db.schema.Employee} */
var e;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.getInstance(
      undefined, /* opt_volatile */ true).then(function(database) {
    e = database.getSchema().getEmployee();
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
      'project()\n' +
      '-limit(100)\n' +
      '--skip(200)\n' +
      '---table_access_by_row_id(Employee)\n' +
      '----index_range_scan(Employee.idx_salary, [unbound, unbound], ASC)\n';

  var treeAfter =
      'project()\n' +
      '-table_access_by_row_id(Employee)\n' +
      '--index_range_scan(Employee.idx_salary, ' +
          '[unbound, unbound], ASC, limit:100, skip:200)\n';

  var rootNodeBefore = new lf.proc.ProjectStep([], null);
  var limitNode = new lf.proc.LimitStep(100);
  rootNodeBefore.addChild(limitNode);
  var skipNode = new lf.proc.SkipStep(200);
  limitNode.addChild(skipNode);
  var tableAccessByRowIdNode = new lf.proc.TableAccessByRowIdStep(
      hr.db.getGlobal(), e);
  skipNode.addChild(tableAccessByRowIdNode);
  var indexRangeScanStep = new lf.proc.IndexRangeScanStep(
      hr.db.getGlobal(), e.getIndices()[1], [lf.index.SingleKeyRange.all()],
      lf.Order.ASC);
  tableAccessByRowIdNode.addChild(indexRangeScanStep);

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
      'project()\n' +
      '-limit(100)\n' +
      '--skip(200)\n' +
      '---select(value_pred(Employee.id lt 300))\n' +
      '----table_access_by_row_id(Employee)\n' +
      '-----index_range_scan(Employee.idx_salary, [unbound, unbound], ASC)\n';

  var rootNodeBefore = new lf.proc.ProjectStep([], null);
  var limitNode = new lf.proc.LimitStep(100);
  rootNodeBefore.addChild(limitNode);
  var skipNode = new lf.proc.SkipStep(200);
  limitNode.addChild(skipNode);
  var selectNode = new lf.proc.SelectStep(e.id.lt('300'));
  skipNode.addChild(selectNode);
  var tableAccessByRowIdNode = new lf.proc.TableAccessByRowIdStep(
      hr.db.getGlobal(), e);
  selectNode.addChild(tableAccessByRowIdNode);
  var indexRangeScanStep = new lf.proc.IndexRangeScanStep(
      hr.db.getGlobal(), e.getIndices()[1], [lf.index.SingleKeyRange.all()],
      lf.Order.ASC);
  tableAccessByRowIdNode.addChild(indexRangeScanStep);

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
      'project()\n' +
      '-limit(100)\n' +
      '--skip(200)\n' +
      '---table_access_by_row_id(Employee)\n' +
      '----index_range_scan(Employee.idx_salary, ' +
          '[unbound, 1000],[2000, unbound], ASC)\n';

  var rootNodeBefore = new lf.proc.ProjectStep([], null);
  var limitNode = new lf.proc.LimitStep(100);
  rootNodeBefore.addChild(limitNode);
  var skipNode = new lf.proc.SkipStep(200);
  limitNode.addChild(skipNode);
  var tableAccessByRowIdNode = new lf.proc.TableAccessByRowIdStep(
      hr.db.getGlobal(), e);
  skipNode.addChild(tableAccessByRowIdNode);
  var indexRangeScanStep = new lf.proc.IndexRangeScanStep(
      hr.db.getGlobal(),
      e.getIndices()[1],
      [
        lf.index.SingleKeyRange.upperBound(1000),
        lf.index.SingleKeyRange.lowerBound(2000)
      ],
      lf.Order.ASC);
  tableAccessByRowIdNode.addChild(indexRangeScanStep);

  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.LimitSkipByIndexPass();
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeBefore, lf.tree.toString(rootNodeAfter));
}
