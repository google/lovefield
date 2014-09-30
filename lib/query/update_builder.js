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
goog.provide('lf.query.UpdateBuilder');

goog.require('lf.Exception');
goog.require('lf.query.QueryBuilder');
goog.require('lf.query.Update');
goog.require('lf.query.UpdateContext');



/**
 * @constructor
 * @extends {lf.query.QueryBuilder}
 * @implements {lf.query.Update}
 * @struct
 *
 * @param {!lf.schema.Table} table
 */
lf.query.UpdateBuilder = function(table) {
  lf.query.UpdateBuilder.base(this, 'constructor');

  this.query = new lf.query.UpdateContext();
  this.query.table = table;
};
goog.inherits(lf.query.UpdateBuilder, lf.query.QueryBuilder);


/** @override */
lf.query.UpdateBuilder.prototype.set = function(column, value) {
  if (!goog.isDefAndNotNull(this.query.set)) {
    this.query.set = [];
  }

  this.query.set.push({
    column: column,
    value: value
  });

  return this;
};


/** @override */
lf.query.UpdateBuilder.prototype.where = function(predicate) {
  this.assertWherePreconditions_();
  this.query.where = predicate;

  return this;
};


/**
 * Asserts whether the preconditions for calling the where() method are met.
 * @private
 */
lf.query.UpdateBuilder.prototype.assertWherePreconditions_ = function() {
  if (goog.isDefAndNotNull(this.query.where)) {
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX,
        'where() has already been called.');
  }
};


/** @override */
lf.query.UpdateBuilder.prototype.assertExecPreconditions = function() {
  lf.query.UpdateBuilder.base(this, 'assertExecPreconditions');
  if (!goog.isDefAndNotNull(this.query.set)) {
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX,
        'Invalid usage of update()');
  }
};
