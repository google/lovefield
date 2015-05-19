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
goog.module('lf.proc.CrossProductPass');
// TODO(dpapad): Remove once the codebase has migrated fully to goog.module.
goog.module.declareLegacyNamespace();

var CrossProductNode = goog.require('lf.proc.CrossProductNode');
var RewritePass = goog.require('lf.proc.RewritePass');



var CrossProductPass = goog.defineClass(RewritePass, {
  /**
   * The CrossProductPass is responsible for modifying a tree that has a
   * CrossProductNode with 3 or more children to an equivalent tree that has
   * multiple CrossProductNodes where each one has exactly two children.
   *
   * @extends {RewritePass.<!lf.proc.LogicalQueryPlanNode>}
   */
  constructor: function() {
    CrossProductPass.base(this, 'constructor');
  },


  /** @override */
  rewrite: function(rootNode) {
    this.rootNode = rootNode;
    this.traverse_(this.rootNode);
    return this.rootNode;
  },


  /**
   * Traverses each node of the tree starting at the given node, rewriting the
   * tree if possible.
   * @param {!lf.proc.LogicalQueryPlanNode} rootNode The root node of the sub-tree
   *     to be traversed.
   * @private
   */
  traverse_: function(rootNode) {
    // If rootNode is a CrossProduct and has more than 2 childs, break it down.
    // TODO(dpapad): This needs optimization, since the order chosen here affects
    // whether subsequent steps will be able to convert the cross-product to a
    // join.
    if (rootNode instanceof CrossProductNode) {
      while (rootNode.getChildCount() > 2) {
        var crossProduct = new CrossProductNode();
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
  }
});


exports = CrossProductPass;
