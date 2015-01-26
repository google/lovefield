/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
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
goog.provide('lf.schema');
goog.provide('lf.schema.Builder');

goog.require('goog.structs.Map');
goog.require('lf.Exception');
goog.require('lf.schema.Database');
goog.require('lf.schema.TableBuilder');



/**
 * Dynamic DB schema builder.
 * @implements {lf.schema.Database}
 * @constructor
 *
 * @param {string} dbName
 * @param {number} dbVersion
 */
lf.schema.Builder = function(dbName, dbVersion) {
  /** @private {string} */
  this.name_ = dbName;

  /** @private {number} */
  this.version_ = dbVersion;

  /** @private {!goog.structs.Map.<string, !lf.schema.TableBuilder>} */
  this.tableBuilders_ = new goog.structs.Map();

  /** @private {boolean} */
  this.finalized_ = false;

  /** @private {!goog.structs.Map.<string, !lf.schema.Table>} */
  this.tables_ = new goog.structs.Map();
};


/** @override */
lf.schema.Builder.prototype.name = function() {
  return this.name_;
};


/** @override */
lf.schema.Builder.prototype.version = function() {
  return this.version_;
};


/** @override */
lf.schema.Builder.prototype.tables = function() {
  if (!this.finalized_) {
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX,
        'Attempt to getTables before getSchema is invoked');
  }
  return this.tables_.getValues();
};


/** @override */
lf.schema.Builder.prototype.table = function(tableName) {
  if (!this.tables_.containsKey(tableName)) {
    throw new lf.Exception(
        lf.Exception.Type.NOT_FOUND,
        tableName + ' is not found in database');
  }
  return this.tables_.get(tableName);
};


/** @return {!lf.schema.Database} */
lf.schema.Builder.prototype.getSchema = function() {
  this.tableBuilders_.getKeys().forEach(function(tableName) {
    var builder = this.tableBuilders_.get(tableName);
    this.tables_.set(tableName, builder.getSchema());
  }, this);
  this.tableBuilders_.clear();
  this.finalized_ = true;
  return this;
};


/**
 * @param {string} tableName
 * @return {!lf.schema.TableBuilder}
 */
lf.schema.Builder.prototype.createTable = function(tableName) {
  if (this.tableBuilders_.containsKey(tableName) || this.finalized_) {
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX,
        'Table is already created or schema is already finalized.');
  }
  this.tableBuilders_.set(tableName, new lf.schema.TableBuilder(tableName));
  return this.tableBuilders_.get(tableName);
};


/**
 * Global helper to create schema builder.
 * @param {string} dbName
 * @param {number} dbVersion
 * @return {!lf.schema.Builder}
 * @export
 */
lf.schema.create = function(dbName, dbVersion) {
  return new lf.schema.Builder(dbName, dbVersion);
};
