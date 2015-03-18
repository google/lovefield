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
goog.provide('lf.cache.Prefetcher');

goog.require('goog.Promise');
goog.require('goog.asserts');
goog.require('lf.Row');
goog.require('lf.TransactionType');
goog.require('lf.backstore.TableType');
goog.require('lf.cache.Journal');
goog.require('lf.index.BTree');
goog.require('lf.index.ComparatorFactory');
goog.require('lf.index.IndexMetadata');
goog.require('lf.index.NullableIndex');
goog.require('lf.index.RowId');
goog.require('lf.service');



/**
 * Prefetcher fetches rows from database into cache and build indices.
 * @constructor
 * @struct
 * @final
 *
 * @param {!lf.Global} global
 */
lf.cache.Prefetcher = function(global) {
  /** @private {!lf.Global} */
  this.global_ = global;

  /** @private {!lf.BackStore} */
  this.backStore_ = global.getService(lf.service.BACK_STORE);

  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = global.getService(lf.service.INDEX_STORE);

  /** @private {!lf.cache.Cache} */
  this.cache_ = global.getService(lf.service.CACHE);
};


/**
 * Performs the prefetch.
 * @param {!lf.schema.Database} schema
 * @return {!IThenable}
 */
lf.cache.Prefetcher.prototype.init = function(schema) {
  // Sequentially load tables
  var tables = schema.tables();
  var execSequentially = goog.bind(function() {
    if (tables.length == 0) {
      return goog.Promise.resolve();
    }

    var table = tables.shift();
    var whenTableFetched = table.persistentIndex() ?
        this.fetchTableWithPersistentIndices_(table) :
        this.fetchTable_(table);
    return whenTableFetched.then(execSequentially);
  }, this);

  return execSequentially();
};


/**
 * Fetches contents of a table into cache, and reconstructs the indices from
 * scratch.
 * @param {!lf.schema.Table} table
 * @return {!IThenable}
 * @private
 */
lf.cache.Prefetcher.prototype.fetchTable_ = function(table) {
  var journal = new lf.cache.Journal(this.global_, [table]);
  var tx = this.backStore_.createTx(
      lf.TransactionType.READ_ONLY, journal);
  var store = tx.getTable(
      table.getName(), goog.bind(table.deserializeRow, table));
  return store.get([]).then(goog.bind(function(results) {
    this.cache_.set(table.getName(), results);
    this.reconstructNonPersistentIndices_(table, results);
  }, this));
};


/**
 * Reconstructs a table's indices by populating them from scratch.
 * @param {!lf.schema.Table} tableSchema The schema of the table.
 * @param {!Array<!lf.Row>} tableRows The table's contents.
 * @private
 */
lf.cache.Prefetcher.prototype.reconstructNonPersistentIndices_ = function(
    tableSchema, tableRows) {
  var indices = this.indexStore_.getTableIndices(tableSchema.getName());
  tableRows.forEach(function(row) {
    indices.forEach(function(index) {
      var key = /** @type {!lf.index.Index.Key} */ (
          row.keyOfIndex(index.getName()));
      index.add(key, row.id());
    });
  });
};


/**
 * Fetches contents of a table with persistent indices into cache, and
 * reconstructs the indices from disk.
 * @param {!lf.schema.Table} tableSchema
 * @return {!IThenable}
 * @private
 */
lf.cache.Prefetcher.prototype.fetchTableWithPersistentIndices_ = function(
    tableSchema) {
  var journal = new lf.cache.Journal(this.global_, [tableSchema]);
  var tx = this.backStore_.createTx(
      lf.TransactionType.READ_ONLY, journal);

  var store = tx.getTable(tableSchema.getName(), tableSchema.deserializeRow);
  var whenTableContentsFetched = store.get([]).then(goog.bind(
      function(results) {
        this.cache_.set(tableSchema.getName(), results);
      }, this));

  var whenIndicesReconstructed = tableSchema.getIndices().map(
      /**
       * @param {!lf.schema.Index} indexSchema
       * @return {!IThenable}
       * @this {lf.cache.Prefetcher}
       */
      function(indexSchema) {
        return this.reconstructPersistentIndex_(indexSchema, tx);
      }, this).concat(this.reconstructPersistentRowIdIndex_(tableSchema, tx));

  return goog.Promise.all(
      whenIndicesReconstructed.concat(whenTableContentsFetched));
};


/**
 * Reconstructs a persistent index by deserializing it from disk.
 * @param {!lf.schema.Index} indexSchema The schema of the index.
 * @param {!lf.backstore.Tx} tx The current transaction.
 * @return {!IThenable} A signal that the index was successfully reconstructed
 *     from disk.
 * @private
 */
lf.cache.Prefetcher.prototype.reconstructPersistentIndex_ = function(
    indexSchema, tx) {
  var indexTable = tx.getTable(
      indexSchema.getNormalizedName(), lf.Row.deserialize,
      lf.backstore.TableType.INDEX);
  var comparator = lf.index.ComparatorFactory.create(indexSchema);
  return indexTable.get([]).then(goog.bind(
      function(serializedRows) {
        goog.asserts.assert(
            serializedRows[0].payload()['type'] ==
                lf.index.IndexMetadata.Type.BTREE);

        // No need to replace the index if there is no index contents.
        if (serializedRows.length > 1) {
          if (indexSchema.hasNullableColumn()) {
            var deserializeFn = lf.index.BTree.deserialize.bind(
                undefined,
                comparator,
                indexSchema.getNormalizedName(),
                indexSchema.isUnique);
            var nullableIndex = lf.index.NullableIndex.deserialize(
                deserializeFn, serializedRows.slice(1));
            this.indexStore_.set(nullableIndex);
          } else {
            var btreeIndex = lf.index.BTree.deserialize(
                comparator,
                indexSchema.getNormalizedName(),
                indexSchema.isUnique,
                serializedRows.slice(1));
            this.indexStore_.set(btreeIndex);
          }
        }
      }, this));
};


/**
 * Reconstructs a persistent RowId index by deserializing it from disk.
 * @param {!lf.schema.Table} tableSchema The schema of the table.
 * @param {!lf.backstore.Tx} tx The current transaction.
 * @return {!IThenable} A signal that the index was successfully reconstructed
 *     from disk.
 * @private
 */
lf.cache.Prefetcher.prototype.reconstructPersistentRowIdIndex_ = function(
    tableSchema, tx) {
  var indexTable = tx.getTable(
      tableSchema.getRowIdIndexName(), lf.Row.deserialize,
      lf.backstore.TableType.INDEX);
  return indexTable.get([]).then(goog.bind(
      function(serializedRows) {
        goog.asserts.assert(
            serializedRows[0].payload()['type'] ==
                lf.index.IndexMetadata.Type.ROW_ID);

        // No need to replace the index if there is no index contents.
        if (serializedRows.length > 1) {
          var rowIdIndex = lf.index.RowId.deserialize(
              tableSchema.getRowIdIndexName(),
              serializedRows.slice(1));
          this.indexStore_.set(rowIdIndex);
        }
      }, this));
};
