/**
 * @license
 * Copyright 2015 The Lovefield Project Authors. All Rights Reserved.
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
goog.provide('lf.proc.MultiColumnOrPass');

goog.require('lf.pred.CombinedPredicate');
goog.require('lf.pred.Operator');
goog.require('lf.proc.IndexCostEstimator');
goog.require('lf.proc.IndexRangeScanStep');
goog.require('lf.proc.MultiIndexRangeScanStep');
goog.require('lf.proc.RewritePass');
goog.require('lf.proc.SelectStep');
goog.require('lf.proc.TableAccessByRowIdStep');
goog.require('lf.proc.TableAccessFullStep');
goog.require('lf.structs.set');
goog.require('lf.tree');



/**
 * An optimization pass that detects if there are any OR predicates that
 * 1) Refer to a single table.
 * 2) Refer to multiple columns.
 * 3) All referred columns  are indexed.
 *
 * If such predicates are found the tree is transformed to leverage indices.
 * OR predicates that refer to a single column are already optimized by the
 * previous optimization pass IndexRangeScanPass.
 *
 * @constructor
 * @struct
 * @extends {lf.proc.RewritePass<!lf.proc.PhysicalQueryPlanNode>}
 *
 * @param {!lf.Global} global
 */
lf.proc.MultiColumnOrPass = function(global) {
  lf.proc.MultiColumnOrPass.base(this, 'constructor');

  /** @private {!lf.Global} */
  this.global_ = global;
};
goog.inherits(lf.proc.MultiColumnOrPass, lf.proc.RewritePass);


/** @override */
lf.proc.MultiColumnOrPass.prototype.rewrite = function(rootNode, queryContext) {
  this.rootNode = rootNode;
  var orSelectSteps = this.findOrPredicates_(queryContext);
  if (orSelectSteps.length == 0) {
    // No OR predicates exist, this optimization does not apply.
    return this.rootNode;
  }

  // In the presence of multiple candidate OR predicates currently the first one
  // that can leverage indices is chosen.
  // TODO(dpapad): Compare the index range scan cost for each of the predicates
  // and select the fastest one.
  var indexRangeCandidates = null;
  var orSelectStep = null;
  var i = 0;
  do {
    orSelectStep = orSelectSteps[i++];
    indexRangeCandidates = this.findIndexRangeCandidates_(
        orSelectStep, queryContext);
  } while (goog.isNull(indexRangeCandidates) && i < orSelectSteps.length);

  if (goog.isNull(indexRangeCandidates)) {
    return this.rootNode;
  }

  var tableAccessFullStep = this.findTableAccessFullStep_(
      indexRangeCandidates[0].indexSchema.tableName);
  if (goog.isNull(tableAccessFullStep)) {
    // No TableAccessFullStep exists, an index is leveraged already, this
    // optimization does not apply.
    return this.rootNode;
  }

  this.rootNode = this.replaceWithIndexRangeScan_(
      orSelectStep, tableAccessFullStep, indexRangeCandidates);
  return this.rootNode;
};


/**
 * @param {!lf.query.Context} queryContext
 * @return {!Array<!lf.proc.SelectStep>} Finds SelectStep instances in the tree
 *     corresponding to OR predicates.
 * @private
 */
lf.proc.MultiColumnOrPass.prototype.findOrPredicates_ = function(queryContext) {
  var filterFn = function(node) {
    if (!(node instanceof lf.proc.SelectStep)) {
      return false;
    }

    var predicate = queryContext.getPredicate(node.predicateId);
    return predicate instanceof lf.pred.CombinedPredicate &&
        predicate.operator == lf.pred.Operator.OR;
  };

  return lf.tree.find(this.rootNode, filterFn);
};


/**
 * @param {string} tableName
 * @return {?lf.proc.TableAccessFullStep} The table access step corresponding to
 *     the given table, or null if such a step does not exist.
 * @private
 */
lf.proc.MultiColumnOrPass.prototype.findTableAccessFullStep_ = function(
    tableName) {
  return /** @type {?lf.proc.TableAccessFullStep} */ (lf.tree.find(
      this.rootNode,
      function(node) {
        return node instanceof lf.proc.TableAccessFullStep &&
            node.table.getName() == tableName;
      })[0] || null);
};


/**
 * @param {!lf.proc.SelectStep} selectStep
 * @param {!lf.query.Context} queryContext
 * @return {?Array<!lf.proc.IndexRangeCandidate>} The IndexRangeCandidates
 *     corresponding to the given multi-column OR predicate. Null is returned if
 *     no indices can be leveraged for the given predicate.
 * @private
 */
lf.proc.MultiColumnOrPass.prototype.findIndexRangeCandidates_ = function(
    selectStep, queryContext) {
  var predicate = /** @type {!lf.pred.PredicateNode} */ (
      queryContext.getPredicate(selectStep.predicateId));

  var tables = predicate.getTables();
  if (tables.size != 1) {
    // Predicates which refer to more than one table are not eligible for this
    // optimization.
    return null;
  }

  var tableSchema = lf.structs.set.values(tables)[0];
  var indexCostEstimator = new lf.proc.IndexCostEstimator(
      this.global_, tableSchema);

  var indexRangeCandidates = null;
  var allIndexed = predicate.getChildren().every(
      function(childPredicate) {
        var indexRangeCandidate = indexCostEstimator.chooseIndexFor(
            queryContext, [childPredicate]);
        if (!goog.isNull(indexRangeCandidate)) {
          goog.isNull(indexRangeCandidates) ?
              indexRangeCandidates = [indexRangeCandidate] :
              indexRangeCandidates.push(indexRangeCandidate);
        }

        return !goog.isNull(indexRangeCandidate);
      });

  return allIndexed ? indexRangeCandidates : null;
};


/**
 * Replaces the given SelectStep with a MultiIndexRangeScanStep (and children).
 * @param {!lf.proc.SelectStep} selectStep
 * @param {!lf.proc.TableAccessFullStep} tableAccessFullStep
 * @param {!Array<!lf.proc.IndexRangeCandidate>} indexRangeCandidates
 * @return {!lf.proc.PhysicalQueryPlanNode} The new root of the entire tree.
 * @private
 */
lf.proc.MultiColumnOrPass.prototype.replaceWithIndexRangeScan_ = function(
    selectStep, tableAccessFullStep, indexRangeCandidates) {
  var tableAccessByRowIdStep = new lf.proc.TableAccessByRowIdStep(
      this.global_, tableAccessFullStep.table);
  var multiIndexRangeScanStep = new lf.proc.MultiIndexRangeScanStep();
  tableAccessByRowIdStep.addChild(multiIndexRangeScanStep);

  indexRangeCandidates.forEach(function(candidate) {
    var indexRangeScanStep = new lf.proc.IndexRangeScanStep(
        this.global_,
        candidate.indexSchema,
        candidate.getKeyRangeCalculator(),
        false /* reverseOrder */);
    multiIndexRangeScanStep.addChild(indexRangeScanStep);
  }, this);

  lf.tree.removeNode(selectStep);
  lf.tree.replaceNodeWithChain(
      tableAccessFullStep, tableAccessByRowIdStep, multiIndexRangeScanStep);

  return /** @type {!lf.proc.PhysicalQueryPlanNode} */ (
      multiIndexRangeScanStep.getRoot());
};
