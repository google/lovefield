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
goog.provide('lf.proc.RelationTransformer');

goog.require('goog.math');
goog.require('goog.structs.Map');
goog.require('lf.Row');
goog.require('lf.fn.AggregatedColumn');
goog.require('lf.fn.Type');
goog.require('lf.proc.Relation');
goog.require('lf.proc.RelationEntry');



/**
 * @constructor
 * @struct
 *
 * @param {!lf.proc.Relation} relation The relation to be transformed.
 * @param {!Array.<!lf.schema.Column>} columns The columns of interest.
 */
lf.proc.RelationTransformer = function(relation, columns) {
  /**
   * The relation on which this transformer will operate.
   * @private {!lf.proc.Relation}
   */
  this.relation_ = relation;

  /**
   * The columns that should be included in the transformed relation.
   * @private {!Array.<!lf.schema.Column>}
   */
  this.columns_ = columns;
};


/**
 * Calculates a transformed Relation based on the columns that are requested.
 * The type of the requested columns affect the output (non-aggregate only VS
 * aggregate and non-aggregate mixed up).
 * @return {!lf.proc.Relation} The transformed relation.
 */
lf.proc.RelationTransformer.prototype.getTransformed = function() {
  this.calculateAggregators_();

  // Determine whether any aggregated columns have been requested.
  var aggregatedColumnsExist = this.columns_.some(
      function(column) {
        return (column instanceof lf.fn.AggregatedColumn);
      }, this);

  return aggregatedColumnsExist ?
      this.handleAggregatedColumns_() :
      this.handleNonAggregatedColumns_();
};


/**
 * Generates the transformed relation for the case where the requested columns
 * include any aggregated columns.
 * @return {!lf.proc.Relation} The transformed relation.
 * @private
 */
lf.proc.RelationTransformer.prototype.handleAggregatedColumns_ = function() {
  // If the only aggregator that was used was DISTINCT, return the relation
  // corresponding to it.
  if (this.columns_.length == 1 &&
      this.columns_[0].aggregatorType == lf.fn.Type.DISTINCT) {
    var distinctRelation = /** @type {!lf.proc.Relation} */ (
        this.relation_.getAggregationResult(this.columns_[0]));
    var newEntries = distinctRelation.entries.map(function(entry) {
      var newEntry = new lf.proc.RelationEntry(
          new lf.Row(lf.Row.DUMMY_ID, {}), this.relation_.isPrefixApplied());
      newEntry.setField(
          this.columns_[0], entry.getField(this.columns_[0].child));
      return newEntry;
    }, this);

    return new lf.proc.Relation(newEntries, []);
  }

  // Generate a new relation where there is only one entry, and within that
  // entry there is exactly one field per column.
  var entry = new lf.proc.RelationEntry(
      new lf.Row(lf.Row.DUMMY_ID, {}), this.relation_.isPrefixApplied());
  this.columns_.forEach(function(column) {
    var value = column instanceof lf.fn.AggregatedColumn ?
        this.relation_.getAggregationResult(column) :
        this.relation_.entries[0].getField(column);
    entry.setField(column, value);
  }, this);

  return new lf.proc.Relation([entry], this.relation_.getTables());
};


/**
 * Generates the transformed relation for the case where the requested columns
 * include only non-aggregated columns.
 * @return {!lf.proc.Relation} The transformed relation.
 * @private
 */
lf.proc.RelationTransformer.prototype.handleNonAggregatedColumns_ = function() {
  // Generate a new relation where each entry includes only the specified
  // columns.
  var transformedEntries = new Array(this.relation_.entries.length);
  var isPrefixApplied = this.relation_.isPrefixApplied();

  this.relation_.entries.forEach(function(entry, index) {
    transformedEntries[index] = new lf.proc.RelationEntry(
        new lf.Row(entry.row.id(), {}), isPrefixApplied);

    this.columns_.forEach(function(column) {
      transformedEntries[index].setField(column, entry.getField(column));
    }, this);
  }, this);

  return new lf.proc.Relation(transformedEntries, this.relation_.getTables());
};


/**
 * Calculates all requested aggregations. Results are stored within
 * this.relation_.
 * @private
 */
lf.proc.RelationTransformer.prototype.calculateAggregators_ = function() {
  this.columns_.forEach(function(column) {
    if (!(column instanceof lf.fn.AggregatedColumn)) {
      return;
    }

    var reverseColumnChain = column.getColumnChain().reverse();
    for (var i = 1; i < reverseColumnChain.length; i++) {
      var currentColumn = reverseColumnChain[i];
      var leafColumn = currentColumn.getColumnChain().slice(-1)[0];
      var inputRelation = this.getInputRelationFor_(currentColumn);

      var result = lf.proc.RelationTransformer.evalAggregation_(
          currentColumn.aggregatorType, inputRelation, leafColumn);
      this.relation_.setAggregationResult(currentColumn, result);
    }
  }, this);
};


/**
 * @param {!lf.fn.AggregatedColumn} column The aggregated column.
 * @return {!lf.proc.Relation} The relation that should be used as input for
 *     calculating the given aggregated column.
 * @private
 */
lf.proc.RelationTransformer.prototype.getInputRelationFor_ = function(column) {
  return column.child instanceof lf.fn.AggregatedColumn ?
      /** @type {!lf.proc.Relation} */ (
          this.relation_.getAggregationResult(column.child)) :
      this.relation_;
};


/**
 * @param {!lf.fn.Type} aggregatorType The type of the aggregation.
 * @param {!lf.proc.Relation} relation The relation on which the aggregation
 *     will be evaluated.
 * @param {!lf.schema.Column} column The column on which the aggregation will be
 *     performed.
 * @return {!lf.proc.AggregationResult}
 * @private
 */
lf.proc.RelationTransformer.evalAggregation_ = function(
    aggregatorType, relation, column) {
  var result = null;

  switch (aggregatorType) {
    case lf.fn.Type.MIN:
      result = lf.proc.RelationTransformer.min_(relation, column);
      break;
    case lf.fn.Type.MAX:
      result = lf.proc.RelationTransformer.max_(relation, column);
      break;
    case lf.fn.Type.DISTINCT:
      result = lf.proc.RelationTransformer.distinct_(relation, column);
      break;
    case lf.fn.Type.COUNT:
      result = relation.entries.length;
      break;
    case lf.fn.Type.SUM:
      result = lf.proc.RelationTransformer.sum_(relation, column);
      break;
    case lf.fn.Type.AVG:
      result = lf.proc.RelationTransformer.sum_(relation, column) /
          relation.entries.length;
      break;
    default:
      // Must be case of lf.fn.Type.STDDEV.
      result = lf.proc.RelationTransformer.stddev_(relation, column);
  }

  return /** @type {!lf.proc.AggregationResult} */ (result);
};


/**
 * Calculates the minimum value of the given column for the given relation.
 * @param {!lf.proc.Relation} relation The relation on which to calculate
 *     the aggregation.
 * @param {!lf.schema.Column} column The column for which to calculate the
 *     minimum.
 * @return {number|string|!Date} The maximum.
 * @private
 */
lf.proc.RelationTransformer.min_ = function(relation, column) {
  var min = null;

  relation.entries.forEach(function(entry) {
    var value = entry.getField(column);
    if (goog.isNull(min) || value < min) {
      min = value;
    }
  });

  return /** @type {number|string|!Date} */ (min);
};


/**
 * Calculates the maximum value of the given column for the given relation.
 * @param {!lf.proc.Relation} relation The relation on which to calculate
 *     the aggregation.
 * @param {!lf.schema.Column} column The column for which to calculate the
 *     maximum.
 * @return {number|string|!Date} The maximum.
 * @private
 */
lf.proc.RelationTransformer.max_ = function(relation, column) {
  var max = null;

  relation.entries.forEach(function(entry) {
    var value = entry.getField(column);
    if (goog.isNull(max) || value > max) {
      max = value;
    }
  });

  return /** @type {number|string|!Date} */ (max);
};


/**
 * Calculates the sum of the given column for the given relation.
 * @param {!lf.proc.Relation} relation The relation on which to calculate
 *     the aggregation.
 * @param {!lf.schema.Column} column The column for which to calculate the
 *     sum.
 * @return {number|string} The maximum.
 * @private
 */
lf.proc.RelationTransformer.sum_ = function(relation, column) {
  return relation.entries.reduce(function(soFar, entry) {
    return soFar + entry.getField(column);
  }, 0);
};


/**
 * Calculates the standard deviation of the given column for the given relation.
 * @param {!lf.proc.Relation} relation The relation on which to calculate
 *     the aggregation.
 * @param {!lf.schema.Column} column The column for which to calculate the
 *     standard deviation.
 * @return {number} The maximum.
 * @private
 */
lf.proc.RelationTransformer.stddev_ = function(relation, column) {

  var values = relation.entries.map(function(entry) {
    return entry.getField(column);
  });

  return goog.math.standardDeviation.apply(null, values);
};


/**
 * Keeps only distinct entries with regards to the given column.
 * @param {!lf.proc.Relation} relation The relation on which to calculate the
 *     aggregation.
 * @param {!lf.schema.Column} column The column for which to remove duplicates.
 * @return {!lf.proc.Relation} A relation containing entries that have different
 *     values for the specified column.
 * @private
 */
lf.proc.RelationTransformer.distinct_ = function(relation, column) {
  var distinctMap = new goog.structs.Map();

  relation.entries.forEach(function(entry) {
    var value = entry.getField(column);
    distinctMap.set(value, entry);
  });

  return new lf.proc.Relation(distinctMap.getValues(), relation.getTables());
};


/**
 * Transforms a list of relations to a single relation. Each input relation is
 * transformed to a single entry on the final relation.
 * Note: Projection columns must include at least one aggregated column.
 *
 * @param {!Array.<!lf.proc.Relation>} relations The relations to be
 *     transformed.
 * @param {!Array.<!lf.schema.Column>} columns The columns to include in the
 *     transformed relation.
 * @return {!lf.proc.Relation} The final relation.
 */
lf.proc.RelationTransformer.transformMany = function(
    relations, columns) {
  var entries = relations.map(function(relation) {
    var relationTransformer = new lf.proc.RelationTransformer(
        relation, columns);
    var singleEntryRelation = relationTransformer.getTransformed();
    return singleEntryRelation.entries[0];
  });

  return new lf.proc.Relation(entries, relations[0].getTables());
};
