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
goog.provide('lf.query.SelectBuilder');

goog.require('lf.Binder');
goog.require('lf.Exception');
goog.require('lf.Order');
goog.require('lf.Type');
goog.require('lf.fn.AggregatedColumn');
goog.require('lf.fn.Type');
goog.require('lf.op');
goog.require('lf.pred.JoinPredicate');
goog.require('lf.query.BaseBuilder');
goog.require('lf.query.Select');
goog.require('lf.query.SelectContext');
goog.require('lf.service');
goog.require('lf.structs.set');



/**
 * @constructor
 * @extends {lf.query.BaseBuilder.<!lf.query.SelectContext>}
 * @implements {lf.query.Select}
 * @struct
 * @export
 *
 * @param {!lf.Global} global
 * @param {!Array<!lf.schema.Column>} columns
 */
lf.query.SelectBuilder = function(global, columns) {
  lf.query.SelectBuilder.base(
      this, 'constructor', global,
      new lf.query.SelectContext(global.getService(lf.service.SCHEMA)));

  /**
   * Tracks whether where() has been called.
   * @private {boolean}
   */
  this.whereAlreadyCalled_ = false;

  /**
   * Tracks whether from() has been called.
   * @private {boolean}
   */
  this.fromAlreadyCalled_ = false;

  this.query.columns = columns;

  this.checkDistinctColumn_();
  this.checkAggregations_();
};
goog.inherits(lf.query.SelectBuilder, lf.query.BaseBuilder);


/** @override */
lf.query.SelectBuilder.prototype.assertExecPreconditions = function() {
  lf.query.SelectBuilder.base(this, 'assertExecPreconditions');
  var context = this.query;

  if (!goog.isDefAndNotNull(context.from)) {
    // 522: Invalid usage of select().
    throw new lf.Exception(522);
  }
  if ((goog.isDef(context.limitBinder) && !goog.isDef(context.limit)) ||
      (goog.isDef(context.skipBinder) && !goog.isDef(context.skip))) {
    // 523: Binding parameters of limit/skip without providing values.
    throw new lf.Exception(523);
  }

  this.checkProjectionList_();
};


/**
 * Checks that usage of lf.fn.distinct() is correct. Specifically if an
 * lf.fn.distinct() column is requested, then it can't be combined with any
 * other column.
 * @private
 * @throws {!lf.Exception}
 */
lf.query.SelectBuilder.prototype.checkDistinctColumn_ = function() {
  var distinctColumns = this.query.columns.filter(
      function(column) {
        return (column instanceof lf.fn.AggregatedColumn) &&
            column.aggregatorType == lf.fn.Type.DISTINCT;
      }, this);

  var isValidCombination = distinctColumns.length == 0 ||
      (distinctColumns.length == 1 && this.query.columns.length == 1);

  if (!isValidCombination) {
    // 524: Invalid usage of lf.fn.distinct().
    throw new lf.Exception(524);
  }
};


/**
 * Checks that the combination of projection list is valid.
 * Specifically:
 * 1) If GROUP_BY is specified: Any non-aggregated column that appears in
 *    the projection list *must* also appear in the GROUP_BY list.
 * 2) If GROUP_BY is not specified: Aggregate and non-aggregated columns can't
 *    be mixed (result does not make sense).
 * @private
 * @throws {!lf.Exception}
 */
lf.query.SelectBuilder.prototype.checkProjectionList_ = function() {
  goog.isDefAndNotNull(this.query.groupBy) ?
      this.checkGroupByColumns_() : this.checkProjectionListNotMixed_();
};


/**
 * Checks that the combination of projected and grouped columns is valid. See
 * checkProjectionList_ for details.
 * @private
 * @throws {!lf.Exception}
 */
lf.query.SelectBuilder.prototype.checkGroupByColumns_ = function() {
  var nonAggregatedColumns = this.query.columns.filter(function(column) {
    return !(column instanceof lf.fn.AggregatedColumn);
  }).map(function(column) {
    return column.getNormalizedName();
  });

  var isInvalid = false;

  // Disallowing "SELECT *" if GROUP_BY is specified, because projection list
  // validity can't be performed.
  if (this.query.groupBy.length == 0 || this.query.columns.length == 0) {
    isInvalid = true;
  } else {
    var groupByColumns = this.query.groupBy.map(function(column) {
      return column.getNormalizedName();
    });
    isInvalid = nonAggregatedColumns.some(function(column) {
      return groupByColumns.indexOf(column) == -1;
    });

    if (!isInvalid) {
      isInvalid = this.query.groupBy.some(function(column) {
        var type = column.getType();
        return (type == lf.Type.OBJECT || type == lf.Type.ARRAY_BUFFER);
      });
    }
  }

  if (isInvalid) {
    // 525: Invalid projection list or groupBy columns.
    throw new lf.Exception(525);
  }
};


/**
 * Checks that the projection list contains either only non-aggregated columns,
 * or only aggregated columns. See checkProjectionList_ for details.
 * @private
 * @throws {!lf.Exception}
 */
lf.query.SelectBuilder.prototype.checkProjectionListNotMixed_ = function() {
  var aggregatedColumnsExist = this.query.columns.some(
      function(column) {
        return (column instanceof lf.fn.AggregatedColumn);
      }, this);
  var nonAggregatedColumnsExist = this.query.columns.some(
      function(column) {
        return !(column instanceof lf.fn.AggregatedColumn);
      }, this) || this.query.columns.length == 0;

  if (aggregatedColumnsExist && nonAggregatedColumnsExist) {
    // 526: Invalid projection list: mixing aggregated with non-aggregated
    throw new lf.Exception(526);
  }
};


/**
 * Checks that the specified aggregations are valid, in terms of aggregation
 * type and column type.
 * @private
 * @throws {!lf.Exception}
 */
lf.query.SelectBuilder.prototype.checkAggregations_ = function() {
  this.query.columns.forEach(
      function(column) {
        var isValidAggregation = !(column instanceof lf.fn.AggregatedColumn) ||
            lf.query.SelectBuilder.isAggregationValid_(
                column.aggregatorType, column.getType());

        if (!isValidAggregation) {
          // 527: Invalid aggregation detected: {0}.
          throw new lf.Exception(527, column.getNormalizedName());
        }
      }, this);
};


/** @override @export */
lf.query.SelectBuilder.prototype.from = function(var_args) {
  if (this.fromAlreadyCalled_) {
    // 515: from() has already been called.
    throw new lf.Exception(515);
  }
  this.fromAlreadyCalled_ = true;

  if (!goog.isDefAndNotNull(this.query.from)) {
    this.query.from = [];
  }

  this.query.from.push.apply(
      this.query.from,
      Array.prototype.slice.call(arguments));

  return this;
};


/** @override @export */
lf.query.SelectBuilder.prototype.where = function(predicate) {
  if (this.whereAlreadyCalled_) {
    // 516: where() has already been called.
    throw new lf.Exception(516);
  }
  this.whereAlreadyCalled_ = true;

  this.augmentWhereClause_(predicate);
  return this;
};


/**
 * Augments the where clause by ANDing it with the given predicate.
 * @param {!lf.Predicate} predicate
 * @private
 */
lf.query.SelectBuilder.prototype.augmentWhereClause_ = function(predicate) {
  if (goog.isDefAndNotNull(this.query.where)) {
    var newPredicate = lf.op.and(predicate, this.query.where);
    this.query.where = newPredicate;
  } else {
    this.query.where = predicate;
  }
};


/** @override @export */
lf.query.SelectBuilder.prototype.innerJoin = function(table, predicate) {
  if (!goog.isDefAndNotNull(this.query.from)) {
    // 542: from() has to be called before innerJoin() or leftOuterJoin().
    throw new lf.Exception(542);
  }
  this.query.from.push(table);

  this.augmentWhereClause_(predicate);

  return this;
};


/** @override @export */
lf.query.SelectBuilder.prototype.leftOuterJoin = function(table, predicate) {
  if (!(predicate instanceof lf.pred.JoinPredicate)) {
    // 541: Outer join accepts only join predicate.
    throw new lf.Exception(541);
  }
  if (!goog.isDefAndNotNull(this.query.from)) {
    // 542: from() has to be called before innerJoin() or leftOuterJoin().
    throw new lf.Exception(542);
  }
  this.query.from.push(table);
  if (!goog.isDefAndNotNull(this.query.outerJoinPredicates)) {
    this.query.outerJoinPredicates = lf.structs.set.create();
  }
  var normalizedPredicate = predicate;
  if (table.getEffectiveName() !=
      predicate.rightColumn.getTable().getEffectiveName()) {
    normalizedPredicate = predicate.reverse();
  }
  this.query.outerJoinPredicates.add(normalizedPredicate.getId());
  this.augmentWhereClause_(normalizedPredicate);
  return this;
};


/** @override @export */
lf.query.SelectBuilder.prototype.limit = function(numberOfRows) {
  if (goog.isDefAndNotNull(this.query.limit || this.query.limitBinder)) {
    // 528: limit() has already been called.
    throw new lf.Exception(528);
  }
  if (numberOfRows instanceof lf.Binder) {
    this.query.limitBinder = numberOfRows;
  } else {
    if (numberOfRows < 0) {
      // 531: Number of rows must not be negative for limit/skip.
      throw new lf.Exception(531);
    }
    this.query.limit = numberOfRows;
  }
  return this;
};


/** @override @export */
lf.query.SelectBuilder.prototype.skip = function(numberOfRows) {
  if (goog.isDefAndNotNull(this.query.skip || this.query.skipBinder)) {
    // 529: skip() has already been called.
    throw new lf.Exception(529);
  }
  if (numberOfRows instanceof lf.Binder) {
    this.query.skipBinder = numberOfRows;
  } else {
    if (numberOfRows < 0) {
      // 531: Number of rows must not be negative for limit/skip.
      throw new lf.Exception(531);
    }
    this.query.skip = numberOfRows;
  }
  return this;
};


/** @override @export */
lf.query.SelectBuilder.prototype.orderBy = function(column, opt_order) {
  if (!goog.isDefAndNotNull(this.query.orderBy)) {
    this.query.orderBy = [];
  }

  this.query.orderBy.push({
    column: column,
    order: goog.isDefAndNotNull(opt_order) ? opt_order : lf.Order.ASC
  });

  return this;
};


/** @override @export */
lf.query.SelectBuilder.prototype.groupBy = function(var_args) {
  if (goog.isDefAndNotNull(this.query.groupBy)) {
    // 530: groupBy() has already been called.
    throw new lf.Exception(530);
  }
  if (!goog.isDefAndNotNull(this.query.groupBy)) {
    this.query.groupBy = [];
  }

  this.query.groupBy.push.apply(
      this.query.groupBy,
      Array.prototype.slice.call(arguments));

  return this;
};


/**
 * Checks whether the user specified aggregations are valid.
 * @param {!lf.fn.Type} aggregatorType
 * @param {!lf.Type} columnType
 * @return {boolean}
 * @private
 */
lf.query.SelectBuilder.isAggregationValid_ = function(
    aggregatorType, columnType) {
  switch (aggregatorType) {
    case lf.fn.Type.COUNT:
    case lf.fn.Type.DISTINCT:
      return true;
    case lf.fn.Type.AVG:
    case lf.fn.Type.GEOMEAN:
    case lf.fn.Type.STDDEV:
    case lf.fn.Type.SUM:
      return columnType == lf.Type.NUMBER || columnType == lf.Type.INTEGER;
    case lf.fn.Type.MAX:
    case lf.fn.Type.MIN:
      return columnType == lf.Type.NUMBER || columnType == lf.Type.INTEGER ||
          columnType == lf.Type.STRING || columnType == lf.Type.DATE_TIME;
  }

  return false;
};


/**
 * Provides a clone of this select builder. This is useful when the user needs
 * to observe the same query with different parameter bindings.
 * @return {!lf.query.SelectBuilder}
 * @export
 */
lf.query.SelectBuilder.prototype.clone = function() {
  var builder = new lf.query.SelectBuilder(this.global, this.query.columns);
  builder.query = this.query.clone();
  builder.query.clonedFrom = null;  // The two builders are not related.
  return builder;
};
