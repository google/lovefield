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
goog.provide('lf.proc.OrderByIndexPass');

goog.require('goog.asserts');
goog.require('lf.index.SingleKeyRange');
goog.require('lf.proc.IndexRangeScanStep');
goog.require('lf.proc.OrderByStep');
goog.require('lf.proc.RewritePass');
goog.require('lf.proc.TableAccessByRowIdStep');
goog.require('lf.proc.TableAccessFullStep');
goog.require('lf.tree');



/**
 * The OrderByIndexPass is responsible for modifying a tree that has a
 * OrderByStep node to an equivalent tree that leverages indices to perform
 * sorting.
 *
 * @constructor
 * @struct
 * @extends {lf.proc.RewritePass.<!lf.proc.PhysicalQueryPlanNode>}
 *
 * @param {!lf.Global} global
 */
lf.proc.OrderByIndexPass = function(global) {
  lf.proc.OrderByIndexPass.base(this, 'constructor');

  /** @private {!lf.Global} */
  this.global_ = global;
};
goog.inherits(lf.proc.OrderByIndexPass, lf.proc.RewritePass);


/** @override */
lf.proc.OrderByIndexPass.prototype.rewrite = function(rootNode) {
  var orderByStep = lf.proc.OrderByIndexPass.findOrderByStep_(rootNode);

  if (goog.isNull(orderByStep)) {
    // No OrderByStep was found.
    return rootNode;
  }

  var newSubtreeRoot = this.applyTableAccessFullOptimization_(orderByStep);
  if (newSubtreeRoot == orderByStep) {
    newSubtreeRoot = this.applyIndexRangeScanStepOptimization_(orderByStep);
  }

  return /** @type {!lf.proc.PhysicalQueryPlanNode} */ (
      newSubtreeRoot.getRoot());
};


/**
 * Attempts to replace the OrderByStep with a new IndexRangeScanStep.
 * @param {!lf.proc.OrderByStep} orderByStep
 * @return {!lf.proc.PhysicalQueryPlanNode}
 * @private
 */
lf.proc.OrderByIndexPass.prototype.applyTableAccessFullOptimization_ =
    function(orderByStep) {
  var rootNode = orderByStep;

  var tableAccessFullStep = lf.proc.OrderByIndexPass.findTableAccessFullStep_(
      /** @type {!lf.proc.PhysicalQueryPlanNode} */ (
          orderByStep.getChildAt(0)));
  if (!goog.isNull(tableAccessFullStep)) {
    var orderBy = orderByStep.orderBy[0];
    var columnIndex = orderBy.column.getIndices()[0];
    var indexRangeScanStep = new lf.proc.IndexRangeScanStep(
        this.global_, columnIndex, [lf.index.SingleKeyRange.all()],
        orderBy.order);
    var tableAccessByRowIdStep = new lf.proc.TableAccessByRowIdStep(
        this.global_, tableAccessFullStep.table);
    tableAccessByRowIdStep.addChild(indexRangeScanStep);

    lf.tree.removeNode(orderByStep);
    rootNode = /** @type {!lf.proc.PhysicalQueryPlanNode} */ (
        lf.tree.replaceNodeWithChain(
            tableAccessFullStep,
            tableAccessByRowIdStep, indexRangeScanStep));
  }

  return rootNode;
};


/**
 * Attempts to replace the OrderByStep with an existing IndexRangeScanStep.
 * @param {!lf.proc.OrderByStep} orderByStep
 * @return {!lf.proc.PhysicalQueryPlanNode}
 * @private
 */
lf.proc.OrderByIndexPass.prototype.applyIndexRangeScanStepOptimization_ =
    function(orderByStep) {
  var rootNode = orderByStep;
  var indexRangeScanStep = lf.proc.OrderByIndexPass.findIndexRangeScanStep_(
      orderByStep.orderBy[0],
      /** @type {!lf.proc.PhysicalQueryPlanNode} */ (
          orderByStep.getChildAt(0)));
  if (!goog.isNull(indexRangeScanStep)) {
    indexRangeScanStep.order = orderByStep.orderBy[0].order;
    rootNode = /** @type {!lf.proc.PhysicalQueryPlanNode} */ (
        lf.tree.removeNode(orderByStep).parent);
  }

  return rootNode;
};


/**
 * Finds any existing IndexRangeScanStep that can be used to produce the
 * requested ordering instead of the OrderByStep.
 * @param {!lf.query.SelectContext.OrderBy} orderBy
 * @param {!lf.proc.PhysicalQueryPlanNode} rootNode
 * @return {lf.proc.IndexRangeScanStep}
 * @private
 */
lf.proc.OrderByIndexPass.findIndexRangeScanStep_ = function(
    orderBy, rootNode) {
  var filterFn = function(node) {
    return node instanceof lf.proc.IndexRangeScanStep &&
        node.index.columns[0].name == orderBy.column.getName();
  };
  // CrossProductStep and JoinStep nodes have more than one child, and mess up
  // the ordering of results. Therefore if such nodes exist this optimization
  // can not be applied.
  var stopFn = function(node) {
    return node.getChildCount() != 1;
  };

  var indexRangeScanSteps = /** @type {!Array<lf.proc.IndexRangeScanStep>} */ (
      lf.tree.find(rootNode, filterFn, stopFn));
  return indexRangeScanSteps.length > 0 ? indexRangeScanSteps[0] : null;
};


/**
 * Finds any existing TableAccessFullStep that can converted to an
 * IndexRangeScanStep instead of using an explicit OrderByStep.
 * @param {!lf.proc.PhysicalQueryPlanNode} rootNode
 * @return {lf.proc.TableAccessFullStep}
 * @private
 */
lf.proc.OrderByIndexPass.findTableAccessFullStep_ = function(rootNode) {
  var filterFn = function(node) {
    return node instanceof lf.proc.TableAccessFullStep;
  };
  // CrossProductStep and JoinStep nodes have more than one child, and mess up
  // the ordering of results. Therefore if such nodes exist this optimization
  // can not be applied.
  var stopFn = function(node) {
    return node.getChildCount() != 1;
  };

  var tableAccessFullSteps =
      /** @type {!Array<lf.proc.TableAccessFullStep>} */ (
      lf.tree.find(rootNode, filterFn, stopFn));
  return tableAccessFullSteps.length > 0 ? tableAccessFullSteps[0] : null;
};


/**
 * Finds the OrderByStep if it exists in the tree.
 * @param {!lf.proc.PhysicalQueryPlanNode} rootNode
 * @return {?lf.proc.OrderByStep} The OrderByStep or null if it was not found.
 * @private
 */
lf.proc.OrderByIndexPass.findOrderByStep_ = function(rootNode) {
  // TODO(dpapad): Currently only OrderByStep that sort by a single column are
  // considered. Once multi-column indices are implemented, this needs to be
  // updated such that it can optimize cases where sorting is performed by
  // multiple columns, and a multi-column index exists for those columns.
  var filterFn = function(node) {
    return node instanceof lf.proc.OrderByStep &&
        node.orderBy.length == 1 &&
        node.orderBy[0].column.getIndices().length != 0;
  };

  var orderBySteps = lf.tree.find(rootNode, filterFn);
  return orderBySteps.length > 0 ?
      /** @type {lf.proc.OrderByStep} */ (orderBySteps[0]) : null;
};
