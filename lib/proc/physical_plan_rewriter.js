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
goog.provide('lf.proc.PhysicalPlanRewriter');



/**
 * Rewrites the logical query plan such that the resulting physical query plan
 * is faster to calculate than the original "naive" plan.
 *
 * @constructor
 * @struct
 *
 * @param {!lf.proc.PhysicalQueryPlanNode} rootNode
 * @param {!Array<!lf.proc.RewritePass.<!lf.proc.PhysicalQueryPlanNode>>}
 *   rewritePasses The rewrite passes to be applied on the physical query tree.
 */
lf.proc.PhysicalPlanRewriter = function(rootNode, rewritePasses) {
  /** @private {!lf.proc.PhysicalQueryPlanNode} */
  this.rootNode_ = rootNode;

  /**
   * @private {!Array<
   *     !lf.proc.RewritePass.<!lf.proc.PhysicalQueryPlanNode>>}
   */
  this.rewritePasses_ = rewritePasses;
};


/**
 * Rewrites the physical plan.
 * @return {!lf.proc.PhysicalQueryPlanNode}
 */
lf.proc.PhysicalPlanRewriter.prototype.generate = function() {
  this.rewritePasses_.forEach(
      function(rewritePass) {
        this.rootNode_ = rewritePass.rewrite(this.rootNode_);
      }, this);

  return this.rootNode_;
};
