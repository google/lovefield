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
goog.provide('lf.fn.AggregatedColumn');
goog.provide('lf.fn.StarColumn');

goog.require('lf.Type');
goog.require('lf.schema.Column');
goog.require('lf.schema.Table');



/**
 * @implements {lf.schema.Column}
 * @constructor
 * @struct
 *
 * @param {!lf.schema.Column} col The column to be aggregated.
 * @param {!lf.fn.Type} aggregatorType The type of the aggregation.
 */
lf.fn.AggregatedColumn = function(col, aggregatorType) {
  /** @type {!lf.schema.Column} */
  this.child = col;

  /** @type {lf.fn.Type} */
  this.aggregatorType = aggregatorType;

  /** @private {?string} */
  this.alias_ = null;
};


/** @override */
lf.fn.AggregatedColumn.prototype.getName = function() {
  return this.aggregatorType + '(' + this.child.getName() + ')';
};


/** @override */
lf.fn.AggregatedColumn.prototype.getNormalizedName = function() {
  return this.aggregatorType + '(' + this.child.getNormalizedName() + ')';
};


/** @override */
lf.fn.AggregatedColumn.prototype.getTable = function() {
  return this.child.getTable();
};


/** @override */
lf.fn.AggregatedColumn.prototype.toString = function() {
  return this.getNormalizedName();
};


/** @override */
lf.fn.AggregatedColumn.prototype.getType = function() {
  return this.child.getType();
};


/** @override */
lf.fn.AggregatedColumn.prototype.getAlias = function() {
  return this.alias_;
};


/** @override */
lf.fn.AggregatedColumn.prototype.getIndices = function() {
  return [];
};


/** @override */
lf.fn.AggregatedColumn.prototype.getIndex = function() {
  return null;
};


/** @override */
lf.fn.AggregatedColumn.prototype.isNullable = function() {
  return false;
};


/**
 * @export
 * @param {string} name
 * @return {!lf.fn.AggregatedColumn}
 */
lf.fn.AggregatedColumn.prototype.as = function(name) {
  this.alias_ = name;
  return this;
};


/**
 * @return {!Array<!lf.schema.Column>} The chain of columns that starts from
 *     this column. All columns are of type AggregatedColumn except for the last
 *     column.
 */
lf.fn.AggregatedColumn.prototype.getColumnChain = function() {
  var columnChain = [this];
  var currentColumn = this;
  while (currentColumn instanceof lf.fn.AggregatedColumn) {
    columnChain.push(currentColumn.child);
    currentColumn = currentColumn.child;
  }
  return columnChain;
};



/**
 * A dummy lf.schema.Column implementation to be used as a substitute for '*',
 * for example in COUNT(*).
 * @implements {lf.schema.Column}
 * @constructor
 * @struct
 *
 * @param {string=} opt_alias Alias of this column.
 */
lf.fn.StarColumn = function(opt_alias) {
  /** @private {?string} */
  this.alias_ = opt_alias || null;

  /** @private {!lf.schema.Table} */
  this.table_ = new lf.schema.Table('#UnknownTable', [], [], false);
};


/** @override */
lf.fn.StarColumn.prototype.getName = function() {
  return '*';
};


/** @override */
lf.fn.StarColumn.prototype.getNormalizedName = function() {
  return this.getName();
};


/** @override */
lf.fn.StarColumn.prototype.toString = function() {
  return this.getNormalizedName();
};


/** @override */
lf.fn.StarColumn.prototype.getTable = function() {
  // NOTE: The table here does not have a useful meaning, since the StarColumn
  // represents all columns that are available, which could be the result of a
  // join, therefore a dummy Table instance is used.
  return this.table_;
};


/** @override */
lf.fn.StarColumn.prototype.getType = function() {
  // NOTE: The type here does not have a useful meaning, since the notion of a
  // type does not apply to a collection of all columns (which is what this
  // class represents).
  return lf.Type.NUMBER;
};


/** @override */
lf.fn.StarColumn.prototype.getAlias = function() {
  return this.alias_;
};


/** @override */
lf.fn.StarColumn.prototype.getIndices = function() {
  return [];
};


/** @override */
lf.fn.StarColumn.prototype.getIndex = function() {
  return null;
};


/** @override */
lf.fn.StarColumn.prototype.isNullable = function() {
  return false;
};
