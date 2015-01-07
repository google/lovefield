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
goog.provide('lf.proc.IndexRangeScanPass');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('lf.Order');
goog.require('lf.pred.ValuePredicate');
goog.require('lf.proc.IndexRangeScanStep');
goog.require('lf.proc.RewritePass');
goog.require('lf.proc.SelectStep');
goog.require('lf.proc.TableAccessByRowIdStep');
goog.require('lf.proc.TableAccessFullStep');
goog.require('lf.service');
goog.require('lf.tree');



/**
 * An optimization pass that detects if there are any indices that can be used
 * in order to avoid full table scan.
 *
 * @constructor
 * @struct
 * @extends {lf.proc.RewritePass.<!lf.proc.PhysicalQueryPlanNode>}
 *
 * @param {!lf.Global} global
 */
lf.proc.IndexRangeScanPass = function(global) {
  lf.proc.IndexRangeScanPass.base(this, 'constructor');

  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = global.getService(lf.service.INDEX_STORE);
};
goog.inherits(lf.proc.IndexRangeScanPass, lf.proc.RewritePass);


/** @override */
lf.proc.IndexRangeScanPass.prototype.rewrite = function(rootNode) {
  this.rootNode = rootNode;

  var tableAccessFullSteps = this.findTableAccessFullSteps_();
  tableAccessFullSteps.forEach(
      function(tableAccessFullStep) {
        var selectStepsCandidates = this.findSelectStepCandidates_(
            tableAccessFullStep);
        if (selectStepsCandidates.length == 0) {
          return;
        }

        var chosenSelectStep = this.chooseSelectStep_(selectStepsCandidates);
        var newSubTreeRoot =
            lf.proc.IndexRangeScanPass.replaceWithIndexRangeScanStep_(
                chosenSelectStep, tableAccessFullStep);
        if (chosenSelectStep == this.rootNode) {
          this.rootNode = newSubTreeRoot.getRoot();
        }
      }, this);

  return this.rootNode;
};


/**
 * Finds all the TableAccessFullSteps in the physical plan.
 * @return {!Array.<!lf.proc.TableAccessFullStep>}
 * @private
 */
lf.proc.IndexRangeScanPass.prototype.findTableAccessFullSteps_ = function() {
  var tableAccessFullSteps = [];
  lf.proc.IndexRangeScanPass.findTableAccessFullStepsRec_(
      this.rootNode, tableAccessFullSteps);
  return tableAccessFullSteps;
};


/**
 * Traverses a tree recursively and finds all full table access steps.
 * @param {!lf.proc.PhysicalQueryPlanNode} rootNode The root node of the
 *     sub-tree to be traversed.
 * @param {!Array.<!lf.proc.TableAccessFullStep>} tableAccessFullSteps An
 *     accumulator containing all the full table access steps that have been
 *     discovered so far.
 * @private
 */
lf.proc.IndexRangeScanPass.findTableAccessFullStepsRec_ = function(
    rootNode, tableAccessFullSteps) {
  if (rootNode instanceof lf.proc.TableAccessFullStep) {
    tableAccessFullSteps.push(rootNode);
  }

  rootNode.getChildren().forEach(
      function(child) {
        lf.proc.IndexRangeScanPass.findTableAccessFullStepsRec_(
            /** @type {!lf.proc.PhysicalQueryPlanNode} */ (child),
            tableAccessFullSteps);
      });
};


/**
 * Finds all the SelectStep instances that are candidates for this optimization
 * pass. See isCandidate_() for a definition of a candidate.
 * @param {!lf.proc.TableAccessFullStep} tableAccessFullStep The table access
 *     step to find candidates for.
 * @return {!Array.<!lf.proc.SelectStep>} The detected candidate steps.
 * @private
 */
lf.proc.IndexRangeScanPass.prototype.findSelectStepCandidates_ = function(
    tableAccessFullStep) {
  var selectSteps = [];
  var node = tableAccessFullStep.getParent();
  while (node) {
    if (lf.proc.IndexRangeScanPass.isCandidate_(
        /** @type {!lf.proc.PhysicalQueryPlanNode} */ (node),
        tableAccessFullStep)) {
      selectSteps.push(node);
    }
    node = node.getParent();
  }

  return selectSteps;
};


/**
 * Finds the select step, that is the most selective among a list of candidate
 * steps.
 * @param {!Array.<!lf.proc.SelectStep>} selectSteps The candidate selection
 *     steps.
 * @return {!lf.proc.SelectStep} The most selective select step.
 * @private
 */
lf.proc.IndexRangeScanPass.prototype.chooseSelectStep_ = function(selectSteps) {
  goog.asserts.assert(selectSteps.length > 0);

  // If there is only one candidate there is no need to evaluate the cost.
  if (selectSteps.length == 1) {
    return selectSteps[0];
  }

  var chosenStep = null;
  var minCost = null;
  selectSteps.forEach(
      function(selectStep, counter) {
        var predicate = /** @type {!lf.pred.ValuePredicate} */ (
            selectStep.predicate);
        var index = lf.proc.IndexRangeScanPass.getIndexForPredicate_(predicate);
        var indexData = this.indexStore_.get(index.getNormalizedName());
        var cost = predicate.toKeyRange().reduce(
            function(soFar, keyRange) {
              return soFar + indexData.cost(keyRange);
            }, 0);

        if (goog.isNull(minCost) || cost < minCost) {
          minCost = cost;
          chosenStep = selectStep;
        }
      }, this);

  return /** @type {!lf.proc.SelectStep} */ (chosenStep);
};


/**
 * @param {!lf.proc.PhysicalQueryPlanNode} node The node to examine.
 * @param {!lf.proc.TableAccessFullStep} tableAccessFullStep
 * @return {boolean} Whether the given node is a candidate for using an
 *     IndexRangeScan.
 * @private
 */
lf.proc.IndexRangeScanPass.isCandidate_ = function(node, tableAccessFullStep) {
  if (!(node instanceof lf.proc.SelectStep)) {
    return false;
  }

  if (!(node.predicate instanceof lf.pred.ValuePredicate) ||
      !node.predicate.isKeyRangeCompatible()) {
    return false;
  }

  if (node.predicate.column.getTable() == tableAccessFullStep.table) {
    return node.predicate.column.getIndices().length > 0;
  }

  return false;
};


/**
 * @param {!lf.pred.ValuePredicate} predicate
 * @return {?lf.schema.Index}
 * @private
 */
lf.proc.IndexRangeScanPass.getIndexForPredicate_ = function(predicate) {
  var indices = predicate.column.getIndices();
  return goog.array.find(
      indices,
      function(index) {
        return index.columnNames.length == 1;
      });
};


/**
 * Replaces the given SelectStep and TableAccessFullStep in the tree with two
 * new steps, IndexRangeScanStep and TableAccessByRowIdStep. It takes care of
 * the case where the SelectStep and TableAccessFullStep are not directly
 * connected in the tree.
 * @param {!lf.proc.SelectStep} selectStep The SelectStep to be replaced.
 * @param {!lf.proc.TableAccessFullStep} tableAccessFullStep The table access
 *     step to be replaced.
 * @return {!lf.proc.PhysicalQueryPlanNode} The new root of the sub-tree that
 *     used to start at the given SelectStep.
 * @private
 */
lf.proc.IndexRangeScanPass.replaceWithIndexRangeScanStep_ = function(
    selectStep, tableAccessFullStep) {
  var predicate = /** @type {!lf.pred.ValuePredicate} */ (
      selectStep.predicate);
  var columnIndex = lf.proc.IndexRangeScanPass.getIndexForPredicate_(predicate);
  if (goog.isNull(columnIndex)) {
    return selectStep;
  }

  var indexRangeScanStep = new lf.proc.IndexRangeScanStep(
      columnIndex, predicate.toKeyRange(), lf.Order.ASC);
  var tableAccessByRowIdStep = new lf.proc.TableAccessByRowIdStep(
      tableAccessFullStep.table);
  tableAccessByRowIdStep.addChild(indexRangeScanStep);

  // If the SelectStep is not the parent of the tableAccessFullStep, move it so
  // that it becomes its parent.
  var tableAccessFullStepParent = tableAccessFullStep.getParent();
  if (tableAccessFullStepParent != selectStep) {
    lf.tree.removeNode(selectStep);
    var index = tableAccessFullStepParent.getChildren().indexOf(
        tableAccessFullStep);
    tableAccessFullStepParent.removeChildAt(index);
    selectStep.addChild(tableAccessFullStep);
    tableAccessFullStepParent.addChildAt(selectStep, index);

    goog.asserts.assert(
        1 == selectStep.getChildCount(),
        'SelectStep should have exactly one child');
  }

  var newRoot = /** @type {!lf.proc.PhysicalQueryPlanNode} */ (
      lf.tree.replaceChainWithChain(
          selectStep, tableAccessFullStep,
          tableAccessByRowIdStep, indexRangeScanStep));
  return newRoot;
};
