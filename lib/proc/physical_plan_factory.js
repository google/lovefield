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
 */
lf.proc.PhysicalPlanFactory = function() {
};


/**
 * @param {!lf.proc.LogicalQueryPlanNode} logicalQueryPlanRoot
 * @return {!lf.proc.PhysicalQueryPlan}
 */
lf.proc.PhysicalPlanFactory.prototype.create = function(
    logicalQueryPlanRoot) {
  if (logicalQueryPlanRoot instanceof lf.proc.InsertOrReplaceNode) {
    return this.createInsertOrReplacePlan_(logicalQueryPlanRoot);
  }

  if (logicalQueryPlanRoot instanceof lf.proc.InsertNode) {
    return this.createInsertPlan_(logicalQueryPlanRoot);
  }

  if (logicalQueryPlanRoot instanceof lf.proc.UpdateNode) {
    return this.createUpdatePlan_(logicalQueryPlanRoot);
  }

  if (logicalQueryPlanRoot instanceof lf.proc.DeleteNode) {
    return this.createDeletePlan_(logicalQueryPlanRoot);
  }

  if (logicalQueryPlanRoot instanceof lf.proc.ProjectNode) {
    return this.createSelectPlan_(logicalQueryPlanRoot);
  }

  // TODO(user): Not implemented for other queries yet.
  var dummyStep = new lf.proc.PhysicalQueryPlanNode();
  return new lf.proc.PhysicalQueryPlan(dummyStep);
};


/**
 * @param {!lf.proc.InsertNode} rootNode
 * @return {!lf.proc.PhysicalQueryPlan}
 * @private
 */
lf.proc.PhysicalPlanFactory.prototype.createInsertPlan_ = function(rootNode) {
  var insertStep = new lf.proc.InsertStep(rootNode.table, rootNode.values);
  return new lf.proc.PhysicalQueryPlan(insertStep);
};


/**
 * @param {!lf.proc.InsertNode} rootNode
 * @return {!lf.proc.PhysicalQueryPlan}
 * @private
 */
lf.proc.PhysicalPlanFactory.prototype.createInsertOrReplacePlan_ = function(
    rootNode) {
  var insertOrReplaceStep = new lf.proc.InsertOrReplaceStep(
      rootNode.table, rootNode.values);
  return new lf.proc.PhysicalQueryPlan(insertOrReplaceStep);
};


/**
 * @param {!lf.proc.UpdateNode} rootNode
 * @return {!lf.proc.PhysicalQueryPlan}
 * @private
 */
lf.proc.PhysicalPlanFactory.prototype.createUpdatePlan_ = function(rootNode) {
  var table = rootNode.table;
  var tableAccessStep = new lf.proc.TableAccessFullStep(table);
  var updates = rootNode.updates;
  var updateStep = new lf.proc.UpdateStep(table, updates);

  var firstChild = rootNode.getChildAt(0);
  if (firstChild instanceof lf.proc.SelectNode) {
    var selectStep = new lf.proc.SelectStep(firstChild.predicate);
    selectStep.addChild(tableAccessStep);
    updateStep.addChild(selectStep);
  } else {
    updateStep.addChild(tableAccessStep);
  }

  return new lf.proc.PhysicalQueryPlan(updateStep);
};


/**
 * @param {!lf.proc.DeleteNode} rootNode
 * @return {!lf.proc.PhysicalQueryPlan}
 * @private
 */
lf.proc.PhysicalPlanFactory.prototype.createDeletePlan_ = function(rootNode) {
  var table = rootNode.table;
  var tableAccessStep = new lf.proc.TableAccessFullStep(table);
  var deleteStep = new lf.proc.DeleteStep(table);

  var firstChild = rootNode.getChildAt(0);
  if (firstChild instanceof lf.proc.SelectNode) {
    var selectStep = new lf.proc.SelectStep(firstChild.predicate);
    selectStep.addChild(tableAccessStep);
    deleteStep.addChild(selectStep);
  } else {
    deleteStep.addChild(tableAccessStep);
  }

  var planRewriter = new lf.proc.PhysicalPlanRewriter(
      deleteStep, [new lf.proc.IndexRangeScanPass()]);
  var newRoot = planRewriter.generate();

  return new lf.proc.PhysicalQueryPlan(newRoot);
};


/**
 * @param {!lf.proc.ProjectNode} rootNode
 * @return {!lf.proc.PhysicalQueryPlan}
 * @private
 */
lf.proc.PhysicalPlanFactory.prototype.createSelectPlan_ = function(rootNode) {
  var rootStep = /** @type {!lf.proc.PhysicalQueryPlanNode} */ (lf.tree.map(
      rootNode, goog.bind(this.mapFn_, this)));

  var planRewriter = new lf.proc.PhysicalPlanRewriter(
      rootStep, [new lf.proc.IndexRangeScanPass()]);
  var newRoot = planRewriter.generate();

  return new lf.proc.PhysicalQueryPlan(newRoot);
};


/**
 * Maps each node of a logical execution plan for a SELECT query to a
 * corresponding physical execution step.
 * @param {!lf.proc.LogicalQueryPlanNode} node The node to be converted.
 * @return {!lf.proc.PhysicalQueryPlanNode} The corresponding physical execution
 *     step.
 * @private
 */
lf.proc.PhysicalPlanFactory.prototype.mapFn_ = function(node) {
  if (node instanceof lf.proc.ProjectNode) {
    return new lf.proc.ProjectStep(node.columns);
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
  }

  return new lf.proc.PhysicalQueryPlanNode();
};
