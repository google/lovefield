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
goog.require('lf.index.BTree');
goog.require('lf.index.ComparatorFactory');
goog.require('lf.index.IndexStore');
goog.require('lf.index.NullableIndex');
goog.require('lf.index.RowId');



/**
 * In-memory index store that builds all indices at the time of init.
 * @implements {lf.index.IndexStore}
 * @constructor @struct
 */
lf.index.MemoryIndexStore = function() {
  /** @private {!goog.structs.Map<string, lf.index.Index>} */
  this.store_ = new goog.structs.Map();
};


/** @override */
lf.index.MemoryIndexStore.prototype.init = function(schema) {
  var tables = schema.tables();

  tables.forEach(function(table) {
    var rowIdIndexName = table.getRowIdIndexName();
    var rowIdIndex = this.get(rowIdIndexName);
    if (goog.isNull(rowIdIndex)) {
      var index = new lf.index.RowId(rowIdIndexName);
      this.store_.set(rowIdIndexName, index);
    }
    table.getIndices().forEach(
        /**
         * @param {!lf.schema.Index} indexSchema
         * @this {lf.index.MemoryIndexStore}
         */
        function(indexSchema) {
          this.store_.set(
              indexSchema.getNormalizedName(),
              lf.index.MemoryIndexStore.createIndex_(indexSchema));
        }, this);
  }, this);

  return goog.Promise.resolve();
};


/**
 * @param {!lf.schema.Index} indexSchema
 * @return {!lf.index.Index}
 * @private
 */
lf.index.MemoryIndexStore.createIndex_ = function(indexSchema) {
  var comparator = lf.index.ComparatorFactory.create(indexSchema);
  var index = new lf.index.BTree(
      indexSchema.getNormalizedName(),
      comparator,
      indexSchema.isUnique);

  return indexSchema.hasNullableColumn() ?
      new lf.index.NullableIndex(index) : index;
};


/** @override */
lf.index.MemoryIndexStore.prototype.get = function(name) {
  return this.store_.get(name, null);
};


/** @override */
lf.index.MemoryIndexStore.prototype.set = function(index) {
  return this.store_.set(index.getName(), index);
};


/** @override */
lf.index.MemoryIndexStore.prototype.getTableIndices = function(tableName) {
  var indices = [];
  var prefix = tableName + '.';
  this.store_.getKeys().forEach(function(key) {
    if (key.indexOf(prefix) == 0) {
      indices.push(this.store_.get(key));
    }
  }, this);
  return indices;
};
