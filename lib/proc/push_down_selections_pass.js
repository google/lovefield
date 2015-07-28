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
goog.provide('lf.proc.PushDownSelectionsPass');

goog.require('lf.pred.CombinedPredicate');
goog.require('lf.pred.ValuePredicate');
goog.require('lf.proc.CrossProductNode');
goog.require('lf.proc.JoinNode');
goog.require('lf.proc.RewritePass');
goog.require('lf.proc.SelectNode');
goog.require('lf.proc.TableAccessNode');
goog.require('lf.structs.set');
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
   * @private {!lf.structs.Set<!goog.structs.TreeNode>}
   */
  this.alreadyPushedDown_ = lf.structs.set.create();
};
goog.inherits(lf.proc.PushDownSelectionsPass, lf.proc.RewritePass);


/**
 * Clears any state in this rewrite pass, such that it can be re-used for
 * rewriting multiple trees.
 * @private
 */
lf.proc.PushDownSelectionsPass.prototype.clear_ = function() {
  this.alreadyPushedDown_.clear();
};


/** @override */
lf.proc.PushDownSelectionsPass.prototype.rewrite = function(rootNode) {
  this.clear_();
  this.rootNode = rootNode;
  this.traverse_(this.rootNode);
  this.clear_();
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

    var newRoot = selectNode.predicate instanceof lf.pred.ValuePredicate ?
        this.pushDownValuePredNodeRec_(selectNode) :
        this.pushDownJoinPredNodeRec_(selectNode);
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
          !this.alreadyPushedDown_.has(newRoot)) {
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
 * Recursively pushes down a SelectNode (either ValuePredicate or JoinPredicate)
 * until the SelectNode can't be pushed any further down.
 * @param {!lf.proc.SelectNode} node The node to be pushed down.
 * @param {!function(!goog.structs.TreeNode):boolean} shouldPushDownFn
 *     A function to be called for each child to determine whether the node
 *     should be pushed down one level.
 * @return {!lf.proc.LogicalQueryPlanNode} The new root node of the sub-tree
 *     that used to start at "node" or "node" itself if it could not be pushed
 *     further down.
 * @private
 */
lf.proc.PushDownSelectionsPass.prototype.pushDownNodeRec_ = function(
    node, shouldPushDownFn) {
  var newRoot = node;

  if (this.shouldSwapWithChild_(node)) {
    newRoot = lf.tree.swapNodeWithChild(node);
    this.pushDownNodeRec_(node, shouldPushDownFn);
  } else if (this.shouldPushBelowChild_(node)) {
    var newNodes = [];
    var cloneFn = function(node) {
      var newNode = new lf.proc.SelectNode(node.predicate);
      newNodes.push(newNode);
      return newNode;
    };
    newRoot = lf.tree.pushNodeBelowChild(node, shouldPushDownFn, cloneFn);

    // Recursively pushing down the nodes that were just added to the tree as a
    // result of pushing down "node", if any.
    newNodes.forEach(function(newNode) {
      this.pushDownNodeRec_(newNode, shouldPushDownFn);
    }, this);
  }

  return /** @type {!lf.proc.LogicalQueryPlanNode} */ (newRoot);
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
lf.proc.PushDownSelectionsPass.prototype.pushDownValuePredNodeRec_ =
    function(node) {
  var selectNodeTables = lf.structs.set.create(
      [node.predicate.column.getTable().getEffectiveName()]);

  var shouldPushDownFn = (function(child) {
    return this.doesReferToTables_(child, selectNodeTables);
  }).bind(this);

  return this.pushDownNodeRec_(node, shouldPushDownFn);
};


/**
 * Recursively pushes down a SelectNode corresponding to a JoinPredicate, until
 * the SelectNode can't be pushed any further down.
 * @param {!lf.proc.SelectNode} node The node to be pushed down.
 * @return {!lf.proc.LogicalQueryPlanNode} The new root node of the sub-tree
 *     that used to start at "node" or "node" itself if it could not be pushed
 *     further down.
 * @private
 */
lf.proc.PushDownSelectionsPass.prototype.pushDownJoinPredNodeRec_ =
    function(node) {
  // Finding all tables that are involved in the join predicate.
  var selectNodeTables = lf.structs.set.create([
    node.predicate.leftColumn.getTable().getEffectiveName(),
    node.predicate.rightColumn.getTable().getEffectiveName()
  ]);

  var shouldPushDownFn = (function(child) {
    return this.doesReferToTables_(child, selectNodeTables);
  }).bind(this);

  return this.pushDownNodeRec_(node, shouldPushDownFn);
};


/**
 * @param {!lf.proc.LogicalQueryPlanNode} root
 * @param {!lf.structs.Set<string>} tables
 * @return {boolean} Whether the subtree that starts at root refers to all
 *     tables in the given list.
 * @private
 */
lf.proc.PushDownSelectionsPass.prototype.doesReferToTables_ =
    function(root, tables) {
  // Finding all tables that are involved in the subtree starting at the given
  // root.
  var referredTables = lf.structs.set.create();
  lf.tree.getLeafNodes(root).forEach(
      function(tableAccessNode) {
        referredTables.add(tableAccessNode.table.getEffectiveName());
      }, this);

  if (root instanceof lf.proc.TableAccessNode) {
    referredTables.add(root.table.getEffectiveName());
  }

  return lf.structs.set.isSubset(referredTables, tables);
};


/**
 * @param {!goog.structs.TreeNode} node The node to be examined.
 * @return {boolean} Whether the given node is a candidate for being pushed down
 *     the tree.
 * @private
 */
lf.proc.PushDownSelectionsPass.prototype.isCandidateNode_ = function(node) {
  return node instanceof lf.proc.SelectNode &&
      !(node.predicate instanceof lf.pred.CombinedPredicate);
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
