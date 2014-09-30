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
goog.provide('lf.proc.PushDownSelectionsPass');

goog.require('goog.structs.Set');
goog.require('lf.pred.ValuePredicate');
goog.require('lf.proc.CrossProductNode');
goog.require('lf.proc.JoinNode');
goog.require('lf.proc.RewritePass');
goog.require('lf.proc.SelectNode');
goog.require('lf.proc.TableAccessNode');
goog.require('lf.tree');



/**
 * @constructor
 * @struct
 * @extends {lf.proc.RewritePass.<!lf.proc.LogicalQueryPlanNode>}
 */
lf.proc.PushDownSelectionsPass = function() {
  lf.proc.PushDownSelectionsPass.base(this, 'constructor');

  /**
   * A set of SelectNodes that have already been pushed down. This is necessary
   * to avoid re-visiting the same nodes (endless recursion).
   * @private {!goog.structs.Set.<!goog.structs.TreeNode>}
   */
  this.alreadyPushedDown_ = new goog.structs.Set();
};
goog.inherits(lf.proc.PushDownSelectionsPass, lf.proc.RewritePass);


/** @override */
lf.proc.PushDownSelectionsPass.prototype.rewrite = function(rootNode) {
  this.rootNode = rootNode;
  this.traverse_(this.rootNode);
  this.alreadyPushedDown_.clear();
  return this.rootNode;
};


/**
 * Traverses each node of the tree starting at the given node, rewriting the
 * tree if possible.
 * @param {!lf.proc.LogicalQueryPlanNode} node The root node of the sub-tree
 *     to be traversed.
 * @private
 */
lf.proc.PushDownSelectionsPass.prototype.traverse_ = function(node) {
  if (this.isCandidateNode_(node)) {
    var selectNode = /** @type {!lf.proc.SelectNode} */ (node);
    var newRoot = this.pushDownNodeRec_(selectNode);
    this.alreadyPushedDown_.add(selectNode);

    if (newRoot == selectNode) {
      // SelectNode could not be pushed further down. Continue traversing from
      // its only child.
      newRoot = selectNode.getChildAt(0);
    }
    if (!goog.isNull(newRoot)) {
      if (goog.isNull(newRoot.getParent())) {
        this.rootNode = /** @type {!lf.proc.LogicalQueryPlanNode} */ (newRoot);
      }
      if (this.isCandidateNode_(newRoot) &&
          !this.alreadyPushedDown_.contains(newRoot)) {
        this.traverse_(/** @type {!lf.proc.LogicalQueryPlanNode} */ (newRoot));
      }
    }
    return;
  }

  node.getChildren().forEach(
      function(child) {
        this.traverse_(
            /** @type {!lf.proc.LogicalQueryPlanNode} */ (child));
      }, this);
};


/**
 * Recursively pushes down a SelectNode corresponding to a ValuePredicate, until
 * the SelectNode can't be pushed any further down.
 * @param {!lf.proc.SelectNode} node The node to be pushed down.
 * @return {!lf.proc.LogicalQueryPlanNode} The new root node of the sub-tree
 *     that used to start at "node" or "node" itself if it could not be pushed
 *     further down.
 * @private
 */
lf.proc.PushDownSelectionsPass.prototype.pushDownNodeRec_ = function(node) {
  var cloneFn = function(node) {
    return new lf.proc.SelectNode(node.predicate);
  };

  var shouldPushDownFn = function(child) {
    var tableName = node.predicate.column.getTable().getName();
    var cond1 = child instanceof lf.proc.TableAccessNode &&
        child.table.getName() == tableName;
    var cond2 = child instanceof lf.proc.SelectNode &&
        child.predicate.column.getTable().getName() == tableName;
    return cond1 || cond2;
  };

  var newRoot = node;
  if (this.shouldSwapWithChild_(node)) {
    newRoot = lf.tree.swapNodeWithChild(node);
    this.pushDownNodeRec_(node);
  } else if (this.shouldPushBelowChild_(node)) {
    newRoot = lf.tree.pushNodeBelowChild(node, shouldPushDownFn, cloneFn);
  }

  return /** @type {!lf.proc.LogicalQueryPlanNode} */ (newRoot);
};


/**
 * @param {!goog.structs.TreeNode} node The node to be examined.
 * @return {boolean} Whether the given node is a candidate for being pushed down
 *     the tree.
 * @private
 */
lf.proc.PushDownSelectionsPass.prototype.isCandidateNode_ = function(node) {
  return node instanceof lf.proc.SelectNode &&
      node.predicate instanceof lf.pred.ValuePredicate;
};


/**
 * @param {!goog.structs.TreeNode} node The node to be examined.
 * @return {boolean} Whether an attempt should be made to push the given node
 *     below its only child.
 * @private
 */
lf.proc.PushDownSelectionsPass.prototype.shouldPushBelowChild_ =
    function(node) {
  var child = node.getChildAt(0);
  return child instanceof lf.proc.CrossProductNode ||
      child instanceof lf.proc.JoinNode;
};


/**
 * @param {!goog.structs.TreeNode} node The node to be examined.
 * @return {boolean} Whether the given node should be swapped with its only
 *     child.
 * @private
 */
lf.proc.PushDownSelectionsPass.prototype.shouldSwapWithChild_ = function(node) {
  return node.getChildAt(0) instanceof lf.proc.SelectNode;
};
