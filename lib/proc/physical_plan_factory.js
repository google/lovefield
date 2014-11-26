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
goog.provide('lf.proc.PhysicalPlanFactory');

goog.require('goog.asserts');
goog.require('lf.proc.CrossProductNode');
goog.require('lf.proc.CrossProductStep');
goog.require('lf.proc.DeleteNode');
goog.require('lf.proc.DeleteStep');
goog.require('lf.proc.IndexRangeScanPass');
goog.require('lf.proc.InsertNode');
goog.require('lf.proc.InsertOrReplaceNode');
goog.require('lf.proc.InsertOrReplaceStep');
goog.require('lf.proc.InsertStep');
goog.require('lf.proc.JoinNode');
goog.require('lf.proc.JoinStep');
goog.require('lf.proc.LimitNode');
goog.require('lf.proc.LimitStep');
goog.require('lf.proc.OrderByNode');
goog.require('lf.proc.OrderByStep');
goog.require('lf.proc.PhysicalPlanRewriter');
goog.require('lf.proc.PhysicalQueryPlan');
goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.proc.ProjectNode');
goog.require('lf.proc.ProjectStep');
goog.require('lf.proc.SelectNode');
goog.require('lf.proc.SelectStep');
goog.require('lf.proc.SkipNode');
goog.require('lf.proc.SkipStep');
goog.require('lf.proc.TableAccessFullStep');
goog.require('lf.proc.TableAccessNode');
goog.require('lf.proc.UpdateNode');
goog.require('lf.proc.UpdateStep');
goog.require('lf.tree');



/**
 * @constructor @struct
 *
 * @param {!lf.Global} global
 */
lf.proc.PhysicalPlanFactory = function(global) {
  /** @private {!lf.Global} */
  this.global_ = global;
};


/**
 * @param {!lf.proc.LogicalQueryPlanNode} logicalQueryPlanRoot
 * @return {!lf.proc.PhysicalQueryPlan}
 */
lf.proc.PhysicalPlanFactory.prototype.create = function(
    logicalQueryPlanRoot) {
  if ((logicalQueryPlanRoot instanceof lf.proc.InsertOrReplaceNode) ||
      (logicalQueryPlanRoot instanceof lf.proc.InsertNode) ||
      (logicalQueryPlanRoot instanceof lf.proc.UpdateNode)) {
    return this.createPlan_(logicalQueryPlanRoot);
  }

  if ((logicalQueryPlanRoot instanceof lf.proc.DeleteNode) ||
      (logicalQueryPlanRoot instanceof lf.proc.ProjectNode)) {
    return this.createPlan_(
        logicalQueryPlanRoot, [new lf.proc.IndexRangeScanPass(this.global_)]);
  }


  // Should never get here since all cases are handled above.
  goog.asserts.fail('Unknown query type.');

  var dummyStep = new lf.proc.PhysicalQueryPlanNode();
  return new lf.proc.PhysicalQueryPlan(dummyStep);
};


/**
 * @param {!lf.proc.LogicalQueryPlanNode} rootNode
 * @param {!Array.<!lf.proc.RewritePass>=} opt_rewritePasses
 * @return {!lf.proc.PhysicalQueryPlan}
 * @private
 */
lf.proc.PhysicalPlanFactory.prototype.createPlan_ = function(
    rootNode, opt_rewritePasses) {
  var rootStep = /** @type {!lf.proc.PhysicalQueryPlanNode} */ (lf.tree.map(
      rootNode, goog.bind(this.mapFn_, this)));

  if (goog.isDefAndNotNull(opt_rewritePasses)) {
    var planRewriter = new lf.proc.PhysicalPlanRewriter(
        rootStep, opt_rewritePasses);
    return new lf.proc.PhysicalQueryPlan(planRewriter.generate());
  } else {
    return new lf.proc.PhysicalQueryPlan(rootStep);
  }
};


/**
 * Maps each node of a logical execution plan to a corresponding physical
 * execution step.
 * @param {!lf.proc.LogicalQueryPlanNode} node The node to be converted.
 * @return {!lf.proc.PhysicalQueryPlanNode} The corresponding physical execution
 *     step.
 * @private
 */
lf.proc.PhysicalPlanFactory.prototype.mapFn_ = function(node) {
  if (node instanceof lf.proc.ProjectNode) {
    return new lf.proc.ProjectStep(node.columns, node.groupByColumn);
  } else if (node instanceof lf.proc.OrderByNode) {
    return new lf.proc.OrderByStep(node.orderBy);
  } else if (node instanceof lf.proc.SkipNode) {
    return new lf.proc.SkipStep(node.skip);
  } else if (node instanceof lf.proc.LimitNode) {
    return new lf.proc.LimitStep(node.limit);
  } else if (node instanceof lf.proc.SelectNode) {
    return new lf.proc.SelectStep(node.predicate);
  } else if (node instanceof lf.proc.CrossProductNode) {
    return new lf.proc.CrossProductStep();
  } else if (node instanceof lf.proc.JoinNode) {
    return new lf.proc.JoinStep(node.predicate);
  } else if (node instanceof lf.proc.TableAccessNode) {
    return new lf.proc.TableAccessFullStep(node.table);
  } else if (node instanceof lf.proc.DeleteNode) {
    return new lf.proc.DeleteStep(node.table);
  } else if (node instanceof lf.proc.UpdateNode) {
    return new lf.proc.UpdateStep(node.table, node.updates);
  } else if (node instanceof lf.proc.InsertOrReplaceNode) {
    return new lf.proc.InsertOrReplaceStep(node.table, node.values);
  } else if (node instanceof lf.proc.InsertNode) {
    return new lf.proc.InsertStep(node.table, node.values);
  }

  return new lf.proc.PhysicalQueryPlanNode();
};
