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
goog.provide('lf.proc.BoundKeyRangeCalculator');
goog.provide('lf.proc.IndexKeyRangeCalculator');
goog.provide('lf.proc.NotBoundKeyRangeCalculator');

goog.require('goog.asserts');
goog.require('goog.iter');
goog.require('lf.index.SingleKeyRange');
goog.require('lf.index.SingleKeyRangeSet');
goog.require('lf.structs.map');


goog.scope(function() {



/** @interface */
lf.proc.IndexKeyRangeCalculator = function() {};


/**
 * @param {!lf.query.Context} queryContext
 * @return {!Array<!lf.index.KeyRange|!lf.index.SingleKeyRange>}
 */
lf.proc.IndexKeyRangeCalculator.prototype.getKeyRangeCombinations;



/**
 * A KeyRangeCalculator for the case where no predicates exist. Such a
 * calculator is used when an IndexRangeScanStep is introduced to the execution
 * plan simply for leveraging the index's order, even though there is no
 * predicate binding the colums that are involved in this index.
 *
 * @constructor @struct
 * @implements {lf.proc.IndexKeyRangeCalculator}
 *
 * @param {!lf.schema.Index} indexSchema
 */
lf.proc.NotBoundKeyRangeCalculator = function(indexSchema) {
  /** @private {!lf.schema.Index} */
  this.indexSchema_ = indexSchema;
};


/** @override */
lf.proc.NotBoundKeyRangeCalculator.prototype.getKeyRangeCombinations = function(
    queryContext) {
  return this.indexSchema_.columns.length == 1 ?
      [lf.index.SingleKeyRange.all()] :
      [this.indexSchema_.columns.map(function(column) {
        return lf.index.SingleKeyRange.all();
      })];
};



/**
 * @constructor @struct
 * @implements {lf.proc.IndexKeyRangeCalculator}
 *
 * @param {!lf.schema.Index} indexSchema
 * @param {!lf.structs.MapSet<string, number>} predicateMap
 *
 */
lf.proc.BoundKeyRangeCalculator = function(indexSchema, predicateMap) {
  /** @private {!lf.schema.Index} */
  this.indexSchema_ = indexSchema;

  /**
   * A map where a key is the name of an indexed column and the values are
   * predicates IDs that correspond to that column. The IDs are used to grab the
   * actual predicates from the given query context, such that this calculator
   * can be re-used with different query contexts.
   * @private {!lf.structs.MapSet<string, number>}
   */
  this.predicateMap_ = predicateMap;

  /**
   * The query context that was used for calculating the cached key range
   * combinations.
   * @private {?lf.query.Context}
   */
  this.lastQueryContext_ = null;

  /**
   * Caching the keyRange combinations such that they don't need to be
   * calculated twice, in the case where the same query context is used.
   * @private {?Array<!lf.index.KeyRange|!lf.index.SingleKeyRange>}
   */
  this.combinations_ = null;
};


/**
 * Builds a map where a key is an indexed column name and the value is
 * the SingleKeyRangeSet, created by considering all provided predicates.
 * @param {!lf.query.Context} queryContext
 * @return {!lf.structs.Map<string, !lf.index.SingleKeyRangeSet>}
 * @private
 */
lf.proc.BoundKeyRangeCalculator.prototype.calculateKeyRangeMap_ = function(
    queryContext) {
  var keyRangeMap = lf.structs.map.create();

  this.predicateMap_.keys().forEach(function(columnName) {
    var predicateIds = this.predicateMap_.get(columnName);
    var predicates = predicateIds.map(function(predicateId) {
      return queryContext.getPredicate(predicateId);
    }, this);
    var keyRangeSetSoFar = new lf.index.SingleKeyRangeSet(
        [lf.index.SingleKeyRange.all()]);
    predicates.forEach(function(predicate) {
      keyRangeSetSoFar = lf.index.SingleKeyRangeSet.intersect(
          keyRangeSetSoFar, predicate.toKeyRange());
    });
    keyRangeMap.set(columnName, keyRangeSetSoFar);
  }, this);

  return keyRangeMap;
};


/**
 * Traverses the indexed columns in reverse order and fills in an "all"
 * SingleKeyRangeSet where possible in the provided map.
 * Example1: Assume that the indexed columns are ['A', 'B', 'C'] and A is
 * already bound, but B and C are unbound. Key ranges for B and C will be filled
 * in with an "all" key range.
 * Example2: Assume that the indexed columns are ['A', 'B', 'C', 'D'] and A, C
 * are already bound, but B and D are unbound. Key ranges only for D will be
 * filled in. In practice such a case will have already been rejected by
 * IndexRangeCandidate#isUsable and should never occur here.
 * @param {!lf.structs.Map<string, !lf.index.SingleKeyRangeSet>} keyRangeMap
 * @private
 */
lf.proc.BoundKeyRangeCalculator.prototype.fillMissingKeyRanges_ =
    function(keyRangeMap) {
  var getAllKeyRange = function() {
    return new lf.index.SingleKeyRangeSet([lf.index.SingleKeyRange.all()]);
  };

  for (var i = this.indexSchema_.columns.length - 1; i >= 0; i--) {
    var column = this.indexSchema_.columns[i];
    var keyRangeSet = keyRangeMap.get(column.schema.getName()) || null;
    if (!goog.isNull(keyRangeSet)) {
      break;
    }
    keyRangeMap.set(column.schema.getName(), getAllKeyRange());
  }
};


/** @override */
lf.proc.BoundKeyRangeCalculator.prototype.getKeyRangeCombinations =
    function(queryContext) {
  if (this.lastQueryContext_ == queryContext) {
    return /** @type {!Array<!lf.index.KeyRange|!lf.index.SingleKeyRange>} */ (
        this.combinations_);
  }

  var keyRangeMap = this.calculateKeyRangeMap_(queryContext);
  this.fillMissingKeyRanges_(keyRangeMap);

  // If this IndexRangeCandidate refers to a single column index there is no
  // need to perform cartesian product, since there is only one dimension.
  this.combinations_ = this.indexSchema_.columns.length == 1 ?
      lf.structs.map.values(keyRangeMap)[0].getValues() :
      calculateCartesianProduct(this.getSortedKeyRangeSets_(keyRangeMap));
  this.lastQueryContext_ = queryContext;

  return /** @type {!Array<!lf.index.KeyRange|!lf.index.SingleKeyRange>} */ (
      this.combinations_);
};


/**
 * Sorts the key range sets corresponding to this index's columns according to
 * the column order of the index schema.
 * @param {!lf.structs.Map<string, !lf.index.SingleKeyRangeSet>} keyRangeMap
 * @return {!Array<!lf.index.SingleKeyRangeSet>}
 * @private
 */
lf.proc.BoundKeyRangeCalculator.prototype.getSortedKeyRangeSets_ = function(
    keyRangeMap) {
  var sortHelper = lf.structs.map.create();
  var priority = 0;
  this.indexSchema_.columns.forEach(function(column) {
    sortHelper.set(column.schema.getName(), priority);
    priority++;
  });

  var sortedColumnNames = lf.structs.map.keys(keyRangeMap).sort(
      function(a, b) {
        return sortHelper.get(a) - sortHelper.get(b);
      });

  return sortedColumnNames.map(function(columnName) {
    return keyRangeMap.get(columnName);
  });
};


/**
 * Finds the cartesian product of a collection of SingleKeyRangeSets.
 * @param {!Array<!lf.index.SingleKeyRangeSet>} keyRangeSets A SingleKeyRangeSet
 *     at position i in the input array corresponds to all possible values for
 *     the ith dimension in the N-dimensional space (where N is the number of
 *     columns in the cross-column index).
 * @return {!Array<!lf.index.KeyRange>} The cross-column key range combinations.
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
