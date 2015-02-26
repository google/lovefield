/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
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
goog.provide('lf.proc.IndexCostEstimator');

goog.require('goog.array');
goog.require('lf.pred.ValuePredicate');
goog.require('lf.service');



/**
 * @constructor
 * @struct
 *
 * @param {!lf.Global} global
 * @param {!lf.schema.Table} tableSchema
 */
lf.proc.IndexCostEstimator = function(global, tableSchema) {
  /** @private {!lf.schema.Table} */
  this.tableSchema_ = tableSchema;

  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = global.getService(lf.service.INDEX_STORE);
};


/**
 * The result of chooseIndexFor() method. index holds the index to be leveraged,
 * predicate holds the predicate to be converted to an IndexRangeScan.
 *
 * TODO(dpapad): Currently candidate predicates are considered individually.
 * In later revisions of this class, they should be grouped in two ways,
 * 1) group predicates that refer to the same column together.
 * 2) group predicate in such a way that cross-column indices are considered.
 *
 * @typedef {{
 *   index: !lf.schema.Index,
 *   predicate: !lf.Predicate
 * }}
 */
lf.proc.IndexCostEstimator.Result;


/**
 * @param {!Array<!lf.Predicate>} predicates
 * @return {?lf.proc.IndexCostEstimator.Result}
 */
lf.proc.IndexCostEstimator.prototype.chooseIndexFor = function(predicates) {
  var candidatePredicates = /** @type {!Array<!lf.pred.ValuePredicate>} */ (
      predicates.filter(this.isCandidate_.bind(this)));

  if (candidatePredicates.length == 0) {
    return null;
  }

  // If there is only one candidate there is no need to evaluate the cost.
  if (candidatePredicates.length == 1) {
    var predicate = candidatePredicates[0];
    var index = /** @type {!lf.schema.Index} */ (
        lf.proc.IndexCostEstimator.getIndexForPredicate_(predicate));
    return {
      index: index,
      predicate: predicate
    };
  }

  var minCost = null;
  var chosenIndex = null;
  var chosenPredicate = null;
  candidatePredicates.forEach(function(predicate) {
    // NOTE: Predicates that are passed in this function are guaranteed to have
    // at least one candidate indexSchema.
    var indexSchema = /** @type {!lf.schema.Index} */ (
        lf.proc.IndexCostEstimator.getIndexForPredicate_(predicate));
    var cost = this.calculateCostFor_(predicate, indexSchema);
    if (goog.isNull(minCost) || cost < minCost) {
      minCost = cost;
      chosenIndex = indexSchema;
      chosenPredicate = predicate;
    }
  }, this);

  return {
    index: /** @type {!lf.schema.Index} */ (chosenIndex),
    predicate: /** @type {!lf.Predicate} */ (chosenPredicate)
  };
};


/**
 * @param {!lf.pred.ValuePredicate} predicate
 * @param {!lf.schema.Index} indexSchema
 * @return {number}
 * @private
 */
lf.proc.IndexCostEstimator.prototype.calculateCostFor_ = function(
    predicate, indexSchema) {
  var indexData = this.indexStore_.get(indexSchema.getNormalizedName());
  return predicate.toKeyRange().reduce(
      function(soFar, keyRange) {
        return soFar + indexData.cost(keyRange);
      }, 0);
};


/**
 * @param {!lf.pred.ValuePredicate} predicate
 * @return {?lf.schema.Index}
 * @private
 */
lf.proc.IndexCostEstimator.getIndexForPredicate_ = function(predicate) {
  var indices = /** @type {!lf.schema.BaseColumn} */ (
      predicate.column).getIndices();
  // TODO(dpapad): Currently only single-column indices are considered. Address
  // this as part of leveraging cross-column indices.
  return goog.array.find(
      indices,
      function(index) {
        return index.columns.length == 1;
      });
};


/**
 * @param {!lf.Predicate} predicate The predicate to examine.
 * @return {boolean} Whether the given predicate is a candidate for being
 *     replaced by using an IndexRangeScan.
 * @private
 */
lf.proc.IndexCostEstimator.prototype.isCandidate_ = function(predicate) {
  if (!(predicate instanceof lf.pred.ValuePredicate) ||
      !predicate.isKeyRangeCompatible()) {
    return false;
  }

  if (predicate.column.getTable() == this.tableSchema_) {
    var index = lf.proc.IndexCostEstimator.getIndexForPredicate_(predicate);
    return !goog.isNull(index);
  }

  return false;
};
