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
goog.provide('lf.schema.Constraint');



/**
 * @constructor

 * @param {?lf.schema.Index} primaryKey
 * @param {!Array<!lf.schema.Column>} notNullable
 * @param {!Array<!lf.schema.Index>} foreignKeys
 * @param {!Array<!lf.schema.Index>} unique
 */
lf.schema.Constraint = function(
    primaryKey, notNullable, foreignKeys, unique) {
  /** @private {?lf.schema.Index} */
  this.primaryKey_ = primaryKey;

  /** @private {!Array<!lf.schema.Column>} */
  this.notNullable_ = notNullable;

  /** @private {!Array<!lf.schema.Index>} */
  this.foreignKeys_ = foreignKeys;

  /** @private {!Array<!lf.schema.Index>} */
  this.unique_ = unique;
};


/** @return {?lf.schema.Index} */
lf.schema.Constraint.prototype.getPrimaryKey = function() {
  return this.primaryKey_;
};


/** @return {!Array<!lf.schema.Column>} */
lf.schema.Constraint.prototype.getNotNullable = function() {
  return this.notNullable_;
};


/** @return {!Array<!lf.schema.Index>} */
lf.schema.Constraint.prototype.getForeignKeys = function() {
  return this.foreignKeys_;
};


/** @return {!Array<!lf.schema.Index>} */
lf.schema.Constraint.prototype.getUnique = function() {
  return this.unique_;
};
