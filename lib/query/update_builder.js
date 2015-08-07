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
goog.provide('lf.query.UpdateBuilder');

goog.require('lf.Binder');
goog.require('lf.Exception');
goog.require('lf.query.BaseBuilder');
goog.require('lf.query.Update');
goog.require('lf.query.UpdateContext');
goog.require('lf.service');



/**
 * @constructor
 * @extends {lf.query.BaseBuilder<!lf.query.UpdateContext>}
 * @implements {lf.query.Update}
 * @struct
 * @export
 *
 * @param {!lf.Global} global
 * @param {!lf.schema.Table} table
 */
lf.query.UpdateBuilder = function(global, table) {
  lf.query.UpdateBuilder.base(
      this, 'constructor', global,
      new lf.query.UpdateContext(global.getService(lf.service.SCHEMA)));

  this.query.table = table;
};
goog.inherits(lf.query.UpdateBuilder, lf.query.BaseBuilder);


/** @override @export */
lf.query.UpdateBuilder.prototype.set = function(column, value) {
  var set = {
    binding: value instanceof lf.Binder ? value.getIndex() : -1,
    column: column,
    value: value
  };

  if (goog.isDefAndNotNull(this.query.set)) {
    this.query.set.push(set);
  } else {
    this.query.set = [set];
  }
  return this;
};


/** @override @export */
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
    // 516: where() has already been called.
    throw new lf.Exception(516);
  }
};


/** @override */
lf.query.UpdateBuilder.prototype.assertExecPreconditions = function() {
  lf.query.UpdateBuilder.base(this, 'assertExecPreconditions');

  if (!goog.isDefAndNotNull(this.query.set)) {
    // 532: Invalid usage of update().
    throw new lf.Exception(532);
  }

  var notBound = this.query.set.some(function(set) {
    return set.value instanceof lf.Binder;
  });
  if (notBound) {
    // 501: Value is not bounded.
    throw new lf.Exception(501);
  }
};
