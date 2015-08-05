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
goog.provide('lf.proc.IndexJoinPass');

goog.require('lf.eval.Type');
goog.require('lf.proc.JoinStep');
goog.require('lf.proc.NoOpStep');
goog.require('lf.proc.Relation');
goog.require('lf.proc.RewritePass');
goog.require('lf.proc.TableAccessFullStep');
goog.require('lf.tree');



/**
 * An optimization pass responsible for identifying JoinSteps that can be
 * calculated as index nested loop joins. It transforms the tree by specifying
 * the algorithm to use in such JoinSteps and also by eliminating
 * TableAccessFullStep corresponding to the side of the join where the index
 * will be used.
 *
 * @constructor
 * @struct
 * @extends {lf.proc.RewritePass<!lf.proc.PhysicalQueryPlanNode>}
 */
lf.proc.IndexJoinPass = function() {
  lf.proc.IndexJoinPass.base(this, 'constructor');
};
goog.inherits(lf.proc.IndexJoinPass, lf.proc.RewritePass);


/** @override */
lf.proc.IndexJoinPass.prototype.rewrite = function(rootNode, queryContext) {
  this.rootNode = rootNode;

  if (!this.canOptimize_(/** @type {!lf.query.SelectContext} */ (
      queryContext))) {
    return rootNode;
  }

  var joinSteps =
      /** @type {!Array<!lf.proc.JoinStep>} */ (lf.tree.find(
          rootNode,
          function(node) {
            return node instanceof lf.proc.JoinStep;
          }));
  joinSteps.forEach(this.processJoinStep_, this);

  return this.rootNode;
};


/**
 * @param {!lf.query.SelectContext} queryContext
 * @return {boolean} Whether this optimization can be applied to the given
 *     query.
 * @private
 */
lf.proc.IndexJoinPass.prototype.canOptimize_ = function(queryContext) {
  return queryContext.from.length > 1;
};


/**
 * Examines the given join step and decides whether it should be executed as an
 * index-join.
 * @param {!lf.proc.JoinStep} joinStep
 * @private
 */
lf.proc.IndexJoinPass.prototype.processJoinStep_ = function(joinStep) {
  // Currently ONLY inner EQ join can be calculated using index join.
  if (joinStep.predicate.evaluatorType != lf.eval.Type.EQ ||
      joinStep.isOuterJoin) {
    return;
  }

  /**
   * Finds which of the two joined columns corresponds to the given table.
   * @param {!lf.schema.Table} table
   * @return {!lf.schema.Column}
   */
  var getColumnForTable = function(table) {
    return table.getEffectiveName() ==
        joinStep.predicate.rightColumn.getTable().getEffectiveName() ?
            joinStep.predicate.rightColumn : joinStep.predicate.leftColumn;
  };

  /**
   * Extracts the candidate indexed column for the given execution step node.
   * @param {!lf.proc.PhysicalQueryPlanNode} executionStep
   * @return {?lf.schema.Column} The candidate column or null if no such column
   *     exists.
   */
  var getCandidate = function(executionStep) {
    // In order to use and index for implementing a join, the entire relation
    // must be fed to the JoinStep, otherwise the index can't be used.
    if (!(executionStep instanceof lf.proc.TableAccessFullStep)) {
      return null;
    }
    var candidateColumn = getColumnForTable(executionStep.table);
    return goog.isNull(candidateColumn.getIndex()) ? null : candidateColumn;
  };

  var leftCandidate = getCandidate(
      /** @type {!lf.proc.PhysicalQueryPlanNode} */ (joinStep.getChildAt(0)));
  var rightCandidate = getCandidate(
      /** @type {!lf.proc.PhysicalQueryPlanNode} */ (joinStep.getChildAt(1)));

  if (goog.isNull(leftCandidate) && goog.isNull(rightCandidate)) {
    // None of the two involved columns can be used for an index join.
    return;
  }

  // TODO(dpapad): If both columns can be used, currently the right column is
  // preferred. A smarter decision is to use the column corresponding to the
  // bigger incoming relation, such that index accesses are minimized. Use index
  // stats to figure out the size of each relation.
  var chosenColumn = !goog.isNull(rightCandidate) ?
      rightCandidate : leftCandidate;

  joinStep.markAsIndexJoin(/** @type {!lf.schema.Column} */ (chosenColumn));
  var dummyRelation = new lf.proc.Relation(
      [], [chosenColumn.getTable().getEffectiveName()]);
  joinStep.replaceChildAt(
      new lf.proc.NoOpStep([dummyRelation]),
      chosenColumn == leftCandidate ? 0 : 1);
};
