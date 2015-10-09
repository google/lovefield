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
goog.require('lf.Order');
goog.require('lf.fn');
goog.require('lf.index.SingleKeyRange');
goog.require('lf.op');
goog.require('lf.proc.IndexRangeScanStep');
goog.require('lf.proc.LimitSkipByIndexPass');
goog.require('lf.proc.LimitStep');
goog.require('lf.proc.OrderByStep');
goog.require('lf.proc.ProjectStep');
goog.require('lf.proc.SelectStep');
goog.require('lf.proc.SkipStep');
goog.require('lf.proc.TableAccessByRowIdStep');
goog.require('lf.query.SelectContext');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.proc.MockKeyRangeCalculator');
goog.require('lf.testing.treeutil');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'LimitSkipByIndexPassTest');


/** @type {!lf.Database} */
var db;


/** @type {!hr.db.schema.Employee} */
var e;


/** @type {!lf.proc.LimitSkipByIndexPass} */
var pass;


function setUp() {
  asyncTestCase.waitForAsync('setUp');

  var schema = hr.db.getSchema();
  e = schema.getEmployee();
  pass = new lf.proc.LimitSkipByIndexPass();
  hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(
      function(database) {
        db = database;
      }).then(
      function() {
        asyncTestCase.continueTesting();
      }, fail);
}


function tearDown() {
  db.close();
}


/**
 * @param {!lf.schema.Table} table
 * @param {string} indexName
 * @return {!lf.schema.Index}
 */
function getIndexByName(table, indexName) {
  return table.getIndices().filter(function(index) {
    return index.name == indexName;
  })[0];
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
      '----index_range_scan(Employee.idx_salary, ' +
          '[unbound, 1000],[2000, unbound], reverse)\n';

  var treeAfter =
      'project()\n' +
      '-table_access_by_row_id(Employee)\n' +
      '--index_range_scan(Employee.idx_salary, ' +
          '[unbound, 1000],[2000, unbound], reverse, limit:100, skip:200)\n';


  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(hr.db.getSchema());
    queryContext.from = [e];
    queryContext.limit = 100;
    queryContext.skip = 200;
    queryContext.where = lf.op.or(e.salary.lte(1000), e.salary.gte(2000));

    var limitNode = new lf.proc.LimitStep();
    var skipNode = new lf.proc.SkipStep();
    limitNode.addChild(skipNode);
    var projectNode = new lf.proc.ProjectStep([], null);
    skipNode.addChild(projectNode);
    var tableAccessByRowIdNode = new lf.proc.TableAccessByRowIdStep(
        hr.db.getGlobal(), queryContext.from[0]);
    projectNode.addChild(tableAccessByRowIdNode);
    var child0 = /** @type {!lf.pred.PredicateNode} */ (
        queryContext.where).getChildAt(0);
    var child1 = /** @type {!lf.pred.PredicateNode} */ (
        queryContext.where).getChildAt(1);
    var indexRangeScanStep = new lf.proc.IndexRangeScanStep(
        hr.db.getGlobal(),
        getIndexByName(e, 'idx_salary'),
        new lf.testing.proc.MockKeyRangeCalculator([
          /** @type {!lf.pred.ValuePredicate} */ (
              child0).toKeyRange().getValues()[0],
          /** @type {!lf.pred.ValuePredicate} */ (
              child1).toKeyRange().getValues()[0]
        ]),
        true);
    tableAccessByRowIdNode.addChild(indexRangeScanStep);

    return {queryContext: queryContext, root: limitNode};
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeAfter, pass);
}


/**
 * Tests a tree where an existing IndexRangeScanStep exists, but it can't be
 * leveraged for limiting and skipping results, because a SelectStep exists in
 * the tree.
 */
function testTree_SelectStep_Unaffected() {
  var treeBefore =
      'limit(100)\n' +
      '-skip(200)\n' +
      '--project()\n' +
      '---select(value_pred(Employee.id lt 300))\n' +
      '----table_access_by_row_id(Employee)\n' +
      '-----index_range_scan(Employee.idx_salary, ' +
          '[unbound, unbound], reverse)\n';

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(hr.db.getSchema());
    queryContext.limit = 100;
    queryContext.skip = 200;
    queryContext.from = [e];
    queryContext.where = e.id.lt('300');

    var limitNode = new lf.proc.LimitStep();
    var skipNode = new lf.proc.SkipStep();
    limitNode.addChild(skipNode);
    var projectNode = new lf.proc.ProjectStep([], null);
    skipNode.addChild(projectNode);
    var selectNode = new lf.proc.SelectStep(queryContext.where.getId());
    projectNode.addChild(selectNode);
    var tableAccessByRowIdNode = new lf.proc.TableAccessByRowIdStep(
        hr.db.getGlobal(), queryContext.from[0]);
    selectNode.addChild(tableAccessByRowIdNode);
    var indexRangeScanStep = new lf.proc.IndexRangeScanStep(
        hr.db.getGlobal(), getIndexByName(e, 'idx_salary'),
        new lf.testing.proc.MockKeyRangeCalculator(
            [lf.index.SingleKeyRange.all()]),
        true);
    tableAccessByRowIdNode.addChild(indexRangeScanStep);

    return {queryContext: queryContext, root: limitNode};
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeBefore, pass);
}


/**
 * Tests a tree where an existing IndexRangeScanStep exists, but it can't be
 * leveraged for limiting and skipping results, because a GROUP_BY operation
 * exists.
 */
function testTree_GroupBy_Unaffected() {
  var treeBefore =
      'limit(100)\n' +
      '-skip(200)\n' +
      '--project(Employee.id, groupBy(Employee.jobId))\n' +
      '---table_access_by_row_id(Employee)\n' +
      '----index_range_scan(Employee.idx_salary, ' +
          '[unbound, unbound], reverse)\n';

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(hr.db.getSchema());
    queryContext.limit = 100;
    queryContext.skip = 200;

    var limitNode = new lf.proc.LimitStep();
    var skipNode = new lf.proc.SkipStep();
    limitNode.addChild(skipNode);
    var projectNode = new lf.proc.ProjectStep([e.id], [e.jobId]);
    skipNode.addChild(projectNode);
    var tableAccessByRowIdNode = new lf.proc.TableAccessByRowIdStep(
        hr.db.getGlobal(), e);
    projectNode.addChild(tableAccessByRowIdNode);
    var indexRangeScanStep = new lf.proc.IndexRangeScanStep(
        hr.db.getGlobal(), getIndexByName(e, 'idx_salary'),
        new lf.testing.proc.MockKeyRangeCalculator(
            [lf.index.SingleKeyRange.all()]),
        true);
    tableAccessByRowIdNode.addChild(indexRangeScanStep);

    return {queryContext: queryContext, root: limitNode};
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeBefore, pass);
}


/**
 * Tests a tree where an existing IndexRangeScanStep exists, but it can't be
 * leveraged for limiting and skipping results, because a project step that
 * includes aggregators exists.
 */
function testTree_Aggregators_Unaffected() {
  var treeBefore =
      'limit(100)\n' +
      '-skip(200)\n' +
      '--project(MAX(Employee.salary),MIN(Employee.salary))\n' +
      '---table_access_by_row_id(Employee)\n' +
      '----index_range_scan(Employee.idx_salary, ' +
          '[unbound, unbound], reverse)\n';

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(hr.db.getSchema());
    queryContext.limit = 100;
    queryContext.skip = 200;

    var limitNode = new lf.proc.LimitStep();
    var skipNode = new lf.proc.SkipStep();
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
        hr.db.getGlobal(), getIndexByName(e, 'idx_salary'),
        new lf.testing.proc.MockKeyRangeCalculator(
            [lf.index.SingleKeyRange.all()]),
        true);
    tableAccessByRowIdNode.addChild(indexRangeScanStep);

    return {queryContext: queryContext, root: limitNode};
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeBefore, pass);
}


/**
 * Tests a tree where an existing IndexRangeScanStep exists, but it can't be
 * leveraged for limiting and skipping results, because an ORDER BY step exists.
 */
function testTree_OrderBy_Unaffected() {
  var treeBefore =
      'limit(100)\n' +
      '-skip(200)\n' +
      '--project()\n' +
      '---order_by(Employee.salary DESC)\n' +
      '----table_access_by_row_id(Employee)\n' +
      '-----index_range_scan(Employee.idx_salary, ' +
          '[unbound, unbound], reverse)\n';

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(hr.db.getSchema());
    queryContext.limit = 100;
    queryContext.skip = 200;

    var limitNode = new lf.proc.LimitStep();
    var skipNode = new lf.proc.SkipStep();
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
        hr.db.getGlobal(), getIndexByName(e, 'idx_salary'),
        new lf.testing.proc.MockKeyRangeCalculator(
            [lf.index.SingleKeyRange.all()]),
        true);
    tableAccessByRowIdNode.addChild(indexRangeScanStep);

    return {queryContext: queryContext, root: limitNode};
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeBefore, pass);
}
