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
goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.query.SelectContext');



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!Array.<!lf.query.SelectContext.OrderBy>} orderBy
 */
lf.proc.OrderByStep = function(orderBy) {
  lf.proc.OrderByStep.base(this, 'constructor');

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
lf.proc.OrderByStep.prototype.exec = function(journal) {
  return this.getChildAt(0).exec(journal).then(goog.bind(
      /**
       * @param {!lf.proc.Relation} relation
       * @this {lf.proc.OrderByStep}
       */
      function(relation) {
        var useNormalizedNames = relation.isPrefixApplied();
        relation.entries.sort(
            this.comparatorFn_.bind(this, useNormalizedNames));
        return relation;
      }, this));
};


/**
 * Comparator function used for sorting.
 *
 * @param {boolean} useNormalizedNames Whether normalized names should be used
 *     when constructing/referring to row payloads.
 * @param {!lf.proc.RelationEntry} lhs The first operand.
 * @param {!lf.proc.RelationEntry} rhs The second operand.
 * @return {number} -1 if a should precede b, 1 if b should precede a, 0 if a
 *     and b are determined to be equal.
 * @private
 */
lf.proc.OrderByStep.prototype.comparatorFn_ = function(
    useNormalizedNames, lhs, rhs) {
  var leftPayload = null;
  var rightPayload = null;
  var order = null;

  var comparisonIndex = -1;
  do {
    comparisonIndex++;
    var column = this.orderBy[comparisonIndex].column;
    order = this.orderBy[comparisonIndex].order;
    leftPayload = lhs.getField(column);
    rightPayload = rhs.getField(column);
  } while (leftPayload == rightPayload &&
      comparisonIndex + 1 < this.orderBy.length);

  if (leftPayload < rightPayload) {
    return order == lf.Order.ASC ? -1 : 1;
  } else if (leftPayload > rightPayload) {
    return order == lf.Order.ASC ? 1 : -1;
  } else {
    return 0;
  }
};
