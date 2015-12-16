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
goog.provide('lf.proc.IndexRangeScanPass');

goog.require('lf.proc.IndexCostEstimator');
goog.require('lf.proc.IndexRangeScanStep');
goog.require('lf.proc.RewritePass');
goog.require('lf.proc.SelectStep');
goog.require('lf.proc.TableAccessByRowIdStep');
goog.require('lf.proc.TableAccessFullStep');
goog.require('lf.structs.map');
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
lf.proc.IndexRangeScanPass.prototype.rewrite = function(
    rootNode, queryContext) {
  this.rootNode = rootNode;

  var tableAccessFullSteps =
      /** @type {!Array<!lf.proc.TableAccessFullStep>} */ (lf.tree.find(
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
        var indexRangeCandidate = costEstimator.chooseIndexFor(
            /** @type {!lf.query.Context} */ (queryContext),
            selectStepsCandidates.map(function(c) {
              return queryContext.getPredicate(c.predicateId);
            }));
        if (goog.isNull(indexRangeCandidate)) {
          // No SelectStep could be optimized for this table.
          return;
        }

        // Creating a temporary mapping from Predicate to SelectStep, such that
        // the predicates that can be replaced by an index-range scan can be
        // mapped back to SelectStep nodes.
        var predicateToSelectStepMap = lf.structs.map.create();
        selectStepsCandidates.forEach(function(selectStep) {
          predicateToSelectStepMap.set(selectStep.predicateId, selectStep);
        }, this);

        this.rootNode = this.replaceWithIndexRangeScanStep_(
            indexRangeCandidate, predicateToSelectStepMap, tableAccessFullStep,
            /** @type {!lf.query.Context} */ (queryContext));
      }, this);

  return this.rootNode;
};


/**
 * Finds all the SelectStep instances that exist in the tree above the given
 * node and are eligible for optimization.
 * @param {!lf.proc.PhysicalQueryPlanNode} startNode The node to start searching
 *     from.
 * @return {!Array<!lf.proc.SelectStep>} The SelectSteps that were found.
 * @private
 */
lf.proc.IndexRangeScanPass.prototype.findSelectSteps_ = function(startNode) {
  var selectSteps = [];
  var node = startNode.getParent();
  while (node) {
    if (node instanceof lf.proc.SelectStep) {
      selectSteps.push(node);
    } else if (node instanceof lf.proc.JoinStep) {
      // Stop searching if a join node is traversed.
      break;
    }
    node = node.getParent();
  }

  return selectSteps;
};


/**
 * Replaces all the SelectSteps that can be calculated by using the chosen index
 * with two new steps an IndexRangeScanStep and  a TableAccessByRowIdStep.
 * @param {!lf.proc.IndexRangeCandidate} indexRangeCandidate
 * @param {!lf.structs.Map} predicateToSelectStepMap
 * @param {!lf.proc.TableAccessFullStep} tableAccessFullStep The table access
 *     step to be replaced.
 * @param {!lf.query.Context} queryContext
 * @return {!lf.proc.PhysicalQueryPlanNode} The new root of the entire tree.
 * @private
 */
lf.proc.IndexRangeScanPass.prototype.replaceWithIndexRangeScanStep_ = function(
    indexRangeCandidate, predicateToSelectStepMap, tableAccessFullStep,
    queryContext) {
  var predicateIds = indexRangeCandidate.getPredicateIds();
  var selectSteps = predicateIds.map(function(predicateId) {
    return predicateToSelectStepMap.get(predicateId);
  });
  selectSteps.forEach(lf.tree.removeNode);

  var indexRangeScanStep = new lf.proc.IndexRangeScanStep(
      this.global_, indexRangeCandidate.indexSchema,
      indexRangeCandidate.getKeyRangeCalculator(),
      false /* reverseOrder */);
  var tableAccessByRowIdStep = new lf.proc.TableAccessByRowIdStep(
      this.global_, tableAccessFullStep.table);
  tableAccessByRowIdStep.addChild(indexRangeScanStep);
  lf.tree.replaceNodeWithChain(
      tableAccessFullStep, tableAccessByRowIdStep, indexRangeScanStep);

  return /** @type {!lf.proc.PhysicalQueryPlanNode} */ (
      indexRangeScanStep.getRoot());
};
