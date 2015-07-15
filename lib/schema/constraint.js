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

goog.forwardDeclare('lf.schema.ForeignKeySpec');



/**
 * @constructor @struct
 * @export
 *
 * @param {?lf.schema.Index} primaryKey
 * @param {!Array<!lf.schema.Column>} notNullable
 * @param {!Array<!lf.schema.ForeignKeySpec>} foreignKeys
 */
lf.schema.Constraint = function(primaryKey, notNullable, foreignKeys) {
  /** @private {?lf.schema.Index} */
  this.primaryKey_ = primaryKey;

  /** @private {!Array<!lf.schema.Column>} */
  this.notNullable_ = notNullable;

  /** @private {!Array<!lf.schema.ForeignKeySpec>} */
  this.foreignKeys_ = foreignKeys;
};


/**
 * @return {?lf.schema.Index}
 * @export
 */
lf.schema.Constraint.prototype.getPrimaryKey = function() {
  return this.primaryKey_;
};


/** @return {!Array<!lf.schema.Column>} */
lf.schema.Constraint.prototype.getNotNullable = function() {
  return this.notNullable_;
};


/**
 * @return {!Array<!lf.schema.ForeignKeySpec>}
 * @export
 */
lf.schema.Constraint.prototype.getForeignKeys = function() {
  return this.foreignKeys_;
};
