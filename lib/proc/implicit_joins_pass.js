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
goog.provide('lf.proc.ImplicitJoinsPass');

goog.require('goog.asserts');
goog.require('lf.pred.JoinPredicate');
goog.require('lf.proc.CrossProductNode');
goog.require('lf.proc.JoinNode');
goog.require('lf.proc.RewritePass');
goog.require('lf.proc.SelectNode');
goog.require('lf.tree');



/**
 * @constructor
 * @struct
 * @extends {lf.proc.RewritePass.<!lf.proc.LogicalQueryPlanNode>}
 */
lf.proc.ImplicitJoinsPass = function() {
  lf.proc.ImplicitJoinsPass.base(this, 'constructor');
};
goog.inherits(lf.proc.ImplicitJoinsPass, lf.proc.RewritePass);


/** @override */
lf.proc.ImplicitJoinsPass.prototype.rewrite = function(rootNode, query) {
  this.rootNode = rootNode;
  this.traverse_(
      this.rootNode,
      (/**@type {!lf.query.SelectContext} */ (query)));
  return this.rootNode;
};


/**
 * Traverses each node of the tree starting at the given node, rewriting the
 * tree if possible.
 * @param {!lf.proc.LogicalQueryPlanNode} rootNode The root node of the sub-tree
 *     to be traversed.
 * @param {!lf.query.SelectContext=} opt_query
 * @private
 */
lf.proc.ImplicitJoinsPass.prototype.traverse_ = function(rootNode, opt_query) {
  if (rootNode instanceof lf.proc.SelectNode &&
      rootNode.predicate instanceof lf.pred.JoinPredicate) {
    goog.asserts.assert(
        rootNode.getChildCount() == 1,
        'SelectNode must have exactly one child.');
    var predicateId = rootNode.predicate.getId();

    var child = /** @type {!goog.structs.TreeNode} */ (
        rootNode.getChildAt(0));
    if (child instanceof lf.proc.CrossProductNode) {
      var isOuterJoin = goog.isDef(opt_query) &&
          goog.isDefAndNotNull(opt_query.outerJoinPredicates) &&
          opt_query.outerJoinPredicates.has(predicateId);
      var joinNode = new lf.proc.JoinNode(rootNode.predicate, isOuterJoin);
      lf.tree.replaceChainWithNode(rootNode, child, joinNode);
      if (rootNode == this.rootNode) {
        this.rootNode = joinNode;
      }
      rootNode = joinNode;
    }
  }
  rootNode.getChildren().forEach(
      function(child) {
        this.traverse_(
            /** @type {!lf.proc.LogicalQueryPlanNode} */ (child),
            /** @type {!lf.query.SelectContext} */ (opt_query));
      }, this);
};
