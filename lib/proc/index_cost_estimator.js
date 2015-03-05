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
goog.provide('lf.proc.IndexRangeCandidate');

goog.require('goog.array');
goog.require('goog.iter');
goog.require('goog.labs.structs.Multimap');
goog.require('goog.structs.Map');
goog.require('goog.structs.Set');
goog.require('lf.index.SingleKeyRange');
goog.require('lf.index.SingleKeyRangeSet');
goog.require('lf.pred.ValuePredicate');
goog.require('lf.service');


goog.scope(function() {



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
 * @param {!Array<!lf.Predicate>} predicates
 * @return {?lf.proc.IndexRangeCandidate}
 */
lf.proc.IndexCostEstimator.prototype.chooseIndexFor = function(predicates) {
  var candidatePredicates = /** @type {!Array<!lf.pred.ValuePredicate>} */ (
      predicates.filter(this.isCandidate_, this));

  if (candidatePredicates.length == 0) {
    return null;
  }

  var indexRangeCandidates = this.groupPredicatesByIndex_(candidatePredicates);

  if (indexRangeCandidates.length == 0) {
    return null;
  }

  // If there is only one candidate there is no need to evaluate the cost.
  if (indexRangeCandidates.length == 1) {
    return indexRangeCandidates[0];
  }

  var minCost = Number.MAX_VALUE;
  return indexRangeCandidates.reduce(function(prev, curr) {
    var cost = curr.calculateCost();
    if (cost < minCost) {
      minCost = cost;
      return curr;
    }
    return prev;
  }, null);
};


/**
 * @param {!Array<!lf.pred.ValuePredicate>} predicates
 * @return {!Array<lf.proc.IndexRangeCandidate>}
 * @private
 */
lf.proc.IndexCostEstimator.prototype.groupPredicatesByIndex_ =
    function(predicates) {
  var indexSchemas = this.tableSchema_.getIndices();
  return indexSchemas.map(
      function(indexSchema) {
        var indexRangeCandidate = new lf.proc.IndexRangeCandidate(
            this.indexStore_, indexSchema);
        indexRangeCandidate.consumePredicates_(predicates);
        return indexRangeCandidate;
      }, this).filter(
      function(indexRangeCandidate) {
        return !indexRangeCandidate.isEmpty();
      });
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



/**
 * @param {!lf.index.IndexStore} indexStore
 * @param {!lf.schema.Index} indexSchema
 *
 * @constructor
 */
lf.proc.IndexRangeCandidate = function(indexStore, indexSchema) {
  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = indexStore;

  /** @type {!lf.schema.Index} */
  this.indexSchema = indexSchema;

  /**
   * The names of all columns that are indexed by this index schema.
   * @private {!goog.structs.Set<string>}
   */
  this.indexedColumnNames_ = new goog.structs.Set();
  this.indexedColumnNames_.addAll(this.indexSchema.columns.map(
      function(col) {
        return col.name;
      }));

  /**
   * @private {!goog.labs.structs.Multimap<string, !lf.Predicate>}
   */
  this.predicateMap_ = new goog.labs.structs.Multimap();

  /**
   * Caching the keyRange combinations such that they don't need to be
   * calculated twice, in the case where this IndexRangeCandidate ends up
   * getting chosen by the optimizer.
   * @private {?Array<!lf.index.KeyRange|!lf.index.SingleKeyRange>}
   */
  this.combinations_ = null;
};


/**
 * The predicates that were consumed by this candidate.
 * @return {!Array<!lf.pred.PredicateNode>}
 */
lf.proc.IndexRangeCandidate.prototype.getPredicates = function() {
  return this.predicateMap_.getValues();
};


/**
 * Finds which predicates are related to the index schema corresponding to this
 * IndexRangeCandidate.
 * @param {!Array<lf.pred.ValuePredicate>} predicates
 * @private
 */
lf.proc.IndexRangeCandidate.prototype.consumePredicates_ =
    function(predicates) {
  predicates.forEach(function(predicate) {
    var columnName = predicate.getColumns()[0].getName();
    if (this.indexedColumnNames_.contains(columnName)) {
      this.predicateMap_.add(columnName, predicate);
    }
  }, this);
};


/** @return {boolean} */
lf.proc.IndexRangeCandidate.prototype.isEmpty = function() {
  return this.predicateMap_.isEmpty();
};


/**
 * @return {!Array<!lf.index.KeyRange|!lf.index.SingleKeyRange>}
 */
lf.proc.IndexRangeCandidate.prototype.getKeyRangeCombinations =
    function() {
  if (!goog.isNull(this.combinations_)) {
    return this.combinations_;
  }

  /** @type {!goog.structs.Map<string, !lf.index.SingleKeyRangeSet>} */
  var keyRangeMap = new goog.structs.Map();

  this.predicateMap_.getKeys().forEach(function(columnName) {
    var predicates = this.predicateMap_.get(columnName);
    var keyRangeSetSoFar = new lf.index.SingleKeyRangeSet(
        [lf.index.SingleKeyRange.all()]);
    predicates.forEach(function(predicate) {
      var predicateKeyRangeSet = new lf.index.SingleKeyRangeSet(
          predicate.toKeyRange());
      keyRangeSetSoFar = lf.index.SingleKeyRangeSet.intersect(
          keyRangeSetSoFar, predicateKeyRangeSet);
    });
    keyRangeMap.set(columnName, keyRangeSetSoFar);
  }, this);

  // If this IndexRangeCandidate refers to a single column index there is no
  // need to perform cartesian product, since there is only one dimension.
  this.combinations_ = this.indexSchema.columns.length == 1 ?
      keyRangeMap.getValues()[0].getValues() :
      calculateCartesianProduct(keyRangeMap.getValues());

  return this.combinations_;
};


/** @return {number} */
lf.proc.IndexRangeCandidate.prototype.calculateCost = function() {
  this.combinations_ = this.getKeyRangeCombinations();

  var indexData = this.indexStore_.get(this.indexSchema.getNormalizedName());
  return this.combinations_.reduce(
      function(costSoFar, combination) {
        return costSoFar + indexData.cost(combination);
      }, 0);
};


/**
 * Finds the cartesian product of a collection of SingleKeyRangeSets.
 * @param {!Array<!lf.index.SingleKeyRangeSet>} keyRangeSets A SingleKeyRangeSet
 *     at position i in the input array corresponds to all possible values for
 *     the ith dimension in the N-dimensional space (where N is the number of
 *     columns in the cross-column index).
 * @return {!Array<lf.index.KeyRange>} The cross-column key range combinations.
 */
function calculateCartesianProduct(keyRangeSets) {
  goog.asserts.assert(
      keyRangeSets.length > 1,
      'Should only be called for cross-column indices.');

  var keyRangeSetsAsArrays = keyRangeSets.map(
      function(keyRangeSet) {
        return keyRangeSet.getValues();
      });

  var it = goog.iter.product.apply(null, keyRangeSetsAsArrays);
  var combinations = [];
  goog.iter.forEach(it, function(value) {
    combinations.push(value);
  });
  return combinations;
}

});  // goog.scope
