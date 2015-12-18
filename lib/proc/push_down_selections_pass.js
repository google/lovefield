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

goog.require('lf.pred.JoinPredicate');
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
   * @private {!lf.structs.Set<!lf.structs.TreeNode>}
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
lf.proc.PushDownSelectionsPass.prototype.rewrite = function(
    rootNode, queryContext) {
  if (!goog.isDef(queryContext.where)) {
    // No predicates exist.
    return rootNode;
  }

  this.clear_();
  this.rootNode = rootNode;
  this.traverse_(
      this.rootNode, /** @type {!lf.query.SelectContext} */ (queryContext));
  this.clear_();
  return this.rootNode;
};


/**
 * Traverses each node of the tree starting at the given node, rewriting the
 * tree if possible.
 * @param {!lf.proc.LogicalQueryPlanNode} rootNode The root node of the tree
 *     to be traversed.
 * @param {!lf.query.SelectContext} queryContext
 * @private
 */
lf.proc.PushDownSelectionsPass.prototype.traverse_ = function(
    rootNode, queryContext) {
  var processChildren = function(node) {
    node.getChildren().forEach(processNodeRec);
  }.bind(this);

  var processNodeRec = function(node) {
    if (this.alreadyPushedDown_.has(node)) {
      return;
    }
    if (!this.isCandidateNode_(node)) {
      processChildren(node);
      return;
    }

    var selectNode = /** @type {!lf.proc.SelectNode} */ (node);
    var selectNodeTables = selectNode.predicate.getTables();

    var shouldPushDownFn = (function(child) {
      return this.doesReferToTables_(child, selectNodeTables);
    }).bind(this);

    var newRoot = this.pushDownNodeRec_(
        queryContext, selectNode, shouldPushDownFn);
    this.alreadyPushedDown_.add(selectNode);
    if (newRoot != selectNode) {
      if (goog.isNull(newRoot.getParent())) {
        this.rootNode = /** @type {!lf.proc.LogicalQueryPlanNode} */ (newRoot);
      }
      processNodeRec(newRoot);
    }
    processChildren(selectNode);
  }.bind(this);

  processNodeRec(rootNode);
};


/**
 * Recursively pushes down a SelectNode until it can't be pushed any further
 * down.
 * @param {!lf.query.SelectContext} queryContext
 * @param {!lf.proc.SelectNode} node The node to be pushed down.
 * @param {!function(!lf.structs.TreeNode):boolean} shouldPushDownFn
 *     A function to be called for each child to determine whether the node
 *     should be pushed down one level.
 * @return {!lf.proc.LogicalQueryPlanNode} The new root node of the sub-tree
 *     that used to start at "node" or "node" itself if it could not be pushed
 *     further down.
 * @private
 */
lf.proc.PushDownSelectionsPass.prototype.pushDownNodeRec_ = function(
    queryContext, node, shouldPushDownFn) {
  var newRoot = node;

  if (this.shouldSwapWithChild_(queryContext, node)) {
    newRoot = lf.tree.swapNodeWithChild(node);
    this.pushDownNodeRec_(queryContext, node, shouldPushDownFn);
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
      this.pushDownNodeRec_(queryContext, newNode, shouldPushDownFn);
    }, this);
  }

  return /** @type {!lf.proc.LogicalQueryPlanNode} */ (newRoot);
};


/**
 * @param {!lf.proc.LogicalQueryPlanNode} root
 * @param {!lf.structs.Set<!lf.schema.Table>} tables
 * @return {boolean} Whether the subtree that starts at root refers to all
 *     tables in the given list.
 * @private
 */
lf.proc.PushDownSelectionsPass.prototype.doesReferToTables_ =
    function(root, tables) {
  // Finding all tables that are involved in the subtree starting at the given
  // root.
  var referredTables = lf.structs.set.create();
  lf.tree.getLeafNodes(root).forEach(function(tableAccessNode) {
    referredTables.add(
        /** @type {!lf.proc.TableAccessNode} */ (tableAccessNode).table);
  }, this);

  if (root instanceof lf.proc.TableAccessNode) {
    referredTables.add(root.table);
  }

  return lf.structs.set.isSubset(referredTables, tables);
};


/**
 * @param {!lf.structs.TreeNode} node The node to be examined.
 * @return {boolean} Whether the given node is a candidate for being pushed down
 *     the tree.
 * @private
 */
lf.proc.PushDownSelectionsPass.prototype.isCandidateNode_ = function(node) {
  return node instanceof lf.proc.SelectNode;
};


/**
 * @param {!lf.structs.TreeNode} node The node to be examined.
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
 * @param {!lf.query.SelectContext} queryContext
 * @param {!lf.proc.SelectNode} node The node to be examined.
 * @return {boolean} Whether the given node should be swapped with its only
 *     child.
 * @private
 */
lf.proc.PushDownSelectionsPass.prototype.shouldSwapWithChild_ = function(
    queryContext, node) {
  var child = node.getChildAt(0);
  if (!(child instanceof lf.proc.SelectNode)) {
    return false;
  }

  if (!goog.isDefAndNotNull(queryContext.outerJoinPredicates)) {
    return true;
  }
  var nodeIsJoin = node.predicate instanceof lf.pred.JoinPredicate;
  var childIsOuterJoin = queryContext.outerJoinPredicates.has(
      child.predicate.getId());
  // If the node corresponds to a join predicate (outer or inner), allow it to
  // be pushed below any other SelectNode. If the node does not correspond to a
  // join predicate don't allow it to be pushed below an outer join, because it
  // needs to be applied after the outer join is calculated.
  return nodeIsJoin || !childIsOuterJoin;
};
