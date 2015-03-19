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
goog.provide('lf.proc.LogicalPlanRewriter');

goog.require('lf.proc.LogicalPlanGenerator');



/**
 * Rewrites the logical query plan such that the resulting logical query plan is
 * faster to execute than the original "naive" plan.
 *
 * @constructor
 * @struct
 * @implements {lf.proc.LogicalPlanGenerator}
 *
 * @param {!lf.proc.LogicalQueryPlanNode} rootNode
 * @param {!Array<!lf.proc.RewritePass.<!lf.proc.LogicalQueryPlanNode>>}
 *   rewritePasses The rewrite passes to be applied on the logical query tree.
 */
lf.proc.LogicalPlanRewriter = function(rootNode, rewritePasses) {
  /** @private {!lf.proc.LogicalQueryPlanNode} */
  this.rootNode_ = rootNode;

  /**
   * @private {!Array<
   *     !lf.proc.RewritePass.<!lf.proc.LogicalQueryPlanNode>>}
   */
  this.rewritePasses_ = rewritePasses;
};


/** @override */
lf.proc.LogicalPlanRewriter.prototype.generate = function() {
  this.rewritePasses_.forEach(
      function(rewritePass) {
        this.rootNode_ = rewritePass.rewrite(this.rootNode_);
      }, this);

  return this.rootNode_;
};
