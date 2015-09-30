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
goog.provide('lf.index.MemoryIndexStore');

goog.require('goog.Promise');
goog.require('lf.index.BTree');
goog.require('lf.index.ComparatorFactory');
goog.require('lf.index.IndexStore');
goog.require('lf.index.NullableIndex');
goog.require('lf.index.RowId');
goog.require('lf.structs.map');



/**
 * In-memory index store that builds all indices at the time of init.
 * @implements {lf.index.IndexStore}
 * @constructor @struct
 */
lf.index.MemoryIndexStore = function() {
  /** @private {!lf.structs.Map<string, !lf.index.Index>} */
  this.store_ = lf.structs.map.create();

  /** @private {!lf.structs.Map<string, !Array<!lf.index.Index>>} */
  this.tableIndices_ = lf.structs.map.create();
};


/** @override */
lf.index.MemoryIndexStore.prototype.init = function(schema) {
  var tables = schema.tables();

  tables.forEach(function(table) {
    var tableIndices = [];
    this.tableIndices_.set(table.getName(), tableIndices);

    var rowIdIndexName = table.getRowIdIndexName();
    var rowIdIndex = this.get(rowIdIndexName);
    if (goog.isNull(rowIdIndex)) {
      var index = new lf.index.RowId(rowIdIndexName);
      tableIndices.push(index);
      this.store_.set(rowIdIndexName, index);
    }
    table.getIndices().forEach(
        /**
         * @param {!lf.schema.Index} indexSchema
         * @this {lf.index.MemoryIndexStore}
         */
        function(indexSchema) {
          var index = lf.index.MemoryIndexStore.createIndex_(indexSchema);
          tableIndices.push(index);
          this.store_.set(indexSchema.getNormalizedName(), index);
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

  return (indexSchema.hasNullableColumn() && indexSchema.columns.length == 1) ?
      new lf.index.NullableIndex(index) : index;
};


/** @override */
lf.index.MemoryIndexStore.prototype.get = function(name) {
  return this.store_.get(name) || null;
};


/** @override */
lf.index.MemoryIndexStore.prototype.set = function(tableName, index) {
  var tableIndices = this.tableIndices_.get(tableName) || null;
  if (goog.isNull(tableIndices)) {
    tableIndices = [];
    this.tableIndices_.set(tableName, tableIndices);
  }

  // Replace the index in-place in the array if such index already exists.
  var existsAt = null;
  for (var i = 0; i < tableIndices.length; i++) {
    if (tableIndices[i].getName() == index.getName()) {
      existsAt = i;
      break;
    }
  }

  if (!goog.isNull(existsAt) && tableIndices.length > 0) {
    tableIndices.splice(existsAt, 1, index);
  } else {
    tableIndices.push(index);
  }

  this.store_.set(index.getName(), index);
};


/** @override */
lf.index.MemoryIndexStore.prototype.getTableIndices = function(tableName) {
  return this.tableIndices_.get(tableName) || [];
};
