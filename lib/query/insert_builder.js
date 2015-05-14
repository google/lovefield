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
goog.provide('lf.query.InsertBuilder');

goog.require('lf.Binder');
goog.require('lf.Exception');
goog.require('lf.query.BaseBuilder');
goog.require('lf.query.Insert');
goog.require('lf.query.InsertContext');



/**
 * @extends {lf.query.BaseBuilder.<!lf.query.InsertContext>}
 * @implements {lf.query.Insert}
 * @struct
 * @constructor
 *
 * @param {!lf.Global} global
 * @param {boolean=} opt_allowReplace Whether the generated query should allow
 *    replacing an existing record.
 */
lf.query.InsertBuilder = function(global, opt_allowReplace) {
  lf.query.InsertBuilder.base(
      this, 'constructor', global, new lf.query.InsertContext());

  this.query.allowReplace = opt_allowReplace || false;
};
goog.inherits(lf.query.InsertBuilder, lf.query.BaseBuilder);


/** @override */
lf.query.InsertBuilder.prototype.assertExecPreconditions = function() {
  lf.query.InsertBuilder.base(this, 'assertExecPreconditions');
  var context = this.query;

  if (!goog.isDefAndNotNull(context.into) ||
      !goog.isDefAndNotNull(context.values)) {
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX,
        'Invalid usage of insert()');
  }

  // "Insert or replace" makes no sense for tables that do not have a primary
  // key.
  if (context.allowReplace &&
      goog.isNull(context.into.getConstraint().getPrimaryKey())) {
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX,
        'Attemted to insert or replace in a table with no primary key.');
  }
};


/** @override */
lf.query.InsertBuilder.prototype.into = function(table) {
  this.assertIntoPreconditions_();
  this.query.into = table;
  return this;
};


/** @override */
lf.query.InsertBuilder.prototype.values = function(rows) {
  this.assertValuesPreconditions_();
  if (rows instanceof lf.Binder ||
      rows.some(function(r) { return r instanceof lf.Binder; })) {
    this.query.binder = rows;
  } else {
    this.query.values = rows;
  }
  return this;
};


/**
 * Asserts whether the preconditions for calling the into() method are met.
 * @private
 */
lf.query.InsertBuilder.prototype.assertIntoPreconditions_ = function() {
  if (goog.isDefAndNotNull(this.query.into)) {
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX,
        'into() has already been called.');
  }
};


/**
 * Asserts whether the preconditions for calling the values() method are met.
 * @private
 */
lf.query.InsertBuilder.prototype.assertValuesPreconditions_ = function() {
  if (goog.isDefAndNotNull(this.query.values)) {
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX,
        'values() has already been called.');
  }
};
