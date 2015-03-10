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
goog.provide('lf.proc.OrderByStep');

goog.require('lf.Order');
goog.require('lf.fn.AggregatedColumn');
goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.query.SelectContext');



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!Array.<!lf.query.SelectContext.OrderBy>} orderBy
 */
lf.proc.OrderByStep = function(orderBy) {
  lf.proc.OrderByStep.base(this, 'constructor',
      lf.proc.PhysicalQueryPlanNode.ANY,
      lf.proc.PhysicalQueryPlanNode.ExecType.FIRST_CHILD);

  /** @type {!Array.<!lf.query.SelectContext.OrderBy>} */
  this.orderBy = orderBy;
};
goog.inherits(lf.proc.OrderByStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.OrderByStep.prototype.toString = function() {
  return 'order_by(' +
      lf.query.SelectContext.orderByToString(this.orderBy) + ')';
};


/** @override */
lf.proc.OrderByStep.prototype.execInternal = function(journal, relations) {
  if (relations.length == 1) {
    relations[0].entries.sort(this.entryComparatorFn_.bind(this));
  } else { // if (relations.length > 1) {
    relations.sort(this.relationComparatorFn_.bind(this));
  }
  return relations;
};


/**
 * @param {!function(!lf.schema.Column):!Array} getPayloadsFn
 * @return {number} -1 if a should precede b, 1 if b should precede a, 0 if a
 *     and b are determined to be equal.
 * @private
 */
lf.proc.OrderByStep.prototype.comparator_ = function(getPayloadsFn) {
  var order = null;
  var payloads = [null, null];
  var comparisonIndex = -1;

  do {
    comparisonIndex++;
    var column = this.orderBy[comparisonIndex].column;
    order = this.orderBy[comparisonIndex].order;
    payloads = getPayloadsFn(column);
  } while (payloads[0] == payloads[1] &&
      comparisonIndex + 1 < this.orderBy.length);

  var result = (payloads[0] < payloads[1]) ? -1 :
      (payloads[0] > payloads[1]) ? 1 : 0;
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
  return this.comparator_(
      function(column) {
        var leftPayload = null;
        var rightPayload = null;
        if (column instanceof lf.fn.AggregatedColumn) {
          leftPayload = lhs.getAggregationResult(column);
          rightPayload = rhs.getAggregationResult(column);
        } else {
          // If relations are sorted based on a non-aggregated column, choose
          // the last entry of each relations as a representative row (same as
          // SQLlite).
          leftPayload = lhs.entries[lhs.entries.length - 1].getField(column);
          rightPayload = rhs.entries[rhs.entries.length - 1].getField(column);
        }
        return [leftPayload, rightPayload];
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
  return this.comparator_(
      function(column) {
        return [lhs.getField(column), rhs.getField(column)];
      });
};
