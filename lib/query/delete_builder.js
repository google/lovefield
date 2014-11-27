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
goog.provide('lf.query.DeleteBuilder');

goog.require('lf.Exception');
goog.require('lf.query.BaseBuilder');
goog.require('lf.query.Delete');
goog.require('lf.query.DeleteContext');



/**
 * @constructor
 * @extends {lf.query.BaseBuilder.<!lf.query.DeleteContext>}
 * @implements {lf.query.Delete}
 *
 * @param {!lf.Global} global
 */
lf.query.DeleteBuilder = function(global) {
  lf.query.DeleteBuilder.base(this, 'constructor', global);

  this.query = new lf.query.DeleteContext();
};
goog.inherits(lf.query.DeleteBuilder, lf.query.BaseBuilder);


/** @override */
lf.query.DeleteBuilder.prototype.from = function(table) {
  this.assertFromPreconditions_();
  this.query.from = table;

  return this;
};


/** @override */
lf.query.DeleteBuilder.prototype.where = function(predicate) {
  this.assertWherePreconditions_();
  this.query.where = predicate;

  return this;
};


/**
 * Asserts whether the preconditions for calling the from() method are met.
 * @private
 */
lf.query.DeleteBuilder.prototype.assertFromPreconditions_ = function() {
  if (goog.isDefAndNotNull(this.query.from)) {
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX,
        'from() has already been called.');
  }
};


/**
 * Asserts whether the preconditions for calling the where() method are met.
 * @private
 */
lf.query.DeleteBuilder.prototype.assertWherePreconditions_ = function() {
  if (goog.isDefAndNotNull(this.query.where)) {
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX,
        'where() has already been called.');
  }
};


/** @override */
lf.query.DeleteBuilder.prototype.assertExecPreconditions = function() {
  lf.query.DeleteBuilder.base(this, 'assertExecPreconditions');
  if (!goog.isDefAndNotNull(this.query.from)) {
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX,
        'Invalid usage of delete()');
  }
};


/** @override */
lf.query.DeleteBuilder.prototype.bind = function(values) {
  lf.query.BaseBuilder.bindValuesInSearchCondition(this.query, values);
  return this;
};
