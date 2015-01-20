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
goog.provide('lf.proc.LimitSkipByIndexPass');

goog.require('goog.asserts');
goog.require('lf.proc.IndexRangeScanStep');
goog.require('lf.proc.LimitStep');
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

  /**
   * Populated the first time the IndexRangeScanStep is located such that the
   * tree does not have to be re-traversed. It is populated with null if the
   * first traversal reveals that this optimization can't be applied.
   * @private {?lf.proc.IndexRangeScanStep}
   */
  this.indexRangeScanStep_;
};
goog.inherits(lf.proc.LimitSkipByIndexPass, lf.proc.RewritePass);


/** @override */
lf.proc.LimitSkipByIndexPass.prototype.rewrite = function(rootNode) {
  this.rootNode = rootNode;
  this.traverse_(this.rootNode);
  return this.rootNode;
};


/**
 * Traverses each node of the tree starting at the given node, rewriting the
 * tree if possible.
 * @param {!lf.proc.PhysicalQueryPlanNode} rootNode The root node of the
 *     sub-tree to be traversed.
 * @private
 */
lf.proc.LimitSkipByIndexPass.prototype.traverse_ = function(rootNode) {
  var newRootNode = rootNode;
  if (rootNode instanceof lf.proc.LimitStep ||
      rootNode instanceof lf.proc.SkipStep) {

    var indexRangeScanStep = this.findIndexRangeScanStep_(rootNode);
    if (!goog.isNull(indexRangeScanStep)) {
      newRootNode = this.mergeToIndexRangeScanStep_(
          rootNode, indexRangeScanStep);
    }
  }

  newRootNode.getChildren().forEach(
      function(child) {
        this.traverse_(
            /** @type {!lf.proc.PhysicalQueryPlanNode} */ (child));
      }, this);
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
    indexRangeScanStep.limit = node.limit;
  } else {
    indexRangeScanStep.skip = node.skip;
  }

  return /** @type {!lf.proc.PhysicalQueryPlanNode} */ (
      lf.tree.removeNode(node));
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
  if (goog.isDef(this.indexRangeScanStep_)) {
    return this.indexRangeScanStep_;
  }

  var filterFn = function(node) {
    // TODO(dpapad): Only IndexRangeScanStep with a single KeyRange instance
    // can be currently optimized, see b/19005405.
    return node instanceof lf.proc.IndexRangeScanStep &&
        node.keyRanges.length == 1;
  };

  // LIMIT and SKIP needs to be executed after joins, cross-products and
  // selections have been calculated. Therefore if such nodes exist this
  // optimization can not be applied.
  var stopFn = function(node) {
    return node.getChildCount() != 1 || node instanceof lf.proc.SelectStep;
  };

  var indexRangeScanSteps = /** @type {!Array<lf.proc.IndexRangeScanStep>} */ (
      lf.tree.find(rootNode, filterFn, stopFn));
  this.indexRangeScanStep_ =
      indexRangeScanSteps.length > 0 ? indexRangeScanSteps[0] : null;
  return this.indexRangeScanStep_;
};
