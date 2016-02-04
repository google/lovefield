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
goog.provide('lf.proc.PhysicalPlanFactory');

goog.require('lf.Exception');
goog.require('lf.proc.AggregationNode');
goog.require('lf.proc.AggregationStep');
goog.require('lf.proc.CrossProductNode');
goog.require('lf.proc.CrossProductStep');
goog.require('lf.proc.DeleteNode');
goog.require('lf.proc.DeleteStep');
goog.require('lf.proc.GetRowCountPass');
goog.require('lf.proc.GroupByNode');
goog.require('lf.proc.GroupByStep');
goog.require('lf.proc.IndexJoinPass');
goog.require('lf.proc.IndexRangeScanPass');
goog.require('lf.proc.InsertNode');
goog.require('lf.proc.InsertOrReplaceNode');
goog.require('lf.proc.InsertOrReplaceStep');
goog.require('lf.proc.InsertStep');
goog.require('lf.proc.JoinNode');
goog.require('lf.proc.JoinStep');
goog.require('lf.proc.LimitNode');
goog.require('lf.proc.LimitSkipByIndexPass');
goog.require('lf.proc.LimitStep');
goog.require('lf.proc.MultiColumnOrPass');
goog.require('lf.proc.OrderByIndexPass');
goog.require('lf.proc.OrderByNode');
goog.require('lf.proc.OrderByStep');
goog.require('lf.proc.PhysicalPlanRewriter');
goog.require('lf.proc.PhysicalQueryPlan');
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

  /** @private {!Array<!lf.proc.RewritePass>} */
  this.selectOptimizationPasses_ = [
    new lf.proc.IndexJoinPass(),
    new lf.proc.IndexRangeScanPass(this.global_),
    new lf.proc.MultiColumnOrPass(this.global_),
    new lf.proc.OrderByIndexPass(this.global_),
    new lf.proc.LimitSkipByIndexPass(),
    new lf.proc.GetRowCountPass(this.global_)
  ];

  /** @private {!Array<!lf.proc.RewritePass>} */
  this.deleteOptimizationPasses_ = [
    new lf.proc.IndexRangeScanPass(this.global_)
  ];
};


/**
 * @param {!lf.proc.LogicalQueryPlan} logicalQueryPlan
 * @param {!lf.query.Context} queryContext
 * @return {!lf.proc.PhysicalQueryPlan}
 */
lf.proc.PhysicalPlanFactory.prototype.create = function(
    logicalQueryPlan, queryContext) {
  var logicalQueryPlanRoot = logicalQueryPlan.getRoot();
  if ((logicalQueryPlanRoot instanceof lf.proc.InsertOrReplaceNode) ||
      (logicalQueryPlanRoot instanceof lf.proc.InsertNode)) {
    return this.createPlan_(logicalQueryPlan, queryContext);
  }

  if (logicalQueryPlanRoot instanceof lf.proc.ProjectNode ||
      logicalQueryPlanRoot instanceof lf.proc.LimitNode ||
      logicalQueryPlanRoot instanceof lf.proc.SkipNode) {
    return this.createPlan_(
        logicalQueryPlan, queryContext, this.selectOptimizationPasses_);
  }

  if ((logicalQueryPlanRoot instanceof lf.proc.DeleteNode) ||
      (logicalQueryPlanRoot instanceof lf.proc.UpdateNode)) {
    return this.createPlan_(
        logicalQueryPlan, queryContext, this.deleteOptimizationPasses_);
  }

  // Should never get here since all cases are handled above.
  // 8: Unknown query plan node.
  throw new lf.Exception(8);
};


/**
 * @param {!lf.proc.LogicalQueryPlan} logicalPlan
 * @param {!lf.query.Context} queryContext
 * @param {!Array<!lf.proc.RewritePass>=} opt_rewritePasses
 * @return {!lf.proc.PhysicalQueryPlan}
 * @private
 */
lf.proc.PhysicalPlanFactory.prototype.createPlan_ = function(
    logicalPlan, queryContext, opt_rewritePasses) {
  var rootStep = lf.tree.map(
      logicalPlan.getRoot(), this.mapFn_.bind(this));

  if (goog.isDefAndNotNull(opt_rewritePasses)) {
    var planRewriter = new lf.proc.PhysicalPlanRewriter(
        rootStep, queryContext, opt_rewritePasses);
    rootStep = planRewriter.generate();
  }
  return new lf.proc.PhysicalQueryPlan(rootStep, logicalPlan.getScope());
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
    return new lf.proc.ProjectStep(node.columns, node.groupByColumns);
  } else if (node instanceof lf.proc.GroupByNode) {
    return new lf.proc.GroupByStep(node.columns);
  } else if (node instanceof lf.proc.AggregationNode) {
    return new lf.proc.AggregationStep(node.columns);
  } else if (node instanceof lf.proc.OrderByNode) {
    return new lf.proc.OrderByStep(node.orderBy);
  } else if (node instanceof lf.proc.SkipNode) {
    return new lf.proc.SkipStep();
  } else if (node instanceof lf.proc.LimitNode) {
    return new lf.proc.LimitStep();
  } else if (node instanceof lf.proc.SelectNode) {
    return new lf.proc.SelectStep(node.predicate.getId());
  } else if (node instanceof lf.proc.CrossProductNode) {
    return new lf.proc.CrossProductStep();
  } else if (node instanceof lf.proc.JoinNode) {
    return new lf.proc.JoinStep(this.global_, node.predicate, node.isOuterJoin);
  } else if (node instanceof lf.proc.TableAccessNode) {
    return new lf.proc.TableAccessFullStep(this.global_, node.table);
  } else if (node instanceof lf.proc.DeleteNode) {
    return new lf.proc.DeleteStep(node.table);
  } else if (node instanceof lf.proc.UpdateNode) {
    return new lf.proc.UpdateStep(node.table);
  } else if (node instanceof lf.proc.InsertOrReplaceNode) {
    return new lf.proc.InsertOrReplaceStep(
        this.global_, node.table);
  } else if (node instanceof lf.proc.InsertNode) {
    return new lf.proc.InsertStep(this.global_, node.table);
  }

  // 514: Unknown node type.
  throw new lf.Exception(514);
};
