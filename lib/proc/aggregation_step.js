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
goog.provide('lf.proc.AggregationStep');

goog.require('goog.structs.Map');
goog.require('lf.fn.AggregatedColumn');
goog.require('lf.fn.Type');
goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.proc.Relation');



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!Array<!lf.schema.Column>} aggregatedColumns
 */
lf.proc.AggregationStep = function(aggregatedColumns) {
  lf.proc.AggregationStep.base(this, 'constructor',
      lf.proc.PhysicalQueryPlanNode.ANY,
      lf.proc.PhysicalQueryPlanNode.ExecType.FIRST_CHILD);

  /** @type {!Array<!lf.schema.Column>} */
  this.aggregatedColumns = aggregatedColumns;
};
goog.inherits(lf.proc.AggregationStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.AggregationStep.prototype.toString = function() {
  var columnNames = this.aggregatedColumns.map(
      function(column) {
        return column.getNormalizedName();
      });

  return 'aggregation(' + columnNames.toString() + ')';
};


/** @override */
lf.proc.AggregationStep.prototype.execInternal = function(journal, relations) {
  relations.forEach(function(relation) {
    var calculator = new lf.proc.AggregationStep.Calculator_(
        relation, this.aggregatedColumns);
    calculator.calculate();
  }, this);
  return relations;
};



/**
 * @constructor
 * @private
 *
 * @param {!lf.proc.Relation} relation The relation to be transformed.
 * @param {!Array<!lf.fn.AggregatedColumn>} columns The columns to calculate.
 */
lf.proc.AggregationStep.Calculator_ = function(relation, columns) {
  this.relation_ = relation;
  this.columns_ = columns;
};


/**
 * Calculates all requested aggregations. Results are stored within
 * this.relation_.
 */
lf.proc.AggregationStep.Calculator_.prototype.calculate = function() {
  this.columns_.forEach(function(column) {
    var reverseColumnChain = column.getColumnChain().reverse();
    for (var i = 1; i < reverseColumnChain.length; i++) {
      var currentColumn = reverseColumnChain[i];
      var leafColumn = currentColumn.getColumnChain().slice(-1)[0];
      var inputRelation = this.getInputRelationFor_(currentColumn);

      var result = lf.proc.AggregationStep.Calculator_.evalAggregation_(
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
lf.proc.AggregationStep.Calculator_.prototype.getInputRelationFor_ =
    function(column) {
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
lf.proc.AggregationStep.Calculator_.evalAggregation_ = function(
    aggregatorType, relation, column) {
  var result = null;
  var Calculator = lf.proc.AggregationStep.Calculator_;

  switch (aggregatorType) {
    case lf.fn.Type.MIN:
      result = Calculator.min_(relation, column);
      break;
    case lf.fn.Type.MAX:
      result = Calculator.max_(relation, column);
      break;
    case lf.fn.Type.DISTINCT:
      result = Calculator.distinct_(relation, column);
      break;
    case lf.fn.Type.COUNT:
      result = relation.entries.length;
      break;
    case lf.fn.Type.SUM:
      result = Calculator.sum_(relation, column);
      break;
    case lf.fn.Type.AVG:
      result = Calculator.sum_(relation, column) /
          relation.entries.length;
      break;
    default:
      // Must be case of lf.fn.Type.STDDEV.
      result = Calculator.stddev_(relation, column);
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
lf.proc.AggregationStep.Calculator_.min_ = function(relation, column) {
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
lf.proc.AggregationStep.Calculator_.max_ = function(relation, column) {
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
lf.proc.AggregationStep.Calculator_.sum_ = function(relation, column) {
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
lf.proc.AggregationStep.Calculator_.stddev_ = function(relation, column) {

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
lf.proc.AggregationStep.Calculator_.distinct_ = function(relation, column) {
  var distinctMap = new goog.structs.Map();

  relation.entries.forEach(function(entry) {
    var value = entry.getField(column);
    distinctMap.set(value, entry);
  });

  return new lf.proc.Relation(distinctMap.getValues(), relation.getTables());
};
