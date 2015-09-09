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
goog.provide('lf.proc.LimitSkipByIndexPass');

goog.require('lf.proc.IndexRangeScanStep');
goog.require('lf.proc.LimitStep');
goog.require('lf.proc.OrderByStep');
goog.require('lf.proc.ProjectStep');
goog.require('lf.proc.RewritePass');
goog.require('lf.proc.SelectStep');
goog.require('lf.proc.SkipStep');
goog.require('lf.tree');



/**
 * The LimitSkipByIndexPass is responsible for leveraging indices to perform
 * LIMIT and SKIP, if possible.
 *
 * @constructor
 * @struct
 * @extends {lf.proc.RewritePass.<!lf.proc.PhysicalQueryPlanNode>}
 */
lf.proc.LimitSkipByIndexPass = function() {
  lf.proc.LimitSkipByIndexPass.base(this, 'constructor');
};
goog.inherits(lf.proc.LimitSkipByIndexPass, lf.proc.RewritePass);


/** @override */
lf.proc.LimitSkipByIndexPass.prototype.rewrite = function(
    rootNode, queryContext) {
  if (!goog.isDef(queryContext.limit) && !goog.isDef(queryContext.skip)) {
    // No LIMIT or SKIP exists.
    return rootNode;
  }

  var indexRangeScanStep = this.findIndexRangeScanStep_(rootNode);
  if (goog.isNull(indexRangeScanStep)) {
    // No IndexRangeScanStep that can be leveraged was found.
    return rootNode;
  }

  var nodes = lf.tree.find(
      rootNode,
      function(node) {
        return node instanceof lf.proc.LimitStep ||
            node instanceof lf.proc.SkipStep;
      });

  nodes.forEach(function(node) {
    this.mergeToIndexRangeScanStep_(
        /** @type {!lf.proc.LimitStep|!lf.proc.SkipStep} */ (node),
        /** @type {!lf.proc.IndexRangeScanStep} */ (indexRangeScanStep));
  }, this);

  return /** @type {!lf.proc.PhysicalQueryPlanNode} */ (
      indexRangeScanStep.getRoot());
};


/**
 * Merges a LimitStep or SkipStep to the given IndexRangeScanStep.
 * @param {!lf.proc.LimitStep|!lf.proc.SkipStep} node
 * @param {!lf.proc.IndexRangeScanStep} indexRangeScanStep
 * @return {!lf.proc.PhysicalQueryPlanNode} The new root of the tree.
 * @private
 */
lf.proc.LimitSkipByIndexPass.prototype.mergeToIndexRangeScanStep_ = function(
    node, indexRangeScanStep) {
  if (node instanceof lf.proc.LimitStep) {
    indexRangeScanStep.useLimit = true;
  } else {
    indexRangeScanStep.useSkip = true;
  }

  return /** @type {!lf.proc.PhysicalQueryPlanNode} */ (
      lf.tree.removeNode(node).parent);
};


/**
 * Finds any existing IndexRangeScanStep that can be leveraged to limit and
 * skip results.
 * @param {!lf.proc.PhysicalQueryPlanNode} rootNode
 * @return {?lf.proc.IndexRangeScanStep}
 * @private
 */
lf.proc.LimitSkipByIndexPass.prototype.findIndexRangeScanStep_ =
    function(rootNode) {
  var filterFn = function(node) {
    return node instanceof lf.proc.IndexRangeScanStep;
  };

  /*
   * LIMIT and SKIP needs to be executed after
   *  - projections that include either groupBy or aggregators,
   *  - joins/cross-products,
   *  - selections,
   *  - sorting
   * have been calculated. Therefore if such nodes exist this optimization can
   * not be applied.
   */
  var stopFn = function(node) {
    var hasAggregators = node instanceof lf.proc.ProjectStep &&
        node.hasAggregators();
    return hasAggregators ||
        node instanceof lf.proc.OrderByStep ||
        node.getChildCount() != 1 ||
        node instanceof lf.proc.SelectStep;
  };

  var indexRangeScanSteps = /** @type {!Array<lf.proc.IndexRangeScanStep>} */ (
      lf.tree.find(rootNode, filterFn, stopFn));
  return indexRangeScanSteps.length > 0 ? indexRangeScanSteps[0] : null;
};
