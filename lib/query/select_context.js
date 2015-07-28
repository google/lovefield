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
goog.provide('lf.query.SelectContext');
goog.provide('lf.query.SelectContext.OrderBy');

goog.require('lf.Order');
goog.require('lf.query.Context');
goog.require('lf.structs.set');



/**
 * Internal representation of an SELECT query.
 * @constructor
 * @extends {lf.query.Context}
 *
 * @param {!lf.schema.Database} schema
 */
lf.query.SelectContext = function(schema) {
  lf.query.SelectContext.base(this, 'constructor', schema);

  /** @type {!Array<!lf.schema.Column>} */
  this.columns;

  /** @type {!Array<!lf.schema.Table>} */
  this.from;

  /** @type {number} */
  this.limit;

  /** @type {number} */
  this.skip;

  /** @type {!Array<!lf.query.SelectContext.OrderBy>} */
  this.orderBy;

  /** @type {!Array<!lf.schema.Column>} */
  this.groupBy;

  /** @type {!lf.Binder} */
  this.limitBinder;

  /** @type {!lf.Binder} */
  this.skipBinder;

  /** @type {?lf.structs.Set<number>} */
  this.outerJoinPredicates;
};
goog.inherits(lf.query.SelectContext, lf.query.Context);


/**
 * @typedef {{
 *     column: !lf.schema.Column,
 *     order: !lf.Order}}
 */
lf.query.SelectContext.OrderBy;


/**
 * @param {!Array<!lf.query.SelectContext.OrderBy>} orderBy
 * @return {string} A text representation of OrderBy instances, useful for
 *     testing.
 */
lf.query.SelectContext.orderByToString = function(orderBy) {
  var out = '';
  orderBy.forEach(function(orderByEl, index) {
    out += orderByEl.column.getNormalizedName() + ' ';
    out += orderByEl.order == lf.Order.ASC ? 'ASC' : 'DESC';
    if (index < orderBy.length - 1) {
      out += ', ';
    }
  });

  return out;
};


/** @override */
lf.query.SelectContext.prototype.getScope = function() {
  return lf.structs.set.create(this.from);
};


/** @override */
lf.query.SelectContext.prototype.clone = function() {
  var context = new lf.query.SelectContext(this.schema);
  context.cloneBase(this);
  if (this.columns) {
    context.columns = this.columns.slice();
  }
  if (this.from) {
    context.from = this.from.slice();
  }
  context.limit = this.limit;
  context.skip = this.skip;
  if (this.orderBy) {
    context.orderBy = this.orderBy.slice();
  }
  if (this.groupBy) {
    context.groupBy = this.groupBy.slice();
  }
  if (this.limitBinder) {
    context.limitBinder = this.limitBinder;
  }
  if (this.skipBinder) {
    context.skipBinder = this.skipBinder;
  }
  context.outerJoinPredicates = this.outerJoinPredicates;
  return context;
};


/** @override */
lf.query.SelectContext.prototype.bind = function(values) {
  lf.query.SelectContext.base(this, 'bind', values);

  if (goog.isDefAndNotNull(this.limitBinder)) {
    this.limit = /** @type {number} */ (values[this.limitBinder.getIndex()]);
  }
  if (goog.isDefAndNotNull(this.skipBinder)) {
    this.skip = /** @type {number} */ (values[this.skipBinder.getIndex()]);
  }
  this.bindValuesInSearchCondition(values);
  return this;
};
