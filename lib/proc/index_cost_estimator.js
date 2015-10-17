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
goog.provide('lf.proc.IndexCostEstimator');
goog.provide('lf.proc.IndexRangeCandidate');

goog.require('goog.asserts');
goog.require('lf.eval.Type');
goog.require('lf.pred.CombinedPredicate');
goog.require('lf.pred.ValuePredicate');
goog.require('lf.proc.BoundKeyRangeCalculator');
goog.require('lf.service');
goog.require('lf.structs.MapSet');
goog.require('lf.structs.set');


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
 * The maximum percent of
 * 1) values an lf.eval.Type.IN predicate can have or
 * 2) children an OR CombinedPredicate can have
 * to still be considered for leveraging an index, with respect to the total
 * number of rows in the table.
 * For each one of the values/children an index query will be performed, so the
 * trade-off here is that too many index queries can be slower than simply doing
 * a full table scan. This constant has been determined by trial and error.
 * @const {number}
 */
var INDEX_QUERY_THRESHOLD_PERCENT = 0.02;


/**
 * @return {number} The number of lf.index.Index#getRange queries that can be
 *     performed faster than scanning the entire table instead.
 * @private
 */
lf.proc.IndexCostEstimator.prototype.getIndexQueryThreshold_ = function() {
  var rowIdIndex = this.indexStore_.get(this.tableSchema_.getRowIdIndexName());
  return Math.floor(
      rowIdIndex.stats().totalRows * INDEX_QUERY_THRESHOLD_PERCENT);
};


/**
 * @param {!lf.query.Context} queryContext
 * @param {!Array<!lf.Predicate>} predicates
 * @return {?lf.proc.IndexRangeCandidate}
 */
lf.proc.IndexCostEstimator.prototype.chooseIndexFor = function(
    queryContext, predicates) {
  var candidatePredicates = /** @type {!Array<!lf.pred.ValuePredicate>} */ (
      predicates.filter(this.isCandidate_, this));

  if (candidatePredicates.length == 0) {
    return null;
  }

  var indexRangeCandidates =
      this.generateIndexRangeCandidates_(candidatePredicates);

  if (indexRangeCandidates.length == 0) {
    return null;
  }

  // If there is only one candidate there is no need to evaluate the cost.
  if (indexRangeCandidates.length == 1) {
    return indexRangeCandidates[0];
  }

  var minCost = Number.MAX_VALUE;
  return indexRangeCandidates.reduce(function(prev, curr) {
    var cost = curr.calculateCost(queryContext);
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
lf.proc.IndexCostEstimator.prototype.generateIndexRangeCandidates_ =
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
        return indexRangeCandidate.isUsable();
      });
};


/**
 * @param {!lf.Predicate} predicate The predicate to examine.
 * @return {boolean} Whether the given predicate is a candidate for being
 *     replaced by using an IndexRangeScan.
 * @private
 */
lf.proc.IndexCostEstimator.prototype.isCandidate_ = function(predicate) {
  if (predicate instanceof lf.pred.ValuePredicate) {
    return this.isCandidateValuePredicate_(predicate);
  } else if (predicate instanceof lf.pred.CombinedPredicate) {
    return this.isCandidateCombinedPredicate_(predicate);
  } else {
    return false;
  }
};


/**
 * @param {!lf.pred.CombinedPredicate} predicate
 * @return {boolean}
 * @private
 */
lf.proc.IndexCostEstimator.prototype.isCandidateCombinedPredicate_ = function(
    predicate) {
  if (!predicate.isKeyRangeCompatible()) {
    return false;
  }

  var predicateColumn = /** @type {!lf.pred.ValuePredicate} */ (
      predicate.getChildAt(0)).column;
  if (predicateColumn.getTable() != this.tableSchema_) {
    return false;
  }

  return predicate.getChildCount() <= this.getIndexQueryThreshold_();
};


/**
 * @param {!lf.pred.ValuePredicate} predicate
 * @return {boolean}
 * @private
 */
lf.proc.IndexCostEstimator.prototype.isCandidateValuePredicate_ = function(
    predicate) {
  if (!predicate.isKeyRangeCompatible() ||
      predicate.column.getTable() != this.tableSchema_) {
    return false;
  }

  if (predicate.evaluatorType == lf.eval.Type.IN &&
      predicate.value.length > this.getIndexQueryThreshold_()) {
    return false;
  }

  return true;
};



/**
 * @param {!lf.index.IndexStore} indexStore
 * @param {!lf.schema.Index} indexSchema
 *
 * @constructor @struct
 */
lf.proc.IndexRangeCandidate = function(indexStore, indexSchema) {
  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = indexStore;

  /** @type {!lf.schema.Index} */
  this.indexSchema = indexSchema;

  /**
   * The names of all columns that are indexed by this index schema.
   * @private {!lf.structs.Set<string>}
   */
  this.indexedColumnNames_ = lf.structs.set.create(
      this.indexSchema.columns.map(function(col) {
        return col.schema.getName();
      }));

  /**
   * A map where a key is the name of an indexed column and the values are
   * predicates IDs that correspond to that column. It is initialized lazily,
   * only if a predicate that matches a column of this index schema is found.
   * @private {?lf.structs.MapSet<string, number>}
   */
  this.predicateMap_ = null;


  /**
   * The calculator object to be used for generating key ranges based on a given
   * query context. This object will be used by the IndexRangeScanStep during
   * query execution. Initialized lazily.
   * @private {?lf.proc.IndexKeyRangeCalculator}
   */
  this.keyRangeCalculator_ = null;
};


/**
 * The predicates that were consumed by this candidate.
 * @return {!Array<!number>}
 */
lf.proc.IndexRangeCandidate.prototype.getPredicateIds = function() {
  return !goog.isNull(this.predicateMap_) ? this.predicateMap_.values() : [];
};


/** @return {!lf.proc.IndexKeyRangeCalculator} */
lf.proc.IndexRangeCandidate.prototype.getKeyRangeCalculator = function() {
  goog.asserts.assert(this.predicateMap_);

  if (goog.isNull(this.keyRangeCalculator_)) {
    this.keyRangeCalculator_ = new lf.proc.BoundKeyRangeCalculator(
        this.indexSchema, this.predicateMap_);
  }

  return this.keyRangeCalculator_;
};


/**
 * Finds which predicates are related to the index schema corresponding to this
 * IndexRangeCandidate.
 * @param {!Array<!lf.pred.ValuePredicate>} predicates
 * @private
 */
lf.proc.IndexRangeCandidate.prototype.consumePredicates_ = function(
    predicates) {
  predicates.forEach(function(predicate) {
    // If predicate is a ValuePredicate there in only one referred column. If
    // predicate is an OR CombinedPredicate, then it must be referring to a
    // single column (enforced by isKeyRangeCompatible()).
    var columnName = predicate.getColumns()[0].getName();
    if (this.indexedColumnNames_.has(columnName)) {
      if (goog.isNull(this.predicateMap_)) {
        this.predicateMap_ = new lf.structs.MapSet();
      }
      this.predicateMap_.set(columnName, predicate.getId());
    }
  }, this);
};


/**
 * Whether this candidate can actually be used for an IndexRangeScanStep
 * optimization. Sometimes after building the candidate it turns out that it
 * can't be used. For example consider a cross column index on columns
 * ['A', 'B'] and a query that only binds the key range of the 2nd dimension B.
 * @return {boolean}
 */
lf.proc.IndexRangeCandidate.prototype.isUsable = function() {
  if (goog.isNull(this.predicateMap_)) {
    // If the map was never initialized, it means that no predicate matched this
    // index schema columns.
    return false;
  }

  var unboundColumnFound = false;
  var isUsable = true;
  for (var i = 0; i < this.indexSchema.columns.length; i++) {
    var column = this.indexSchema.columns[i];
    var isBound = this.predicateMap_.has(column.schema.getName());

    if (unboundColumnFound && isBound) {
      isUsable = false;
      break;
    }

    if (!isBound) {
      unboundColumnFound = true;
    }
  }

  return isUsable;
};


/**
 * @param {!lf.query.Context} queryContext
 * @return {number}
 */
lf.proc.IndexRangeCandidate.prototype.calculateCost = function(queryContext) {
  var combinations = this.getKeyRangeCalculator().getKeyRangeCombinations(
      queryContext);
  var indexData = this.indexStore_.get(this.indexSchema.getNormalizedName());

  return combinations.reduce(
      function(costSoFar, combination) {
        return costSoFar + indexData.cost(combination);
      }, 0);
};


});  // goog.scope
