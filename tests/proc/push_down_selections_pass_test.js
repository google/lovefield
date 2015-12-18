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
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.Order');
goog.require('lf.op');
goog.require('lf.proc.CrossProductNode');
goog.require('lf.proc.OrderByNode');
goog.require('lf.proc.PushDownSelectionsPass');
goog.require('lf.proc.SelectNode');
goog.require('lf.proc.TableAccessNode');
goog.require('lf.query.SelectContext');
goog.require('lf.structs.set');
goog.require('lf.testing.treeutil');


/** @type {!lf.schema.Database} */
var schema;


/** type {!lf.proc.PushDownSelectionsPass} */
var pass;


function setUp() {
  schema = hr.db.getSchema();
  pass = new lf.proc.PushDownSelectionsPass();
}


/**
 * Tests a simple tree where 3 ValuePredicate selections are pushed below a
 * cross ploduct node. Two of the selections are pushed on one branch and the
 * other selections are pushed on the other.
 */
function testTree_ValuePredicates1() {
  var e = schema.getEmployee();
  var j = schema.getJob();

  var hireDate = new Date(1422667933572);

  var treeBefore =
      'order_by(Employee.id ASC)\n' +
      '-select(value_pred(Employee.salary gt 1000))\n' +
      '--select(value_pred(Job.minSalary gt 100))\n' +
      '---select(value_pred(Employee.hireDate lt ' + hireDate.toString() +
          '))\n' +
      '----cross_product\n' +
      '-----table_access(Employee)\n' +
      '-----table_access(Job)\n';

  var treeAfter =
      'order_by(Employee.id ASC)\n' +
      '-cross_product\n' +
      '--select(value_pred(Employee.salary gt 1000))\n' +
      '---select(value_pred(Employee.hireDate lt ' + hireDate.toString() +
          '))\n' +
      '----table_access(Employee)\n' +
      '--select(value_pred(Job.minSalary gt 100))\n' +
      '---table_access(Job)\n';

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(hr.db.getSchema());
    queryContext.from = [e, j];
    var predicate1 = e.salary.gt(1000);
    var predicate2 = j.minSalary.gt(100);
    var predicate3 = e.hireDate.lt(hireDate);
    queryContext.where = lf.op.and(predicate1, predicate2, predicate3);
    queryContext.orderBy = [{column: e.id, order: lf.Order.ASC}];

    var orderByNode = new lf.proc.OrderByNode(queryContext.orderBy);
    var selectNode1 = new lf.proc.SelectNode(predicate1);
    orderByNode.addChild(selectNode1);
    var selectNode2 = new lf.proc.SelectNode(predicate2);
    selectNode1.addChild(selectNode2);
    var selectNode3 = new lf.proc.SelectNode(predicate3);
    selectNode2.addChild(selectNode3);
    var crossProductNode = new lf.proc.CrossProductNode();
    selectNode3.addChild(crossProductNode);
    queryContext.from.forEach(function(tableSchema) {
      crossProductNode.addChild(new lf.proc.TableAccessNode(tableSchema));
    });

    return {queryContext: queryContext, root: orderByNode};
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeAfter, pass);
}


/**
 * Testing case where two ValuePredicate select nodes exist, but they can't be
 * pushed further down. Ensuring that no endless recursion occurs (swapping the
 * select nodes with each other indefinitely).
 */
function testTree_ValuePredicates2_Unaffected() {
  var e = schema.getEmployee();

  var treeBefore =
      'order_by(Employee.id ASC)\n' +
      '-select(value_pred(Employee.salary gt 10))\n' +
      '--select(value_pred(Employee.salary lt 20))\n' +
      '---table_access(Employee)\n';

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(hr.db.getSchema());
    queryContext.from = [e];
    var predicate1 = e.salary.gt(10);
    var predicate2 = e.salary.lt(20);
    queryContext.where = lf.op.and(predicate1, predicate2);
    queryContext.orderBy = [{column: e.id, order: lf.Order.ASC}];

    var orderByNode = new lf.proc.OrderByNode(queryContext.orderBy);
    var selectNode1 = new lf.proc.SelectNode(predicate1);
    orderByNode.addChild(selectNode1);
    var selectNode2 = new lf.proc.SelectNode(predicate2);
    selectNode1.addChild(selectNode2);
    var tableAccess = new lf.proc.TableAccessNode(queryContext.from[0]);
    selectNode2.addChild(tableAccess);

    return {queryContext: queryContext, root: orderByNode};
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeBefore, pass);
}


/**
 * Ensuring that the order of cross-product/join children is not changed during
 * re-writing.
 */
function testTree_ValuePredicates3() {
  var e = schema.getEmployee();
  var j = schema.getJob();

  var treeBefore =
      'order_by(Employee.id ASC)\n' +
      '-select(value_pred(Employee.salary gt 10))\n' +
      '--cross_product\n' +
      '---table_access(Employee)\n' +
      '---table_access(Job)\n';

  var treeAfter =
      'order_by(Employee.id ASC)\n' +
      '-cross_product\n' +
      '--select(value_pred(Employee.salary gt 10))\n' +
      '---table_access(Employee)\n' +
      '--table_access(Job)\n';

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(hr.db.getSchema());
    queryContext.from = [e, j];
    queryContext.where = e.salary.gt(10);
    queryContext.orderBy = [{column: e.id, order: lf.Order.ASC}];

    var orderByNode = new lf.proc.OrderByNode(queryContext.orderBy);
    var selectNode = new lf.proc.SelectNode(queryContext.where);
    orderByNode.addChild(selectNode);
    var crossProductNode = new lf.proc.CrossProductNode();
    selectNode.addChild(crossProductNode);
    queryContext.from.forEach(function(tableSchema) {
      crossProductNode.addChild(new lf.proc.TableAccessNode(tableSchema));

    });

    return {queryContext: queryContext, root: orderByNode};
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeAfter, pass);
}


/**
 * Tests a tree where two value predicates and two join predicates exist (one
 * outer, one inner).
 * It ensures that
 *  1) The two value predicates are not pushed below the outer join predicates.
 *  2) The join predicate closer to the root is pushed below the outer join
 *     predicate further from the root..
 */
function testTree_MixedJoinPredicates_WithWhere() {
  var treeBefore =
      'select(value_pred(Department.id eq null))\n' +
      '-select(value_pred(Job.id eq null))\n' +
      '--select(join_pred(Employee.jobId eq Job.id))\n' +
      '---select(join_pred(Employee.departmentId eq Department.id))\n' +
      '----cross_product\n' +
      '-----cross_product\n' +
      '------table_access(Employee)\n' +
      '------table_access(Job)\n' +
      '-----table_access(Department)\n';

  var treeAfter =
      'select(value_pred(Department.id eq null))\n' +
      '-select(value_pred(Job.id eq null))\n' +
      '--select(join_pred(Employee.departmentId eq Department.id))\n' +
      '---cross_product\n' +
      '----select(join_pred(Employee.jobId eq Job.id))\n' +
      '-----cross_product\n' +
      '------table_access(Employee)\n' +
      '------table_access(Job)\n' +
      '----table_access(Department)\n';

  var constructTree = function() {
    var d = schema.getDepartment();
    var e = schema.getEmployee();
    var j = schema.getJob();

    var queryContext = new lf.query.SelectContext(hr.db.getSchema());
    queryContext.from = [e, j, d];
    var innerJoinPredicate = e.jobId.eq(j.id);
    var outerJoinPredicate = e.departmentId.eq(d.id);
    var valuePredicate1 = d.id.isNull();
    var valuePredicate2 = j.id.isNull();
    queryContext.where = lf.op.and(
        valuePredicate1, valuePredicate2,
        innerJoinPredicate, outerJoinPredicate);
    queryContext.outerJoinPredicates = lf.structs.set.create();
    queryContext.outerJoinPredicates.add(outerJoinPredicate.getId());

    var crossProductNode1 = new lf.proc.CrossProductNode();
    crossProductNode1.addChild(new lf.proc.TableAccessNode(e));
    crossProductNode1.addChild(new lf.proc.TableAccessNode(j));
    var crossProductNode2 = new lf.proc.CrossProductNode();
    crossProductNode2.addChild(crossProductNode1);
    crossProductNode2.addChild(new lf.proc.TableAccessNode(d));

    var selectNode1 = new lf.proc.SelectNode(valuePredicate1);
    var selectNode2 = new lf.proc.SelectNode(valuePredicate2);
    var selectNode3 = new lf.proc.SelectNode(innerJoinPredicate);
    var selectNode4 = new lf.proc.SelectNode(outerJoinPredicate);
    selectNode1.addChild(selectNode2);
    selectNode2.addChild(selectNode3);
    selectNode3.addChild(selectNode4);
    selectNode4.addChild(crossProductNode2);

    return {queryContext: queryContext, root: selectNode1};
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeAfter, pass);
}


/**
 * Tests a tree that involves a 3 table join. It ensures that the JoinPredicate
 * nodes are pushed down until they become parents of the appropriate cross
 * product node.
 */
function testTree_JoinPredicates() {
  var treeBefore =
      'select(join_pred(Employee.jobId eq Job.id))\n' +
      '-select(join_pred(Employee.departmentId eq Department.id))\n' +
      '--cross_product\n' +
      '---cross_product\n' +
      '----table_access(Employee)\n' +
      '----table_access(Job)\n' +
      '---table_access(Department)\n';

  var treeAfter =
      'select(join_pred(Employee.departmentId eq Department.id))\n' +
      '-cross_product\n' +
      '--select(join_pred(Employee.jobId eq Job.id))\n' +
      '---cross_product\n' +
      '----table_access(Employee)\n' +
      '----table_access(Job)\n' +
      '--table_access(Department)\n';

  var constructTree = function() {
    var d = schema.getDepartment();
    var e = schema.getEmployee();
    var j = schema.getJob();

    var queryContext = new lf.query.SelectContext(hr.db.getSchema());
    queryContext.from = [e, j, d];
    var predicate1 = e.departmentId.eq(d.id);
    var predicate2 = e.jobId.eq(j.id);
    queryContext.where = lf.op.and(predicate1, predicate2);

    var crossProductNode1 = new lf.proc.CrossProductNode();
    crossProductNode1.addChild(
        new lf.proc.TableAccessNode(queryContext.from[0]));
    crossProductNode1.addChild(
        new lf.proc.TableAccessNode(queryContext.from[1]));
    var crossProductNode2 = new lf.proc.CrossProductNode();
    crossProductNode2.addChild(crossProductNode1);
    crossProductNode2.addChild(
        new lf.proc.TableAccessNode(queryContext.from[2]));

    var selectNode1 = new lf.proc.SelectNode(predicate1);
    selectNode1.addChild(crossProductNode2);
    var selectNode2 = new lf.proc.SelectNode(predicate2);
    selectNode2.addChild(selectNode1);


    return {queryContext: queryContext, root: selectNode2};
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeAfter, pass);
}


/**
 * Tests a tree that involves a 5 table join. It ensures that all predicate
 * nodes (both JoinPredicate and ValuePredicate) are pushed as down in the tree
 * as possible.
 */
function testTree_JoinPredicates2() {
  var c = schema.getCountry();
  var d = schema.getDepartment();
  var e = schema.getEmployee();
  var jh = schema.getJobHistory();
  var j = schema.getJob();

  var treeBefore =
      'select(join_pred(Country.id eq Department.id))\n' +
      '-select(value_pred(Employee.id eq empId))\n' +
      '--select(join_pred(Employee.departmentId eq Department.id))\n' +
      '---select(join_pred(Employee.jobId eq Job.id))\n' +
      '----select(join_pred(JobHistory.jobId eq Job.id))\n' +
      '-----cross_product\n' +
      '------cross_product\n' +
      '-------cross_product\n' +
      '--------cross_product\n' +
      '---------table_access(Employee)\n' +
      '---------table_access(Job)\n' +
      '--------table_access(Department)\n' +
      '-------table_access(JobHistory)\n' +
      '------table_access(Country)\n';

  var treeAfter =
      'select(join_pred(Country.id eq Department.id))\n' +
      '-cross_product\n' +
      '--select(join_pred(JobHistory.jobId eq Job.id))\n' +
      '---cross_product\n' +
      '----select(join_pred(Employee.departmentId eq Department.id))\n' +
      '-----cross_product\n' +
      '------select(join_pred(Employee.jobId eq Job.id))\n' +
      '-------cross_product\n' +
      '--------select(value_pred(Employee.id eq empId))\n' +
      '---------table_access(Employee)\n' +
      '--------table_access(Job)\n' +
      '------table_access(Department)\n' +
      '----table_access(JobHistory)\n' +
      '--table_access(Country)\n';

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(hr.db.getSchema());
    queryContext.from = [e, j, d, jh, c];
    var predicate1 = jh.jobId.eq(j.id);
    var predicate2 = e.jobId.eq(j.id);
    var predicate3 = e.departmentId.eq(d.id);
    var predicate4 = e.id.eq('empId');
    var predicate5 = c.id.eq(d.id);
    queryContext.where = lf.op.and(
        predicate1, predicate2, predicate3, predicate4, predicate5);

    var crossProductNode1 = new lf.proc.CrossProductNode();
    crossProductNode1.addChild(new lf.proc.TableAccessNode(e));
    crossProductNode1.addChild(new lf.proc.TableAccessNode(j));

    var crossProductNode2 = new lf.proc.CrossProductNode();
    crossProductNode2.addChild(crossProductNode1);
    crossProductNode2.addChild(new lf.proc.TableAccessNode(d));

    var crossProductNode3 = new lf.proc.CrossProductNode();
    crossProductNode3.addChild(crossProductNode2);
    crossProductNode3.addChild(new lf.proc.TableAccessNode(jh));

    var crossProductNode4 = new lf.proc.CrossProductNode();
    crossProductNode4.addChild(crossProductNode3);
    crossProductNode4.addChild(new lf.proc.TableAccessNode(c));

    var selectStep1 = new lf.proc.SelectNode(predicate1);
    selectStep1.addChild(crossProductNode4);
    var selectStep2 = new lf.proc.SelectNode(predicate2);
    selectStep2.addChild(selectStep1);
    var selectStep3 = new lf.proc.SelectNode(predicate3);
    selectStep3.addChild(selectStep2);
    var selectStep4 = new lf.proc.SelectNode(predicate4);
    selectStep4.addChild(selectStep3);
    var selectStep5 = new lf.proc.SelectNode(predicate5);
    selectStep5.addChild(selectStep4);

    return {queryContext: queryContext, root: selectStep5};
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeAfter, pass);
}


/**
 * Tests a tree that involves a self-table join and table aliases. The value
 * predicate that refers to only one of the two tables is expected to be pushed
 * below the cross product node, whereas the join predicate refers to both
 * tables and therefore should not be pushed further down.
 */
function testTree_JoinPredicates3() {
  var j1 = schema.getJob().as('j1');
  var j2 = schema.getJob().as('j2');

  var treeBefore =
      'select(join_pred(j1.maxSalary eq j2.minSalary))\n' +
      '-select(value_pred(j1.maxSalary lt 30000))\n' +
      '--cross_product\n' +
      '---table_access(Job as j1)\n' +
      '---table_access(Job as j2)\n';

  var treeAfter =
      'select(join_pred(j1.maxSalary eq j2.minSalary))\n' +
      '-cross_product\n' +
      '--select(value_pred(j1.maxSalary lt 30000))\n' +
      '---table_access(Job as j1)\n' +
      '--table_access(Job as j2)\n';

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(hr.db.getSchema());
    queryContext.from = [j1, j2];
    var predicate1 = j1.maxSalary.lt(30000);
    var predicate2 = j1.maxSalary.eq(j2.minSalary);
    queryContext.where = lf.op.and(predicate1, predicate2);

    var crossProductNode = new lf.proc.CrossProductNode();
    crossProductNode.addChild(new lf.proc.TableAccessNode(j1));
    crossProductNode.addChild(new lf.proc.TableAccessNode(j2));
    var selectNode1 = new lf.proc.SelectNode(predicate1);
    selectNode1.addChild(crossProductNode);
    var selectNode2 = new lf.proc.SelectNode(predicate2);
    selectNode2.addChild(selectNode1);

    return {queryContext: queryContext, root: selectNode2};
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeAfter, pass);
}


/**
 * Tests a tree that involves a left outer join and also has an additional
 * value predicate. It ensures that the value predicate is not pushed below the
 * join predicate, such that the join operation is performed before the value
 * predicate is applied.
 */
function testTree_OuterJoinPredicate_Unaffected() {
  var r = schema.getRegion();
  var c = schema.getCountry();

  var treeBefore =
      'select(value_pred(Country.id eq 1))\n' +
      '-select(join_pred(Region.id eq Country.regionId))\n' +
      '--cross_product\n' +
      '---table_access(Region)\n' +
      '---table_access(Country)\n';

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(hr.db.getSchema());
    queryContext.from = [r, c];
    var valuePredicate = c.id.eq(1);
    var joinPredicate = r.id.eq(c.regionId);
    queryContext.where = lf.op.and(valuePredicate, joinPredicate);
    queryContext.outerJoinPredicates = lf.structs.set.create();
    queryContext.outerJoinPredicates.add(joinPredicate.getId());

    var selectNode1 = new lf.proc.SelectNode(valuePredicate);
    var selectNode2 = new lf.proc.SelectNode(joinPredicate);
    var crossProductNode = new lf.proc.CrossProductNode();

    selectNode1.addChild(selectNode2);
    selectNode2.addChild(crossProductNode);
    crossProductNode.addChild(new lf.proc.TableAccessNode(r));
    crossProductNode.addChild(new lf.proc.TableAccessNode(c));

    return {queryContext: queryContext, root: selectNode1};
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeBefore, pass);
}


/**
 * Tests a tree where to OR predicates exist, each one refers to a single table.
 * They should both be pushed down below the cross-product node, and
 * specifically towards the branch that matches the table each predicate refers
 * to.
 */
function testTree_CombinedPredicates_Or() {
  var e = schema.getEmployee();
  var j = schema.getJob();

  var treeBefore =
      'order_by(Employee.id ASC)\n' +
      '-select(combined_pred_or)\n' +
      '--select(combined_pred_or)\n' +
      '---cross_product\n' +
      '----table_access(Employee)\n' +
      '----table_access(Job)\n';

  var treeAfter =
      'order_by(Employee.id ASC)\n' +
      '-cross_product\n' +
      '--select(combined_pred_or)\n' +
      '---table_access(Employee)\n' +
      '--select(combined_pred_or)\n' +
      '---table_access(Job)\n';

  var constructTree = function() {
    var queryContext = new lf.query.SelectContext(hr.db.getSchema());
    queryContext.from = [e, j];
    var predicate1 = lf.op.or(e.salary.gt(1000), e.commissionPercent.gt(10));
    var predicate2 = lf.op.or(j.minSalary.gt(100), j.maxSalary.gt(200));
    queryContext.where = lf.op.and(predicate1, predicate2);
    queryContext.orderBy = [{column: e.id, order: lf.Order.ASC}];

    var orderByNode = new lf.proc.OrderByNode(queryContext.orderBy);
    var selectNode1 = new lf.proc.SelectNode(predicate1);
    var selectNode2 = new lf.proc.SelectNode(predicate2);
    var crossProductNode = new lf.proc.CrossProductNode();
    orderByNode.addChild(selectNode1);
    selectNode1.addChild(selectNode2);
    selectNode2.addChild(crossProductNode);
    queryContext.from.forEach(function(tableSchema) {
      crossProductNode.addChild(new lf.proc.TableAccessNode(tableSchema));
    });

    return {queryContext: queryContext, root: orderByNode};
  };

  lf.testing.treeutil.assertTreeTransformation(
      constructTree(), treeBefore, treeAfter, pass);
}
