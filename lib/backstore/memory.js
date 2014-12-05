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
goog.provide('lf.backstore.Memory');

goog.require('goog.Promise');
goog.require('goog.structs.Map');
goog.require('lf.BackStore');
goog.require('lf.Exception');
goog.require('lf.backstore.MemoryTable');
goog.require('lf.backstore.MemoryTx');



/**
 * A backing store implementation that holds all data in-memory, without
 * persisting anything to disk.
 * @implements {lf.BackStore}
 * @constructor
 *
 * @param {!lf.schema.Database} schema The schema of the database.
 */
lf.backstore.Memory = function(schema) {
  /** @private {!lf.schema.Database} */
  this.schema_ = schema;

  /** @private {!goog.structs.Map.<string, !lf.backstore.MemoryTable>} */
  this.tables_ = new goog.structs.Map();
};


/** @override */
lf.backstore.Memory.prototype.init = function(opt_onUpgrade) {
  this.schema_.getTables().forEach(this.initTable_, this);
  return goog.Promise.resolve();
};


/**
 * @param {string} tableName The name of the table to get. Throws an exception
 *     if such a table does not exist.
 * @return {!lf.Stream}
 * @throws {lf.Exception}
 */
lf.backstore.Memory.prototype.getTableInternal = function(tableName) {
  var table = this.tables_.get(tableName, null);
  if (goog.isNull(table)) {
    throw new lf.Exception(
        lf.Exception.Type.DATA,
        'Table ' + tableName + ' does not exist.');
  }

  return table;
};


/** @override */
lf.backstore.Memory.prototype.createTx = function(
    mode, journal) {
  return new lf.backstore.MemoryTx(this, mode, journal);
};


/**
 * Creates a new empty table in the database. It is a no-op if a table with the
 * given name already exists.
 * @param {string} tableName The name of the new table.
 * @private
 */
lf.backstore.Memory.prototype.createTable_ = function(tableName) {
  if (!this.tables_.containsKey(tableName)) {
    this.tables_.set(tableName, new lf.backstore.MemoryTable());
  }
};


/**
 * Creates all backing store tables for the given user-defined table.
 * @param {!lf.schema.Table} tableSchema The table schema.
 * @private
 */
lf.backstore.Memory.prototype.initTable_ = function(tableSchema) {
  this.createTable_(tableSchema.getName());

  if (tableSchema.persistentIndex()) {
    var tableIndices = tableSchema.getIndices();
    tableIndices.forEach(
        /**
         * @param {!lf.schema.Index} indexSchema
         * @this {lf.backstore.Memory}
         */
        function(indexSchema) {
          this.createTable_(indexSchema.getNormalizedName());
        }, this);
  }
};


/** @override */
lf.backstore.Memory.prototype.close = function() {
};
