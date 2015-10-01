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
goog.require('lf.index.SingleKeyRange');
goog.require('lf.proc.IndexRangeScanStep');
goog.require('lf.proc.OrderByIndexPass');
goog.require('lf.proc.OrderByStep');
goog.require('lf.proc.ProjectStep');
goog.require('lf.proc.SelectStep');
goog.require('lf.proc.TableAccessByRowIdStep');
goog.require('lf.proc.TableAccessFullStep');
goog.require('lf.query.SelectContext');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.proc.MockKeyRangeCalculator');
goog.require('lf.testing.treeutil');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'OrderByIndexPassTest');


/** @type {!lf.Database} */
var db;


/** @type {!hr.db.schema.Employee} */
var e;


/** @type {!hr.db.schema.DummyTable} */
var dt;


/** @type {!lf.proc.OrderByIndexPass} */
var pass;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(function(
      database) {
        db = database;
        e = database.getSchema().getEmployee();
        dt = database.getSchema().getDummyTable();
        pass = new lf.proc.OrderByIndexPass(hr.db.getGlobal());
      }).then(function() {
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

  lf.testing.treeutil.assertTreeTransformation(
      constructTree1(e.salary, lf.Order.DESC), treeBefore, treeAfter, pass);
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

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(hr.db.getSchema());
    queryContext.from = [e];
    queryContext.where = e.salary.gte(10000);
    queryContext.orderBy = [{
      column: e.salary,
      order: lf.Order.DESC
    }];

    var rootNode = new lf.proc.ProjectStep([], null);
    var orderByNode = new lf.proc.OrderByStep(queryContext.orderBy);
    var tableAccessByRowIdNode = new lf.proc.TableAccessByRowIdStep(
        hr.db.getGlobal(), queryContext.from[0]);
    var indexRangeScanNode = new lf.proc.IndexRangeScanStep(
        hr.db.getGlobal(), getIndexByName(e, 'idx_salary'),
        new lf.testing.proc.MockKeyRangeCalculator(
            queryContext.where.toKeyRange()), true);
    tableAccessByRowIdNode.addChild(indexRangeScanNode);
    orderByNode.addChild(tableAccessByRowIdNode);
    rootNode.addChild(orderByNode);

    return {
      queryContext: queryContext,
      root: rootNode
    };
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeAfter, pass);
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

  // Tree should be unaffected, since no index exists on Employee#hireDate.
  lf.testing.treeutil.assertTreeTransformation(
      constructTree1(e.hireDate, lf.Order.ASC), treeBefore, treeBefore, pass);
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

  lf.testing.treeutil.assertTreeTransformation(
      constructTree2(lf.Order.ASC, lf.Order.ASC), treeBefore, treeAfter, pass);
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

  lf.testing.treeutil.assertTreeTransformation(
      constructTree2(lf.Order.DESC, lf.Order.DESC),
      treeBefore, treeAfter, pass);
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

  lf.testing.treeutil.assertTreeTransformation(
      constructTree2(lf.Order.DESC, lf.Order.ASC),
      treeBefore, treeBefore, pass);
}


/**
 * Tests the case where an existing IndexRangeScanStep can be leveraged to
 * perform the ORDER BY. The optimization pass simply removes the ORDER BY node
 * and adjusts the IndexRangeScanStep's ordering to match the requested order.
 */
function testTree_IndexRangeScan_CrossColumnIndex() {
  var treeBefore =
      'project()\n' +
      '-order_by(DummyTable.string DESC, DummyTable.number DESC)\n' +
      '--select(value_pred(DummyTable.boolean eq false))\n' +
      '---table_access_by_row_id(DummyTable)\n' +
      '----index_range_scan(DummyTable.pkDummyTable, ' +
          '[unbound, unbound],[unbound, 10], natural)\n';

  var treeAfter =
      'project()\n' +
      '-select(value_pred(DummyTable.boolean eq false))\n' +
      '--table_access_by_row_id(DummyTable)\n' +
      '---index_range_scan(DummyTable.pkDummyTable, ' +
          '[unbound, unbound],[unbound, 10], reverse)\n';

  lf.testing.treeutil.assertTreeTransformation(
      constructTree3(lf.Order.DESC, lf.Order.DESC),
      treeBefore, treeAfter, pass);
}


/**
 * Tests the case where an existing IndexRangeScanStep can't be leveraged to
 * perform the ORDER BY, because the requested order does not much neither the
 * reverse nor the natural index's order.
 */
function testTree_IndexRangeScan_CrossColumnIndex_Unaffected() {
  var treeBefore =
      'project()\n' +
      '-order_by(DummyTable.string ASC, DummyTable.number DESC)\n' +
      '--select(value_pred(DummyTable.boolean eq false))\n' +
      '---table_access_by_row_id(DummyTable)\n' +
      '----index_range_scan(DummyTable.pkDummyTable, ' +
          '[unbound, unbound],[unbound, 10], natural)\n';

  lf.testing.treeutil.assertTreeTransformation(
      constructTree3(lf.Order.ASC, lf.Order.DESC),
      treeBefore, treeBefore, pass);
}


/**
 * Constructs a tree to be used for testing.
 * @param {!lf.schema.Column} sortColumn The column on which to sort.
 * @param {!lf.Order} sortOrder The sort order.
 * @return {lf.testing.treeutil.Tree} The constructed tree and corresponding
 *     query context.
 */
function constructTree1(sortColumn, sortOrder) {
  var queryContext = new lf.query.SelectContext(hr.db.getSchema());
  queryContext.from = [e];
  queryContext.orderBy = [{
    column: sortColumn,
    order: sortOrder
  }];
  queryContext.where = e.id.gt('100');

  var rootNode = new lf.proc.ProjectStep([], null);
  var orderByNode = new lf.proc.OrderByStep(queryContext.orderBy);
  var selectNode = new lf.proc.SelectStep(queryContext.where.getId());
  var tableAccessNode = new lf.proc.TableAccessFullStep(
      hr.db.getGlobal(), queryContext.from[0]);

  selectNode.addChild(tableAccessNode);
  orderByNode.addChild(selectNode);
  rootNode.addChild(orderByNode);

  return {
    queryContext: queryContext,
    root: rootNode
  };
}


/**
 * Constructs a tree to be used for testing.
 * @param {!lf.Order} sortOrder1 The sort order for the 1st column.
 * @param {!lf.Order} sortOrder2 The sort order for the 2nd column.
 * @return {lf.testing.treeutil.Tree} The constructed tree and corresponding
 *     query context.
 */
function constructTree2(sortOrder1, sortOrder2) {
  var queryContext = new lf.query.SelectContext(hr.db.getSchema());
  queryContext.from = [dt];
  queryContext.where = dt.boolean.eq(false);
  queryContext.orderBy = [
    {
      column: dt.string,
      order: sortOrder1
    }, {
      column: dt.number,
      order: sortOrder2
    }
  ];

  var projectNode = new lf.proc.ProjectStep([], null);
  var orderByNode = new lf.proc.OrderByStep(queryContext.orderBy);
  var selectNode = new lf.proc.SelectStep(queryContext.where.getId());
  var tableAccessNode = new lf.proc.TableAccessFullStep(
      hr.db.getGlobal(), queryContext.from[0]);

  selectNode.addChild(tableAccessNode);
  orderByNode.addChild(selectNode);
  projectNode.addChild(orderByNode);

  return {
    queryContext: queryContext,
    root: projectNode
  };
}


/**
 * Constructs a tree to be used for testing.
 * @param {!lf.Order} sortOrder1 The sort order for the 1st column.
 * @param {!lf.Order} sortOrder2 The sort order for the 2nd column.
 * @return {lf.testing.treeutil.Tree} The constructed tree and corresponding
 *     query context.
 */
function constructTree3(sortOrder1, sortOrder2) {
  var queryContext = new lf.query.SelectContext(hr.db.getSchema());
  queryContext.from = [dt];
  queryContext.where = dt.boolean.eq(false);
  queryContext.orderBy = [
    {
      column: dt.string,
      order: sortOrder1
    }, {
      column: dt.number,
      order: sortOrder2
    }
  ];

  var projectNode = new lf.proc.ProjectStep([], null);
  var orderByNode = new lf.proc.OrderByStep(queryContext.orderBy);
  var selectNode = new lf.proc.SelectStep(queryContext.where.getId());
  var tableAccessByRowIdNode = new lf.proc.TableAccessByRowIdStep(
      hr.db.getGlobal(), queryContext.from[0]);
  var indexRangeScanNode = new lf.proc.IndexRangeScanStep(
      hr.db.getGlobal(), dt.getIndices()[0],
      new lf.testing.proc.MockKeyRangeCalculator([
        lf.index.SingleKeyRange.all(),
        lf.index.SingleKeyRange.upperBound(10)
      ]),
      false);

  tableAccessByRowIdNode.addChild(indexRangeScanNode);
  selectNode.addChild(tableAccessByRowIdNode);
  orderByNode.addChild(selectNode);
  projectNode.addChild(orderByNode);

  return {
    queryContext: queryContext,
    root: projectNode
  };
}
