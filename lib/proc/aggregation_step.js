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
goog.provide('lf.proc.AggregationStep');

goog.require('goog.math');
goog.require('lf.fn.AggregatedColumn');
goog.require('lf.fn.StarColumn');
goog.require('lf.fn.Type');
goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.proc.Relation');
goog.require('lf.structs.map');



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
lf.proc.AggregationStep.prototype.execInternal = function(relations) {
  relations.forEach(function(relation) {
    var calculator = new lf.proc.AggregationStep.Calculator_(
        relation, this.aggregatedColumns);
    calculator.calculate();
  }, this);
  return relations;
};



/**
 * @constructor @struct
 * @private
 *
 * @param {!lf.proc.Relation} relation The relation to be transformed.
 * @param {!Array<!lf.fn.AggregatedColumn>} columns The columns to calculate.
 */
lf.proc.AggregationStep.Calculator_ = function(relation, columns) {
  /** @private {!lf.proc.Relation} */
  this.relation_ = relation;

  /** @private {!Array<!lf.fn.AggregatedColumn>} */
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
      var currentColumn = /** @type {!lf.fn.AggregatedColumn} */ (
          reverseColumnChain[i]);
      var leafColumn = currentColumn.getColumnChain().slice(-1)[0];
      var inputRelation = this.getInputRelationFor_(currentColumn);

      // Return early if the aggregation result has already been calculated.
      if (inputRelation.hasAggregationResult(currentColumn)) {
        return;
      }

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
      result = Calculator.reduce_(
          relation, column, function(soFar, value) {
            return value < soFar ? value : soFar;
          });
      break;
    case lf.fn.Type.MAX:
      result = Calculator.reduce_(
          relation, column, function(soFar, value) {
            return value > soFar ? value : soFar;
          });
      break;
    case lf.fn.Type.DISTINCT:
      result = Calculator.distinct_(relation, column);
      break;
    case lf.fn.Type.COUNT:
      result = Calculator.count_(relation, column);
      break;
    case lf.fn.Type.SUM:
      result = Calculator.sum_(relation, column);
      break;
    case lf.fn.Type.AVG:
      var count = Calculator.count_(relation, column);
      if (count > 0) {
        result = Calculator.sum_(relation, column) / count;
      }
      break;
    case lf.fn.Type.GEOMEAN:
      result = Calculator.geomean_(relation, column);
      break;
    default:
      // Must be case of lf.fn.Type.STDDEV.
      result = Calculator.stddev_(relation, column);
      break;
  }

  return /** @type {!lf.proc.AggregationResult} */ (result);
};


/**
 * Reduces the input relation to a single value. Null values are ignored.
 * @param {!lf.proc.Relation} relation The relation on which to calculate
 *     the aggregation.
 * @param {!lf.schema.Column} column The column for which to calculate the
 *     minimum.
 * @param {!Function} reduceFn The reduce function.
 * @return {number|string|!Date} The minimum/maximum.
 * @private
 */
lf.proc.AggregationStep.Calculator_.reduce_ = function(
    relation, column, reduceFn) {
  return /** @type {number|string|!Date} */ (relation.entries.reduce(
      function(soFar, entry) {
        var value = entry.getField(column);
        if (goog.isNull(value)) {
          return soFar;
        }
        return goog.isNull(soFar) ? value : reduceFn(soFar, value);
      }, null));
};


/**
 * Calculates the count of the given column for the given relation.
 * COUNT(*) returns count of all rows but COUNT(column) ignores nulls
 * in that column.
 * @param {!lf.proc.Relation} relation The relation on which to calculate
 *     the aggregation.
 * @param {!lf.schema.Column} column The column for which to calculate the
 *     minimum.
 * @return {number}
 * @private
 */
lf.proc.AggregationStep.Calculator_.count_ = function(relation, column) {
  if (column instanceof lf.fn.StarColumn) {
    return relation.entries.length;
  }
  return relation.entries.reduce(function(soFar, entry) {
    return soFar + (goog.isNull(entry.getField(column)) ? 0 : 1);
  }, 0);
};


/**
 * Calculates the sum of the given column for the given relation.
 * If all rows have only value null for that column, then null is returned.
 * If the table is empty, null is returned.
 * @param {!lf.proc.Relation} relation The relation on which to calculate
 *     the aggregation.
 * @param {!lf.schema.Column} column The column for which to calculate the
 *     sum.
 * @return {number|string} The maximum.
 * @private
 */
lf.proc.AggregationStep.Calculator_.sum_ = function(relation, column) {
  return /** @type {number|string} */(
      lf.proc.AggregationStep.Calculator_.reduce_(
          relation, column, function(soFar, value) {
            return value + soFar;
          }));
};


/**
 * Calculates the standard deviation of the given column for the given relation.
 * If all rows have only value null for that column, then null is returned.
 * If the table is empty, null is returned.
 * @param {!lf.proc.Relation} relation The relation on which to calculate
 *     the aggregation.
 * @param {!lf.schema.Column} column The column for which to calculate the
 *     standard deviation.
 * @return {?number} The standard deviation.
 * @private
 */
lf.proc.AggregationStep.Calculator_.stddev_ = function(relation, column) {
  var values = [];
  relation.entries.forEach(function(entry) {
    var value = entry.getField(column);
    if (!goog.isNull(value)) {
      values.push(value);
    }
  });

  return values.length == 0 ?
      null : goog.math.standardDeviation.apply(null, values);
};


/**
 * Calculates the geometrical mean of the given column for the given relation.
 *
 * @param {!lf.proc.Relation} relation The relation on which to calculate
 *     the aggregation.
 * @param {!lf.schema.Column} column The column for which to calculate the
 *     geometrical mean.
 * @return {?number} The geometrical mean. Zero values are ignored. If all
       values given are zero, or if the input relation is empty, null is
       returned.
 * @private
 */
lf.proc.AggregationStep.Calculator_.geomean_ = function(relation, column) {
  var nonZeroEntriesCount = 0;

  var reduced = relation.entries.reduce(
      function(soFar, entry) {
        var value = entry.getField(column);
        if (value != 0 && !goog.isNull(value)) {
          nonZeroEntriesCount++;
          return soFar + Math.log(value);
        } else {
          return soFar;
        }
      }, 0);

  return nonZeroEntriesCount == 0 ?
      null : Math.pow(Math.E, reduced / nonZeroEntriesCount);
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
  var distinctMap = lf.structs.map.create();

  relation.entries.forEach(function(entry) {
    var value = entry.getField(column);
    distinctMap.set(value, entry);
  });

  return new lf.proc.Relation(
      lf.structs.map.values(distinctMap), relation.getTables());
};
