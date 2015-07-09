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
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.proc.CrossProductNode');
goog.require('lf.proc.ImplicitJoinsPass');
goog.require('lf.proc.SelectNode');
goog.require('lf.proc.TableAccessNode');
goog.require('lf.schema.DataStoreType');
goog.require('lf.tree');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'ImplicitJoinsPassTest');


/** @type {!lf.schema.Database} */
var schema;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(function(db) {
    schema = db.getSchema();
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests a simple tree, where only one cross product node exists.
 */
function testSimpleTree() {
  var e = schema.getEmployee();
  var j = schema.getJob();

  var treeBefore =
      'select(join_pred(Employee.jobId, Job.id))\n' +
      '-cross_product\n' +
      '--table_access(Employee)\n' +
      '--table_access(Job)\n';

  var treeAfter =
      'join(type: inner, join_pred(Employee.jobId, Job.id))\n' +
      '-table_access(Employee)\n' +
      '-table_access(Job)\n';

  var rootNodeBefore = new lf.proc.SelectNode(e.jobId.eq(j.id));
  var crossProductNode = new lf.proc.CrossProductNode();
  rootNodeBefore.addChild(crossProductNode);
  crossProductNode.addChild(new lf.proc.TableAccessNode(e));
  crossProductNode.addChild(new lf.proc.TableAccessNode(j));
  assertEquals(treeBefore, lf.tree.toString(rootNodeBefore));

  var pass = new lf.proc.ImplicitJoinsPass();
  var rootNodeAfter = pass.rewrite(rootNodeBefore);
  assertEquals(treeAfter, lf.tree.toString(rootNodeAfter));
}
