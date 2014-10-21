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
goog.require('lf.op');
goog.require('lf.proc.CrossProductNode');
goog.require('lf.proc.CrossProductPass');
goog.require('lf.proc.SelectNode');
goog.require('lf.proc.TableAccessNode');
goog.require('lf.tree');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'CrossProductPassTest');


/** @type {!lf.schema.Database} */
var schema;


/** @type {!hr.db.schema.Employee} */
var e;


/** @type {!hr.db.schema.Job} */
var j;


/** @type {!hr.db.schema.Department} */
var d;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.getInstance(
      undefined, /* opt_volatile */ true).then(function(database) {
    schema = database.getSchema();
    d = schema.getDepartment();
    e = schema.getEmployee();
    j = schema.getJob();
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests a simple tree, where only one AND predicate exists.
 */
function testSimpleTree() {
  var treeBefore =
      'select(combined_pred_and)\n' +
      '-cross_product\n' +
      '--table_access(Employee)\n' +
      '--table_access(Job)\n' +
      '--table_access(Department)\n';

  var treeAfter =
      'select(combined_pred_and)\n' +
      '-cross_product\n' +
      '--cross_product\n' +
      '---table_access(Employee)\n' +
      '---table_access(Job)\n' +
      '--table_access(Department)\n';

  var crossProductNode = new lf.proc.CrossProductNode();
  crossProductNode.addChild(new lf.proc.TableAccessNode(e));
  crossProductNode.addChild(new lf.proc.TableAccessNode(j));
  crossProductNode.addChild(new lf.proc.TableAccessNode(d));

  var rootNodeBefore = new lf.proc.SelectNode(
      lf.op.and(e.jobId.eq(j.id), e.departmentId.eq(d.id)));
  rootNodeBefore.addChild(crossProductNode);
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.CrossProductPass();
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
}
