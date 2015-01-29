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
goog.provide('lf.fn.AggregatedColumn');

goog.require('lf.schema.Column');



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
 * @return {!Array.<!lf.schema.Column>} The chain of Column instances that
 *     starts from this Column.
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
