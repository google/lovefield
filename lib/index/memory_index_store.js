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
goog.provide('lf.index.MemoryIndexStore');

goog.require('goog.Promise');
goog.require('goog.structs.Map');
goog.require('lf.index.AATree');
goog.require('lf.index.IndexStore');
goog.require('lf.index.Map');
goog.require('lf.index.RowId');



/**
 * In-memory index store that builds all indices at the time of init.
 * @implements {lf.index.IndexStore}
 * @constructor @struct
 */
lf.index.MemoryIndexStore = function() {
  /** @private {!goog.structs.Map.<string, lf.index.Index>} */
  this.store_ = new goog.structs.Map();
};


/** @override */
lf.index.MemoryIndexStore.prototype.init = function(schema) {
  var tables = schema.getTables();

  tables.forEach(function(table) {
    this.getRowIdIndex(table.getName());  // Setup default row id index.
    table.getIndices().forEach(function(indexSchema) {
      var indexName = indexSchema.getNormalizedName();
      var index = indexSchema.isUnique ?
          new lf.index.AATree(indexName) :
          new lf.index.Map(indexName);
      this.store_.set(indexSchema.getNormalizedName(), index);
    }, this);
  }, this);

  return goog.Promise.resolve();
};


/** @override */
lf.index.MemoryIndexStore.prototype.get = function(name) {
  return this.store_.get(name, null);
};


/** @override */
lf.index.MemoryIndexStore.prototype.getTableIndices = function(tableName) {
  var indices = [];
  var prefix = tableName + '.';
  this.store_.getKeys().forEach(function(key) {
    if (key.indexOf(prefix) != -1) {
      indices.push(this.store_.get(key));
    }
  }, this);
  return indices;
};


/** @override */
lf.index.MemoryIndexStore.prototype.getRowIdIndex = function(tableName) {
  // Row id index is named <tableName>.#, which is an invalid name for JS vars
  // and therefore user-defined indices can never collide with it.
  var indexName = tableName + '.#';
  var index = this.store_.get(indexName, null);
  if (goog.isNull(index)) {
    index = new lf.index.RowId(indexName);
    this.store_.set(indexName, index);
  }
  return index;
};
