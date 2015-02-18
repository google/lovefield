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
goog.provide('lf.schema.BaseColumn');

goog.require('lf.PredicateProvider');
goog.require('lf.eval.Type');
goog.require('lf.pred');
goog.require('lf.schema.Column');



/**
 * @template T
 * @implements {lf.schema.Column}
 * @implements {lf.PredicateProvider.<T>}
 * @constructor
 * @struct
 *
 * @param {!lf.schema.Table} table The table where this column belongs.
 * @param {string} name The name of this column.
 * @param {boolean} isUnique The values in this column is unique.
 * @param {!lf.Type} type The type of the data held by this column.
 * @param {string=} opt_alias Alias of this column.
 */
lf.schema.BaseColumn = function(table, name, isUnique, type, opt_alias) {
  /** @private {!lf.schema.Table} */
  this.table_ = table;

  /** @private {string} */
  this.name_ = name;

  /** @private {boolean} */
  this.isUnique_ = isUnique;

  /** @private {!lf.Type} */
  this.type_ = type;

  /** @private {!Array.<!lf.schema.Index>} */
  this.indices_;

  /** @private {?string} */
  this.alias_ = opt_alias || null;
};


/** @override */
lf.schema.BaseColumn.prototype.getName = function() {
  return this.name_;
};


/** @override */
lf.schema.BaseColumn.prototype.getNormalizedName = function() {
  return this.table_.getEffectiveName() + '.' + this.name_;
};


/** @override */
lf.schema.BaseColumn.prototype.toString = function() {
  return this.getNormalizedName();
};


/** @override */
lf.schema.BaseColumn.prototype.getTable = function() {
  return this.table_;
};


/** @override */
lf.schema.BaseColumn.prototype.getType = function() {
  return this.type_;
};


/** @override */
lf.schema.BaseColumn.prototype.getAlias = function() {
  return this.alias_;
};


/** @return {!Array.<!lf.schema.Index>} */
lf.schema.BaseColumn.prototype.getIndices = function() {
  if (!goog.isDefAndNotNull(this.indices_)) {
    this.indices_ = [];
    this.getTable().getIndices().forEach(
        function(index) {
          var colNames = index.columns.map(function(col) {
            return col.name;
          });
          if (colNames.indexOf(this.name_) != -1) {
            this.indices_.push(index);
          }
        }, this);
  }

  return this.indices_;
};


/** @return {boolean} */
lf.schema.BaseColumn.prototype.isUnique = function() {
  return this.isUnique_;
};


/** @override @export */
lf.schema.BaseColumn.prototype.eq = function(operand) {
  return lf.pred.createPredicate(this, operand, lf.eval.Type.EQ);
};


/** @override @export */
lf.schema.BaseColumn.prototype.neq = function(operand) {
  return lf.pred.createPredicate(this, operand, lf.eval.Type.NEQ);
};


/** @override @export */
lf.schema.BaseColumn.prototype.lt = function(operand) {
  return lf.pred.createPredicate(this, operand, lf.eval.Type.LT);
};


/** @override @export */
lf.schema.BaseColumn.prototype.lte = function(operand) {
  return lf.pred.createPredicate(this, operand, lf.eval.Type.LTE);
};


/** @override @export */
lf.schema.BaseColumn.prototype.gt = function(operand) {
  return lf.pred.createPredicate(this, operand, lf.eval.Type.GT);
};


/** @override @export */
lf.schema.BaseColumn.prototype.gte = function(operand) {
  return lf.pred.createPredicate(this, operand, lf.eval.Type.GTE);
};


/** @override @export */
lf.schema.BaseColumn.prototype.match = function(regex) {
  return lf.pred.createPredicate(this, regex, lf.eval.Type.MATCH);
};


/** @override @export */
lf.schema.BaseColumn.prototype.between = function(from, to) {
  return lf.pred.createPredicate(this, [from, to], lf.eval.Type.BETWEEN);
};


/** @override @export */
lf.schema.BaseColumn.prototype.in = function(values) {
  return lf.pred.createPredicate(this, values, lf.eval.Type.IN);
};


/** @override @export */
lf.schema.BaseColumn.prototype.isNull = function() {
  return this.eq(null);
};


/** @override @export */
lf.schema.BaseColumn.prototype.isNotNull = function() {
  return this.neq(null);
};


/**
 * @export
 * @param {string} name
 * @return {!lf.schema.BaseColumn}
 */
lf.schema.BaseColumn.prototype.as = function(name) {
  return new lf.schema.BaseColumn(
      this.table_, this.name_, this.isUnique_, this.type_, name);
};
