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
goog.require('lf.proc.CrossProductNode');
goog.require('lf.proc.OrderByNode');
goog.require('lf.proc.PushDownSelectionsPass');
goog.require('lf.proc.SelectNode');
goog.require('lf.proc.TableAccessNode');
goog.require('lf.tree');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'PushDownSelectionsPassTest');


/** @type {!lf.schema.Database} */
var schema;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.getInstance(
      undefined, true).then(function(database) {
    schema = database.getSchema();
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests a simple tree where 3 selections are pushed below a cross ploduct node.
 * Two of the selections are pushed on one branch and the other selections are
 * pushed on the other.
 */
function testTree1() {
  var e = schema.getEmployee();
  var j = schema.getJob();

  var treeBefore =
      'order_by(Employee.id)\n' +
      '-select(value_pred(Employee.salary))\n' +
      '--select(value_pred(Job.minSalary))\n' +
      '---select(value_pred(Employee.hireDate))\n' +
      '----cross_product\n' +
      '-----table_access(Employee)\n' +
      '-----table_access(Job)\n';

  var treeAfter =
      'order_by(Employee.id)\n' +
      '-cross_product\n' +
      '--select(value_pred(Employee.hireDate))\n' +
      '---select(value_pred(Employee.salary))\n' +
      '----table_access(Employee)\n' +
      '--select(value_pred(Job.minSalary))\n' +
      '---table_access(Job)\n';

  var orderByNode = new lf.proc.OrderByNode(
      [{column: e.id, order: lf.Order.ASC}]);
  var selectNode1 = new lf.proc.SelectNode(e.salary.gt(1000));
  orderByNode.addChild(selectNode1);
  var selectNode2 = new lf.proc.SelectNode(j.minSalary.gt(100));
  selectNode1.addChild(selectNode2);
  var selectNode3 = new lf.proc.SelectNode(e.hireDate.lt(new Date()));
  selectNode2.addChild(selectNode3);
  var crossProductNode = new lf.proc.CrossProductNode();
  selectNode3.addChild(crossProductNode);
  crossProductNode.addChild(new lf.proc.TableAccessNode(e));
  crossProductNode.addChild(new lf.proc.TableAccessNode(j));
  var rootNodeBefore = orderByNode;
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.PushDownSelectionsPass();
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
}


/**
 * Testing case where two select nodes exist, but they can't be pushed further
 * down. Ensuring that no endless recursion occurs (swapping the select nodes
 * with each other indefinitely).
 */
function testTree2() {
  var e = schema.getEmployee();

  var treeBefore =
      'order_by(Employee.id)\n' +
      '-select(value_pred(Employee.salary))\n' +
      '--select(value_pred(Employee.salary))\n' +
      '---table_access(Employee)\n';

  var orderByNode = new lf.proc.OrderByNode(
      [{column: e.id, order: lf.Order.ASC}]);
  var selectNode1 = new lf.proc.SelectNode(e.salary.gt(10));
  orderByNode.addChild(selectNode1);
  var selectNode2 = new lf.proc.SelectNode(e.salary.lt(20));
  selectNode1.addChild(selectNode2);
  var tableAccess = new lf.proc.TableAccessNode(e);
  selectNode2.addChild(tableAccess);
  var rootNodeBefore = orderByNode;
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.PushDownSelectionsPass();
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeBefore, lf.tree.toString(rootNodeAfter));
}


/**
 * Ensuring that the order of cross-product/join children is not changed during
 * re-writing.
 */
function testTree3() {
  var e = schema.getEmployee();
  var j = schema.getJob();

  var treeBefore =
      'order_by(Employee.id)\n' +
      '-select(value_pred(Employee.salary))\n' +
      '--cross_product\n' +
      '---table_access(Employee)\n' +
      '---table_access(Job)\n';

  var treeAfter =
      'order_by(Employee.id)\n' +
      '-cross_product\n' +
      '--select(value_pred(Employee.salary))\n' +
      '---table_access(Employee)\n' +
      '--table_access(Job)\n';

  var orderByNode = new lf.proc.OrderByNode(
      [{column: e.id, order: lf.Order.ASC}]);
  var selectNode = new lf.proc.SelectNode(e.salary.gt(10));
  orderByNode.addChild(selectNode);
  var crossProductNode = new lf.proc.CrossProductNode();
  selectNode.addChild(crossProductNode);
  crossProductNode.addChild(new lf.proc.TableAccessNode(e));
  crossProductNode.addChild(new lf.proc.TableAccessNode(j));
  var rootNodeBefore = orderByNode;
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.PushDownSelectionsPass();
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
}
