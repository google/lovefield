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

goog.require('goog.asserts');
goog.require('goog.structs.Map');
goog.require('lf.proc.IndexCostEstimator');
goog.require('lf.proc.IndexRangeScanStep');
goog.require('lf.proc.RewritePass');
goog.require('lf.proc.SelectStep');
goog.require('lf.proc.TableAccessByRowIdStep');
goog.require('lf.proc.TableAccessFullStep');
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

  /** @private {!lf.Global} */
  this.global_ = global;
};
goog.inherits(lf.proc.IndexRangeScanPass, lf.proc.RewritePass);


/** @override */
lf.proc.IndexRangeScanPass.prototype.rewrite = function(rootNode) {
  this.rootNode = rootNode;

  var tableAccessFullSteps =
      /** @type {!Array.<!lf.proc.TableAccessFullStep>} */ (lf.tree.find(
          rootNode,
          function(node) {
            return node instanceof lf.proc.TableAccessFullStep;
          }));
  tableAccessFullSteps.forEach(
      function(tableAccessFullStep) {
        var selectStepsCandidates = this.findSelectSteps_(tableAccessFullStep);
        if (selectStepsCandidates.length == 0) {
          return;
        }

        var costEstimator = new lf.proc.IndexCostEstimator(
            this.global_, tableAccessFullStep.table);

        var predicateMap = new goog.structs.Map();
        selectStepsCandidates.forEach(function(selectStep) {
          predicateMap.set(
              goog.getUid(selectStep.predicate),
              selectStep);
        }, this);
        var result = costEstimator.chooseIndexFor(
            selectStepsCandidates.map(function(c) {
              return c.predicate;
            }));
        if (goog.isNull(result)) {
          // No SelectStep could be optimized for this table.
          return;
        }

        var chosenSelectStep = predicateMap.get(goog.getUid(result.predicate));
        var newSubTreeRoot = this.replaceWithIndexRangeScanStep_(
            chosenSelectStep, tableAccessFullStep, result.index);
        if (chosenSelectStep == this.rootNode) {
          this.rootNode = newSubTreeRoot.getRoot();
        }
      }, this);

  return this.rootNode;
};


/**
 * Finds all the SelectStep instances that exist in the tree above the given
 * node.
 * @param {!lf.proc.PhysicalQueryPlanNode} startNode The node to start searching
 *     from.
 * @return {!Array.<!lf.proc.SelectStep>} The SelectSteps that were found.
 * @private
 */
lf.proc.IndexRangeScanPass.prototype.findSelectSteps_ = function(startNode) {
  var selectSteps = [];
  var node = startNode.getParent();
  while (node) {
    if (node instanceof lf.proc.SelectStep) {
      selectSteps.push(node);
    }
    node = node.getParent();
  }

  return selectSteps;
};


/**
 * Replaces the given SelectStep and TableAccessFullStep in the tree with two
 * new steps, IndexRangeScanStep and TableAccessByRowIdStep. It takes care of
 * the case where the SelectStep and TableAccessFullStep are not directly
 * connected in the tree.
 * @param {!lf.proc.SelectStep} selectStep The SelectStep to be replaced.
 * @param {!lf.proc.TableAccessFullStep} tableAccessFullStep The table access
 *     step to be replaced.
 * @param {!lf.schema.Index} indexSchema The schema of the index to be used.
 * @return {!lf.proc.PhysicalQueryPlanNode} The new root of the sub-tree that
 *     used to start at the given SelectStep.
 * @private
 */
lf.proc.IndexRangeScanPass.prototype.replaceWithIndexRangeScanStep_ = function(
    selectStep, tableAccessFullStep, indexSchema) {
  var predicate = /** @type {!lf.pred.ValuePredicate} */ (
      selectStep.predicate);

  var indexRangeScanStep = new lf.proc.IndexRangeScanStep(
      this.global_, indexSchema, predicate.toKeyRange(),
      indexSchema.columns[0].order);
  var tableAccessByRowIdStep = new lf.proc.TableAccessByRowIdStep(
      this.global_, tableAccessFullStep.table);
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
