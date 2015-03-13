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
goog.require('lf.Order');
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
    var indexRangeCandidate =
        lf.proc.OrderByIndexPass.findIndexCandidateForOrderBy_(
            tableAccessFullStep.table, orderByStep.orderBy);

    if (goog.isNull(indexRangeCandidate.indexSchema)) {
      // Could not find an index schema that can be leveraged.
      return rootNode;
    }

    var indexRangeScanStep = new lf.proc.IndexRangeScanStep(
        this.global_,
        indexRangeCandidate.indexSchema,
        /** @type {!Array<!lf.index.KeyRange|!lf.index.SingleKeyRange>} */ (
            indexRangeCandidate.keyRanges),
        indexRangeCandidate.isReverse);
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
    indexRangeScanStep.reverseOrder =
        orderByStep.orderBy[0].order !=
            indexRangeScanStep.index.columns[0].order;
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
  var filterFn = function(node) {
    return node instanceof lf.proc.OrderByStep;
  };

  var orderBySteps = lf.tree.find(rootNode, filterFn);
  return orderBySteps.length > 0 ?
      /** @type {lf.proc.OrderByStep} */ (orderBySteps[0]) : null;
};


/**
 * @param {!lf.schema.Table} tableSchema
 * @param {!Array<!lf.query.SelectContext.OrderBy>} orderBy
 * @return {!lf.proc.OrderByIndexPass.IndexRangeCandidate_}
 * @private
 */
lf.proc.OrderByIndexPass.findIndexCandidateForOrderBy_ = function(
    tableSchema, orderBy) {
  var indexCandidate = {
    indexSchema: null,
    keyRanges: null,
    isReverse: false
  };

  var indexSchemas = tableSchema.getIndices();
  for (var i = 0; i < indexSchemas.length; i++) {
    var indexSchema = indexSchemas[i];

    // First find an index schema which includes all columns to be sorted in the
    // same order.
    var columnsMatch = indexSchema.columns.length == orderBy.length &&
        orderBy.every(function(singleOrderBy, j) {
          var indexedColumn = indexSchema.columns[j];
          return singleOrderBy.column.getName() == indexedColumn.name;
        });

    if (!columnsMatch) {
      continue;
    }

    // If colums match, determine whether the requested ordering within each
    // column matches the index, either in natural or reverse order.
    var isNaturalOrReverse = lf.proc.OrderByIndexPass.checkOrder_(
        orderBy, indexSchema);

    if (!isNaturalOrReverse[0] && !isNaturalOrReverse[1]) {
      continue;
    }

    indexCandidate.indexSchema = indexSchema;
    indexCandidate.isReverse = isNaturalOrReverse[1];
    indexCandidate.keyRanges = indexSchema.columns.length == 1 ?
        [lf.index.SingleKeyRange.all()] :
        [indexSchema.columns.map(function(column) {
          return lf.index.SingleKeyRange.all();
        })];
    break;
  }

  return indexCandidate;
};


/**
 * @typedef {{
 *   indexSchema: ?lf.schema.Index,
 *   keyRanges: ?Array<!lf.index.KeyRange|!lf.index.SingleKeyRange>,
 *   isReverse: boolean
 * }}
 */
lf.proc.OrderByIndexPass.IndexRangeCandidate_;


/**
 * Compares the order of each column in the orderBy and the indexSchema and
 * determines whether it is equal to the indexSchema's 'natural' or 'reverse'
 * order.
 * @param {!Array<!lf.query.SelectContext.OrderBy>} orderBy
 * @param {!lf.schema.Index} indexSchema
 * @return {!Array<boolean>} An array of 2 elements, where 1st element
 *     corresponds to isNatural and 2nd to isReverse.
 * @private
 */
lf.proc.OrderByIndexPass.checkOrder_ = function(orderBy, indexSchema) {
  // Converting orderBy orders to a bitmask.
  var ordersLeftBitmask = orderBy.reduce(function(soFar, columnOrderBy) {
    return (soFar << 1) | (columnOrderBy.order == lf.Order.DESC ? 0 : 1);
  }, 0);

  // Converting indexSchema orders to a bitmask.
  var ordersRightBitmask = indexSchema.columns.reduce(
      function(soFar, indexedColumn) {
        return (soFar << 1) | (indexedColumn.order == lf.Order.DESC ? 0 : 1);
      }, 0);

  var xorBitmask = ordersLeftBitmask ^ ordersRightBitmask;
  var isNatural = xorBitmask == 0;
  var isReverse = xorBitmask == Math.pow(
      2, Math.max(orderBy.length, indexSchema.columns.length)) - 1;

  return [isNatural, isReverse];
};
