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
goog.provide('lf.proc.OrderByStep');

goog.require('lf.Order');
goog.require('lf.fn');
goog.require('lf.fn.AggregatedColumn');
goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.query.SelectContext');



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!Array<!lf.query.SelectContext.OrderBy>} orderBy
 */
lf.proc.OrderByStep = function(orderBy) {
  lf.proc.OrderByStep.base(this, 'constructor',
      lf.proc.PhysicalQueryPlanNode.ANY,
      lf.proc.PhysicalQueryPlanNode.ExecType.FIRST_CHILD);

  /** @type {!Array<!lf.query.SelectContext.OrderBy>} */
  this.orderBy = orderBy;
};
goog.inherits(lf.proc.OrderByStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.OrderByStep.prototype.toString = function() {
  return 'order_by(' +
      lf.query.SelectContext.orderByToString(this.orderBy) + ')';
};


/** @override */
lf.proc.OrderByStep.prototype.execInternal = function(relations) {
  if (relations.length == 1) {
    var distinctColumn = this.findDistinctColumn_(relations[0]);

    // If such a column exists, sort the results of the lf.fn.distinct
    // aggregator instead, since this is what will be used in the returned
    // result.
    var relationToSort = goog.isNull(distinctColumn) ?
        relations[0] :
        relations[0].getAggregationResult(distinctColumn);

    relationToSort.entries.sort(this.entryComparatorFn_.bind(this));
  } else { // if (relations.length > 1) {
    relations.sort(this.relationComparatorFn_.bind(this));
  }
  return relations;
};


/**
 * Determines whether sorting is requested on a column that has been aggregated
 * with lf.fn.distinct (if any).
 * @param {!lf.proc.Relation} relation The input relation.
 * @return {?lf.schema.Column} The DISTINCT aggregated column or null if no such
 *     column was found.
 * @private
 */
lf.proc.OrderByStep.prototype.findDistinctColumn_ = function(relation) {
  var distinctColumn = null;

  for (var i = 0; i < this.orderBy.length; i++) {
    var tempDistinctColumn = lf.fn.distinct(
        /** @type {!lf.schema.BaseColumn} */ (this.orderBy[i].column));
    if (relation.hasAggregationResult(tempDistinctColumn)) {
      distinctColumn = tempDistinctColumn;
      break;
    }
  }
  return distinctColumn;
};


/**
 * @param {!function(!lf.schema.Column):*} getLeftPayload
 * @param {!function(!lf.schema.Column):*} getRightPayload
 * @return {number} -1 if a should precede b, 1 if b should precede a, 0 if a
 *     and b are determined to be equal.
 * @private
 */
lf.proc.OrderByStep.prototype.comparator_ = function(
    getLeftPayload, getRightPayload) {
  var order = null;
  var leftPayload = null;
  var rightPayload = null;
  var comparisonIndex = -1;

  do {
    comparisonIndex++;
    var column = this.orderBy[comparisonIndex].column;
    order = this.orderBy[comparisonIndex].order;
    leftPayload = getLeftPayload(column);
    rightPayload = getRightPayload(column);
  } while (leftPayload == rightPayload &&
      comparisonIndex + 1 < this.orderBy.length);

  var result = (leftPayload < rightPayload) ? -1 :
      (leftPayload > rightPayload) ? 1 : 0;
  result = order == lf.Order.ASC ? result : -result;
  return result;
};


/**
 * Comparator function used for sorting relations.
 *
 * @param {!lf.proc.Relation} lhs The first operand.
 * @param {!lf.proc.Relation} rhs The second operand.
 * @return {number} -1 if a should precede b, 1 if b should precede a, 0 if a
 *     and b are determined to be equal.
 * @private
 */
lf.proc.OrderByStep.prototype.relationComparatorFn_ = function(lhs, rhs) {
  // NOTE: See NOTE in entryComparatorFn_ on why two separate functions are
  // passed in this.comparator_ instead of using one method and binding to lhs
  // and to rhs respectively.
  return this.comparator_(
      function(column) {
        // If relations are sorted based on a non-aggregated column, choose
        // the last entry of each relation as a representative row (same as
        // SQLlite).
        return column instanceof lf.fn.AggregatedColumn ?
            lhs.getAggregationResult(column) :
            lhs.entries[lhs.entries.length - 1].getField(column);
      },
      function(column) {
        return column instanceof lf.fn.AggregatedColumn ?
            rhs.getAggregationResult(column) :
            rhs.entries[rhs.entries.length - 1].getField(column);

      });
};


/**
 * Comparator function used for sorting entries within a single relation.
 *
 * @param {!lf.proc.RelationEntry} lhs The first operand.
 * @param {!lf.proc.RelationEntry} rhs The second operand.
 * @return {number} -1 if a should precede b, 1 if b should precede a, 0 if a
 *     and b are determined to be equal.
 * @private
 */
lf.proc.OrderByStep.prototype.entryComparatorFn_ = function(lhs, rhs) {
  // NOTE: Avoiding on purpose to create a getPayload(operand, column) method
  // here, and binding it once to lhs and once to rhs, because it turns out that
  // Function.bind() is significantly hurting performance (measured on
  // Chrome 40).
  return this.comparator_(
      function(column) { return lhs.getField(column); },
      function(column) { return rhs.getField(column); });
};
