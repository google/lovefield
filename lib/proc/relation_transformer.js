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
goog.provide('lf.proc.RelationTransformer');

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
 * @param {!Array<!lf.schema.Column>} columns The columns of interest.
 */
lf.proc.RelationTransformer = function(relation, columns) {
  /**
   * The relation on which this transformer will operate.
   * @private {!lf.proc.Relation}
   */
  this.relation_ = relation;

  /**
   * The columns that should be included in the transformed relation.
   * @private {!Array<!lf.schema.Column>}
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
 * Transforms a list of relations to a single relation. Each input relation is
 * transformed to a single entry on the final relation.
 * Note: Projection columns must include at least one aggregated column.
 *
 * @param {!Array<!lf.proc.Relation>} relations The relations to be
 *     transformed.
 * @param {!Array<!lf.schema.Column>} columns The columns to include in the
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
