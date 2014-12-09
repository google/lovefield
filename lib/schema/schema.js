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
goog.provide('lf.schema.Column');
goog.provide('lf.schema.Database');
goog.provide('lf.schema.Index');
goog.provide('lf.schema.Table');

goog.forwardDeclare('lf.Predicate');
goog.forwardDeclare('lf.Row');
goog.forwardDeclare('lf.Type');



/**
 * @interface
 */
lf.schema.Column = function() {};


/** @return {string} */
lf.schema.Column.prototype.getName;


/** @return {string} */
lf.schema.Column.prototype.getNormalizedName;


/** @return {!lf.schema.Table} */
lf.schema.Column.prototype.getTable;


/** @return {!lf.Type} */
lf.schema.Column.prototype.getType;


/** @return {?string} */
lf.schema.Column.prototype.getAlias;



/**
 * Models the return value of Database.getSchema().
 * @interface
 */
lf.schema.Database = function() {};


/** @return {string} */
lf.schema.Database.prototype.getName;


/** @return {number} */
lf.schema.Database.prototype.getVersion;


/** @return {!Array.<!lf.schema.Table>} */
lf.schema.Database.prototype.getTables;



/**
 * @param {string} tableName
 * @param {string} name
 * @param {boolean} isUnique
 * @param {!Array.<string>} columnNames
 * @constructor @struct
 */
lf.schema.Index = function(tableName, name, isUnique, columnNames) {
  /** @type {string} */
  this.tableName = tableName;

  /** @type {string} */
  this.name = name;

  /** @type {boolean} */
  this.isUnique = isUnique;

  /** @type {!Array.<string>} */
  this.columnNames = columnNames;
};


/** @return {string} */
lf.schema.Index.prototype.getNormalizedName = function() {
  return this.tableName + '.' + this.name;
};



/**
 * Models the return value of Database.getSchema().getTable().
 * @param {string} name
 * @param {!Array.<!lf.schema.Column>} cols
 * @param {!Array.<!lf.schema.Index>} indices
 * @param {boolean} persistentIndex
 *
 * @template UserType, StoredType
 * @constructor
 */
lf.schema.Table = function(name, cols, indices, persistentIndex) {
  /** @private */
  this.name_ = name;

  /** @private {!Array.<!lf.schema.Index>} */
  this.indices_ = indices;

  /** @private {!Array.<!lf.schema.Column>} */
  this.columns_ = cols;

  /** @private {boolean} */
  this.persistentIndex_ = persistentIndex;
};


/** @return {string} */
lf.schema.Table.prototype.getName = function() {
  return this.name_;
};


/**
 * @param {UserType=} opt_value
 * @return {!lf.Row.<UserType, StoredType>}
 * @throws {lf.Exception}
 */
lf.schema.Table.prototype.createRow = goog.abstractMethod;


/**
 * @param {{id: number, value: *}} dbRecord
 * @return {!lf.Row.<UserType, StoredType>}
 */
lf.schema.Table.prototype.deserializeRow = goog.abstractMethod;


/** @return {!Array.<!lf.schema.Index>} */
lf.schema.Table.prototype.getIndices = function() {
  return this.indices_;
};


/** @return {!Array.<!lf.schema.Column>} */
lf.schema.Table.prototype.getColumns = function() {
  return this.columns_;
};


/** @return {!lf.schema.Constraint} */
lf.schema.Table.prototype.getConstraint = goog.abstractMethod;


/** @return {boolean} */
lf.schema.Table.prototype.persistentIndex = function() {
  return this.persistentIndex_;
};


/**
 * Row id index is named <tableName>.#, which is an invalid name for JS vars
 * and therefore user-defined indices can never collide with it.
 * @const {string}
 */
lf.schema.Table.ROW_ID_INDEX_PATTERN = '#';


/** @return {string} */
lf.schema.Table.prototype.getRowIdIndexName = function() {
  return this.name_ + '.' + lf.schema.Table.ROW_ID_INDEX_PATTERN;
};
