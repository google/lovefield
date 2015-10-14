/**
 * @license
 * Copyright 2015 The Lovefield Project Authors. All Rights Reserved.
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
 * @constructor @struct
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
  diff.getDeleted().forEach(
      /** @this {!lf.cache.InMemoryUpdater} */
      function(row, rowId) {
        this.cache_.remove(tableName, rowId);
      }, this);
  diff.getAdded().forEach(
      /** @this {!lf.cache.InMemoryUpdater} */
      function(row, rowId) {
        this.cache_.set(tableName, row);
      }, this);
  diff.getModified().forEach(
      /** @this {!lf.cache.InMemoryUpdater} */
      function(modification, rowId) {
        this.cache_.set(tableName, modification[1]);
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
  var indices = this.indexStore_.getTableIndices(table.getName());
  var updatedIndices = 0;
  indices.forEach(
      /** @param {!lf.index.Index} index */
      function(index) {
        try {
          this.updateTableIndexForRow_(index, modification);
          updatedIndices++;
        } catch (e) {
          // Rolling back any indices that were successfully updated, since
          // updateTableIndicesForRow must be atomic.
          indices.slice(0, updatedIndices).forEach(function(index) {
            this.updateTableIndexForRow_(
                index, [modification[1], modification[0]]);
          }, this);

          // Forwarding the exception to the caller.
          throw e;
        }
      }, this);
};


/**
 * Updates a given index to reflect a given row modification.
 * @param {!lf.index.Index} index
 * @param {!Array<?lf.Row>} modification
 * @throws {!lf.Exception}
 * @private
 */
lf.cache.InMemoryUpdater.prototype.updateTableIndexForRow_ = function(
    index, modification) {
  // Using 'undefined' as a special value to indicate insertion/
  // deletion instead of 'null', since 'null' can be a valid index key.
  var keyNow = goog.isNull(modification[1]) ? undefined :
      modification[1].keyOfIndex(index.getName());
  var keyThen = goog.isNull(modification[0]) ? undefined :
      modification[0].keyOfIndex(index.getName());

  if (!goog.isDef(keyThen) && goog.isDef(keyNow)) {
    // Insertion
    index.add(keyNow, modification[1].id());
  } else if (goog.isDef(keyThen) && goog.isDef(keyNow)) {
    // Index comparators may not handle null, so handle it here for them.
    if (goog.isNull(keyNow) || goog.isNull(keyThen)) {
      if (keyNow == keyThen) {
        return;
      }
    } else if (index.comparator().compare(keyThen, keyNow) ==
        lf.index.Favor.TIE) {
      return;
    }

    // Update
    // NOTE: the order of calling add() and remove() here matters.
    // Index#add() might throw an exception because of a constraint
    // violation, in which case the index remains unaffected as expected.
    index.add(keyNow, modification[1].id());
    index.remove(keyThen, modification[0].id());
  } else if (goog.isDef(keyThen) && !goog.isDef(keyNow)) {
    // Deletion
    index.remove(keyThen, modification[0].id());
  }
};
