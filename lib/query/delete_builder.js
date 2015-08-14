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
goog.provide('lf.query.DeleteBuilder');

goog.require('lf.Exception');
goog.require('lf.query.BaseBuilder');
goog.require('lf.query.Delete');
goog.require('lf.query.DeleteContext');
goog.require('lf.service');



/**
 * @constructor
 * @extends {lf.query.BaseBuilder<!lf.query.DeleteContext>}
 * @implements {lf.query.Delete}
 * @export
 *
 * @param {!lf.Global} global
 */
lf.query.DeleteBuilder = function(global) {
  lf.query.DeleteBuilder.base(
      this, 'constructor', global,
      new lf.query.DeleteContext(global.getService(lf.service.SCHEMA)));
};
goog.inherits(lf.query.DeleteBuilder, lf.query.BaseBuilder);


/** @override @export */
lf.query.DeleteBuilder.prototype.from = function(table) {
  this.assertFromPreconditions_();
  this.query.from = table;

  return this;
};


/** @override @export */
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
    // 515: from() has already been called.
    throw new lf.Exception(515);
  }
};


/**
 * Asserts whether the preconditions for calling the where() method are met.
 * @private
 */
lf.query.DeleteBuilder.prototype.assertWherePreconditions_ = function() {
  if (!goog.isDefAndNotNull(this.query.from)) {
    // 548: from() has to be called before where().
    throw new lf.Exception(548);
  }
  if (goog.isDefAndNotNull(this.query.where)) {
    // 516: where() has already been called.
    throw new lf.Exception(516);
  }
};


/** @override */
lf.query.DeleteBuilder.prototype.assertExecPreconditions = function() {
  lf.query.DeleteBuilder.base(this, 'assertExecPreconditions');
  if (!goog.isDefAndNotNull(this.query.from)) {
    // 517: Invalid usage of delete().
    throw new lf.Exception(517);
  }
};
