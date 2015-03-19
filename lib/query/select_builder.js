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
goog.provide('lf.query.SelectBuilder');

goog.require('lf.Binder');
goog.require('lf.Exception');
goog.require('lf.Order');
goog.require('lf.Type');
goog.require('lf.fn.AggregatedColumn');
goog.require('lf.fn.Type');
goog.require('lf.op');
goog.require('lf.query.BaseBuilder');
goog.require('lf.query.Select');
goog.require('lf.query.SelectContext');



/**
 * @constructor
 * @extends {lf.query.BaseBuilder.<!lf.query.SelectContext>}
 * @implements {lf.query.Select}
 * @struct
 *
 * @param {!lf.Global} global
 * @param {!Array<!lf.schema.Column>} columns
 */
lf.query.SelectBuilder = function(global, columns) {
  lf.query.SelectBuilder.base(this, 'constructor', global);

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

  /** @private {!lf.Binder} */
  this.limitBinder_;

  /** @private {!lf.Binder} */
  this.skipBinder_;

  this.query = new lf.query.SelectContext();
  this.query.columns = columns;

  this.checkDistinctColumn_();
  this.checkAggregations_();
};
goog.inherits(lf.query.SelectBuilder, lf.query.BaseBuilder);


/** @override */
lf.query.SelectBuilder.prototype.assertExecPreconditions = function() {
  lf.query.SelectBuilder.base(this, 'assertExecPreconditions');

  if (!goog.isDefAndNotNull(this.query.from)) {
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX,
        'Invalid usage of select()');
  }

  if ((goog.isDef(this.limitBinder_) && !goog.isDef(this.query.limit)) ||
      (goog.isDef(this.skipBinder_) && !goog.isDef(this.query.skip))) {
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX,
        'Binding parameters of limit/skip without providing values');
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
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX,
        'Invalid usage of lf.fn.distinct()');
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
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX,
        'Invalid projection list or groupBy columns');
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
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX,
        'Invalid projection list, aggregated and non-aggregated ' +
        'can\'t be mixed.');
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
          throw new lf.Exception(
              lf.Exception.Type.SYNTAX,
              'Invalid aggregation detected for' + column.getNormalizedName());
        }
      }, this);
};


/**
 * Checks that the a given field has not already been specified.
 * @param {*} field The field to be checked.
 * @param {string} name The name of the field being checked, used for providing
 *     an informative error message.
 * @private
 */
lf.query.SelectBuilder.prototype.assertNotAlreadyCalled_ = function(
    field, name) {
  if (goog.isDefAndNotNull(field)) {
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX, name + '() has already been called.');
  }
};


/**
 * Checks that the given number argument is not a negative number.
 * @param {number} numberOfRows The argument to be checked.
 * @param {string} name The name of the field being checked, used for providing
 *     an informative error message.
 * @private
 */
lf.query.SelectBuilder.prototype.assertNotNegative_ = function(
    numberOfRows, name) {
  if (numberOfRows < 0) {
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX,
        name + '() does not accept negative values');
  }
};


/** @override */
lf.query.SelectBuilder.prototype.from = function(var_args) {
  if (this.fromAlreadyCalled_) {
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX, 'from() has already been called.');
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


/** @override */
lf.query.SelectBuilder.prototype.where = function(predicate) {
  if (this.whereAlreadyCalled_) {
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX, 'where() has already been called.');
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


/** @override */
lf.query.SelectBuilder.prototype.innerJoin = function(table, predicate) {
  if (!goog.isDefAndNotNull(this.query.from)) {
    this.query.from = [];
  }
  this.query.from.push(table);

  this.augmentWhereClause_(predicate);

  return this;
};


/** @override */
lf.query.SelectBuilder.prototype.leftOuterJoin = function(table, predicate) {
  throw new lf.Exception(
      lf.Exception.Type.NOT_SUPPORTED, 'Not implemented yet'
  );
};


/**
 * @param {number} numberOfRows
 * @private
 */
lf.query.SelectBuilder.prototype.setLimit_ = function(numberOfRows) {
  this.assertNotNegative_(numberOfRows, 'limit');
  this.query.limit = numberOfRows;
};


/** @override */
lf.query.SelectBuilder.prototype.limit = function(numberOfRows) {
  this.assertNotAlreadyCalled_(this.query.limit, 'limit');

  if (numberOfRows instanceof lf.Binder) {
    this.limitBinder_ = numberOfRows;
  } else {
    this.setLimit_(numberOfRows);
  }
  return this;
};


/**
 * @param {number} numberOfRows
 * @private
 */
lf.query.SelectBuilder.prototype.setSkip_ = function(numberOfRows) {
  this.assertNotNegative_(numberOfRows, 'skip');
  this.query.skip = numberOfRows;
};


/** @override */
lf.query.SelectBuilder.prototype.skip = function(numberOfRows) {
  this.assertNotAlreadyCalled_(this.query.skip, 'skip');

  if (numberOfRows instanceof lf.Binder) {
    this.skipBinder_ = numberOfRows;
  } else {
    this.setSkip_(numberOfRows);
  }
  return this;
};


/** @override */
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


/** @override */
lf.query.SelectBuilder.prototype.groupBy = function(var_args) {
  this.assertNotAlreadyCalled_(this.query.groupBy, 'groupBy');

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


/** @override */
lf.query.SelectBuilder.prototype.bind = function(values) {
  lf.query.BaseBuilder.bindValuesInSearchCondition(this.query, values);
  if (goog.isDefAndNotNull(this.limitBinder_)) {
    this.setLimit_(
        /** @type {number} */ (values[this.limitBinder_.getIndex()]));
  }

  if (goog.isDefAndNotNull(this.skipBinder_)) {
    this.setSkip_(
        /** @type {number} */ (values[this.skipBinder_.getIndex()]));
  }
  return this;
};
