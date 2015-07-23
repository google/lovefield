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
goog.provide('lf.proc.DeleteLogicalPlanGenerator');

goog.require('lf.proc.BaseLogicalPlanGenerator');
goog.require('lf.proc.DeleteNode');
goog.require('lf.proc.LogicalPlanRewriter');
goog.require('lf.proc.SelectNode');
goog.require('lf.proc.TableAccessNode');



/**
 * @constructor
 * @struct
 * @extends {lf.proc.BaseLogicalPlanGenerator.<!lf.query.DeleteContext>}
 *
 * @param {!lf.query.DeleteContext} query
 * @param {!Array<!lf.proc.RewritePass>} rewritePasses
 */
lf.proc.DeleteLogicalPlanGenerator = function(query, rewritePasses) {
  lf.proc.DeleteLogicalPlanGenerator.base(this, 'constructor', query);

  /** @private {!Array<!lf.proc.RewritePass>} */
  this.rewritePasses_ = rewritePasses;
};
goog.inherits(lf.proc.DeleteLogicalPlanGenerator,
    lf.proc.BaseLogicalPlanGenerator);


/** @override */
lf.proc.DeleteLogicalPlanGenerator.prototype.generateInternal = function() {
  var deleteNode = new lf.proc.DeleteNode(this.query.from);
  var selectNode = goog.isDefAndNotNull(this.query.where) ?
      new lf.proc.SelectNode(this.query.where.copy()) : null;
  var tableAccessNode = new lf.proc.TableAccessNode(this.query.from);

  if (goog.isNull(selectNode)) {
    deleteNode.addChild(tableAccessNode);
  } else {
    selectNode.addChild(tableAccessNode);
    deleteNode.addChild(selectNode);
  }

  // Optimizing the "naive" logical plan.
  var planRewriter = new lf.proc.LogicalPlanRewriter(
      /** @type {!lf.proc.LogicalQueryPlanNode} */ (deleteNode),
      this.query, this.rewritePasses_);
  return planRewriter.generate();
};
