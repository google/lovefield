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
goog.provide('lf.cache.InMemoryUpdater');

goog.require('lf.index.Favor');
goog.require('lf.service');



/**
 * A helper class for updating in-memory data structures (specifically in-memory
 * indices and caches).
 * @constructor
 *
 * @param {!lf.Global} global
 */
lf.cache.InMemoryUpdater = function(global) {
  /** @private {!lf.cache.Cache} */
  this.cache_ = global.getService(lf.service.CACHE);

  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = global.getService(lf.service.INDEX_STORE);

  this.schema_ = global.getService(lf.service.SCHEMA);
};


/**
 * Updates all indices and the cache to reflect the changes that are described
 * in the given diffs.
 * @param {!Array<!lf.cache.TableDiff>} tableDiffs Description of the changes to
 *     be performed.
 */
lf.cache.InMemoryUpdater.prototype.update = function(tableDiffs) {
  tableDiffs.forEach(
      function(tableDiff) {
        this.updateIndicesForDiff_(tableDiff);
        this.updateCacheForDiff_(tableDiff);
      }, this);
};


/**
 * Updates the cache based on the given table diff.
 * @param {!lf.cache.TableDiff} diff
 * @private
 */
lf.cache.InMemoryUpdater.prototype.updateCacheForDiff_ = function(diff) {
  var tableName = diff.getName();
  diff.getDeleted().getValues().forEach(
      function(row) {
        this.cache_.remove(tableName, [row.id()]);
      }, this);
  diff.getAdded().forEach(
      function(row, rowId) {
        this.cache_.set(tableName, [row]);
      }, this);
  diff.getModified().forEach(
      function(modification, rowId) {
        this.cache_.set(tableName, [modification[1]]);
      }, this);
};


/**
 * Updates index data structures based on the given table diff.
 * @param {!lf.cache.TableDiff} diff
 * @private
 */
lf.cache.InMemoryUpdater.prototype.updateIndicesForDiff_ = function(diff) {
  var table = this.schema_.table(diff.getName());
  var modifications = diff.getAsModifications();
  modifications.forEach(
      function(modification) {
        this.updateTableIndicesForRow(table, modification);
      }, this);
};


/**
 * Updates all indices that are affefted as a result of the given modification.
 * In the case where an exception is thrown (constraint violation) all the
 * indices are unaffected.
 *
 * @param {!lf.schema.Table} table The table to be updated.
 * @param {!Array<?lf.Row>} modification An array of exactly two elements where
 *     position 0 is the value before the modification and position 1 is after
 *     the modification. A value of null means that the row was either just
 *     created or just deleted.
 * @throws {!lf.Exception}
 */
lf.cache.InMemoryUpdater.prototype.updateTableIndicesForRow = function(
    table, modification) {
  /** @type {!Array<!lf.index.Index>} */
  var indices = table.getIndices().map(
      /**
       * @param {!lf.schema.Index} indexSchema
       * @this {!lf.cache.InMemoryUpdater}
       */
      function(indexSchema) {
        return this.indexStore_.get(indexSchema.getNormalizedName());
      }, this).concat([this.indexStore_.get(table.getRowIdIndexName())]);

  indices.forEach(
      /** @param {!lf.index.Index} index */
      function(index) {
        var keyNow = goog.isNull(modification[1]) ? null :
            modification[1].keyOfIndex(index.getName());
        var keyThen = goog.isNull(modification[0]) ? null :
            modification[0].keyOfIndex(index.getName());

        if (goog.isNull(keyThen) && !goog.isNull(keyNow)) {
          // Insertion
          index.add(keyNow, modification[1].id());
        } else if (!goog.isNull(keyThen) && !goog.isNull(keyNow)) {
          if (index.comparator().compare(keyThen, keyNow) ==
              lf.index.Favor.TIE) {
            return;
          }

          // Update
          // NOTE: the order of calling add() and remove() here matters.
          // Index#add() might throw an exception because of a constraint
          // violation, in which case the index remains unaffected as expected.
          index.add(keyNow, modification[1].id());
          index.remove(keyThen, modification[0].id());
        } else if (!goog.isNull(keyThen) && goog.isNull(keyNow)) {
          // Deletion
          index.remove(keyThen, modification[0].id());
        }
      });
};
