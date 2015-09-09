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
goog.provide('lf.proc.CrossProductPass');

goog.require('lf.proc.CrossProductNode');
goog.require('lf.proc.RewritePass');



/**
 * The CrossProductPass is responsible for modifying a tree that has a
 * CrossProductNode with 3 or more children to an equivalent tree that has
 * multiple CrossProductNodes where each one has exactly two children.
 *
 * @constructor
 * @struct
 * @extends {lf.proc.RewritePass.<!lf.proc.LogicalQueryPlanNode>}
 */
lf.proc.CrossProductPass = function() {
  lf.proc.CrossProductPass.base(this, 'constructor');
};
goog.inherits(lf.proc.CrossProductPass, lf.proc.RewritePass);


/** @override */
lf.proc.CrossProductPass.prototype.rewrite = function(rootNode, queryContext) {
  if (queryContext.from.length < 3) {
    return rootNode;
  }

  this.rootNode = rootNode;
  this.traverse_(this.rootNode);
  return this.rootNode;
};


/**
 * Traverses each node of the tree starting at the given node, rewriting the
 * tree if possible.
 * @param {!lf.proc.LogicalQueryPlanNode} rootNode The root node of the sub-tree
 *     to be traversed.
 * @private
 */
lf.proc.CrossProductPass.prototype.traverse_ = function(rootNode) {
  // If rootNode is a CrossProduct and has more than 2 childs, break it down.
  // TODO(dpapad): This needs optimization, since the order chosen here affects
  // whether subsequent steps will be able to convert the cross-product to a
  // join.
  if (rootNode instanceof lf.proc.CrossProductNode) {
    while (rootNode.getChildCount() > 2) {
      var crossProduct = new lf.proc.CrossProductNode();
      for (var i = 0; i < 2; i++) {
        var child = rootNode.removeChildAt(0);
        crossProduct.addChild(
            /** @type {!lf.proc.LogicalQueryPlanNode} */ (child));
      }
      rootNode.addChildAt(crossProduct, 0);
    }
  }

  rootNode.getChildren().forEach(
      function(child) {
        this.traverse_(
            /** @type {!lf.proc.LogicalQueryPlanNode} */ (child));
      }, this);
};
