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
goog.provide('lf.cache.Journal');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.structs.Map');
goog.require('goog.structs.Set');
goog.require('lf.Exception');
goog.require('lf.cache.ConstraintChecker');
goog.require('lf.cache.TableDiff');
goog.require('lf.service');

goog.forwardDeclare('lf.cache.Cache');
goog.forwardDeclare('lf.index.Index');
goog.forwardDeclare('lf.index.IndexStore');
goog.forwardDeclare('lf.schema.Index');



/**
 * Transaction Journal which is contained within lf.backstore.Tx. The journal
 * stores rows changed by this transaction so that they can be merged into the
 * backing store. Caches and indices are updated as soon as a change is
 * recorded in the journal.
 * @constructor
 * @struct
 * @final
 *
 * @param {!lf.Global} global
 * @param {!Array.<!lf.schema.Table>} scope A list of tables that this journal
 *     should allow access. Trying to access any table not in that list will
 *     result in an error.
 */
lf.cache.Journal = function(global, scope) {
  /**
   * Scope of this transaction in the form of table schema.
   * @private {!goog.structs.Map.<string, !lf.schema.Table>}
   */
  this.scope_ = new goog.structs.Map();
  scope.forEach(function(tableSchema) {
    this.scope_.set(tableSchema.getName(), tableSchema);
  }, this);

  /** @private {!lf.cache.Cache} */
  this.cache_ = global.getService(lf.service.CACHE);

  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = global.getService(lf.service.INDEX_STORE);

  /** @private {!lf.cache.ConstraintChecker} */
  this.contstraintChecker_ = new lf.cache.ConstraintChecker(global);

  /**
   * A terminated journal can no longer be modified or rolled back. This should
   * be set to true only after the changes in this Journal have been reflected
   * in the backing store, or the journal has been rolled back.
   * @private {boolean}
   */
  this.terminated_ = false;

  /**
   * When a constraint violation happens the journal becomes not writable
   * anymore and the only operation that is allowed is rolling back. Callers
   * of Journal#insert,insertOrReplace,update,remove *must* rollback the journal
   * if any lf.Exception is thrown, otherwise the index data structures will not
   * reflect what is in the database.
   * @private {boolean}
   */
  this.pendingRollback_ = false;

  /**
   * The changes that have been applied since the start of this journal. The
   * keys are table names, and the values are changes that have happened per
   * table.
   * @private {!goog.structs.Map.<string, !lf.cache.TableDiff>}
   */
  this.tableDiffs_ = new goog.structs.Map();
};


/**
 * @return {!goog.structs.Map.<string, !lf.cache.TableDiff>}
 */
lf.cache.Journal.prototype.getDiff = function() {
  return this.tableDiffs_;
};


/**
 * @return {!goog.structs.Map.<string, !lf.schema.Table>}
 */
lf.cache.Journal.prototype.getScope = function() {
  return this.scope_;
};


/**
 * Finds the rowIds corresponding to records within the given key ranges.
 * @param {!lf.schema.Index} indexSchema
 * @param {!Array.<!lf.index.KeyRange>} keyRanges
 * @return {!Array.<number>}
 */
lf.cache.Journal.prototype.getIndexRange = function(
    indexSchema, keyRanges) {
  var rowIds = new goog.structs.Set();
  var index = this.indexStore_.get(indexSchema.getNormalizedName());

  // Getting rowIds within the given key ranges according to IndexStore.
  keyRanges.forEach(function(keyRange) {
    rowIds.addAll(index.getRange(keyRange));
  }, this);

  return rowIds.getValues();
};


/**
 * @param {string} tableName
 * @param {!Array.<number>=} opt_rowIds
 * @return {!Array.<?lf.Row>} Snapshot of rows of the table in this transaction.
 */
lf.cache.Journal.prototype.getTableRows = function(tableName, opt_rowIds) {
  var rowIds = goog.isDefAndNotNull(opt_rowIds) ?
      opt_rowIds : this.indexStore_.getRowIdIndex(tableName).getRange();
  return this.cache_.get(rowIds);
};


/**
 * @param {!lf.schema.Table} table
 * @param {!Array.<!lf.Row>} rows
 * @throws {!lf.Exception}
 */
lf.cache.Journal.prototype.insert = function(table, rows) {
  this.assertJournalWritable_();
  this.checkScope_(table);
  this.contstraintChecker_.checkNotNullable(table, rows);

  for (var i = 0; i < rows.length; i++) {
    this.modifyRow_(table, null /* rowBefore */, rows[i] /* rowNow */);
  }
};


/**
 * Updates the journal to reflect a modification (insertion, update, deletion)
 * of a single row.
 * @param {!lf.schema.Table} table The table where the row belongs.
 * @param {?lf.Row} rowBefore The value of the row before this modification.
 *     Null indicates that the row did not exist before.
 * @param {?lf.Row} rowNow The value of the row after this modification.
 *     Null indicates that the row is being deleted.
 * @private
 * @throws {!lf.Exception}
 */
lf.cache.Journal.prototype.modifyRow_ = function(table, rowBefore, rowNow) {
  var tableName = table.getName();
  var diff = this.tableDiffs_.get(tableName, null) ||
      new lf.cache.TableDiff();
  this.tableDiffs_.set(tableName, diff);

  var modification = [rowBefore, rowNow];
  try {
    this.updateTableIndicesForRow_(table, modification);
  } catch (e) {
    this.pendingRollback_ = true;
    throw e;
  }

  if (goog.isNull(rowBefore) && !goog.isNull(rowNow)) {
    // Insertion
    this.cache_.set(tableName, [rowNow]);
    diff.add(rowNow);
  } else if (!goog.isNull(rowBefore) && !goog.isNull(rowNow)) {
    // Update
    this.cache_.set(tableName, [rowNow]);
    diff.modify(modification);
  } else if (!goog.isNull(rowBefore) && goog.isNull(rowNow)) {
    // Deletion
    this.cache_.remove(tableName, [rowBefore.id()]);
    diff.delete(rowBefore);
  }
};


/**
 * @param {!lf.schema.Table} table
 * @param {!Array.<!lf.Row>} rows
 * @throws {!lf.Exception}
 */
lf.cache.Journal.prototype.update = function(table, rows) {
  this.assertJournalWritable_();
  this.checkScope_(table);
  this.contstraintChecker_.checkNotNullable(table, rows);

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var rowBefore = /** @type {!lf.Row} */ (this.cache_.get([row.id()])[0]);
    this.modifyRow_(table, rowBefore /* rowBefore */, row /* rowNow */);
  }
};


/**
 * @param {!lf.schema.Table} table
 * @param {!Array.<!lf.Row>} rows
 * @throws {!lf.Exception}
 */
lf.cache.Journal.prototype.insertOrReplace = function(table, rows) {
  this.assertJournalWritable_();
  this.checkScope_(table);
  this.contstraintChecker_.checkNotNullable(table, rows);

  for (var i = 0; i < rows.length; i++) {
    var rowNow = rows[i];
    var rowBefore = null;

    var existingRowId =
        this.contstraintChecker_.findExistingRowIdInPkIndex(table, rowNow);

    if (goog.isDefAndNotNull(existingRowId)) {
      rowBefore = /** @type {!lf.Row} */ (
          this.cache_.get([existingRowId])[0]);
      rowNow.assignRowId(existingRowId);
    }

    this.modifyRow_(table, rowBefore, rowNow);
  }
};


/**
 * @param {!lf.schema.Table} table
 * @param {!Array.<!lf.Row>} rows
 * @throws {!lf.Exception}
 */
lf.cache.Journal.prototype.remove = function(table, rows) {
  this.assertJournalWritable_();
  this.checkScope_(table);

  for (var i = 0; i < rows.length; i++) {
    this.modifyRow_(table, rows[i] /* rowBefore */, null /* rowNow */);
  }
};


/**
 * Commits journal changes into cache and indices.
 */
lf.cache.Journal.prototype.commit = function() {
  this.assertJournalWritable_();
  this.terminated_ = true;
};


/**
 * Asserts that this journal can still be used.
 * @private
 */
lf.cache.Journal.prototype.assertJournalWritable_ = function() {
  goog.asserts.assert(
      !this.pendingRollback_,
      'Attemptted to use journal that needs to be rolled back.');
  goog.asserts.assert(
      !this.terminated_, 'Attemptted to commit a terminated journal.');
};


/**
 * Rolls back all the changes that were made in this journal from the cache and
 * indices.
 */
lf.cache.Journal.prototype.rollback = function() {
  goog.asserts.assert(
      !this.terminated_, 'Attempted to rollback a terminated journal.');

  this.tableDiffs_.forEach(
      function(tableDiff, tableName) {
        var tableSchema = this.scope_.get(tableName);
        var reverseDiff = tableDiff.getReverse();
        this.updateTableIndices_(tableSchema, reverseDiff);
        this.updateCache_(tableName, reverseDiff);
      }, this);

  this.terminated_ = true;
  this.pendingRollback_ = false;
};


/**
 * Merge contents of journal into cache.
 * @param {string} tableName
 * @param {!lf.cache.TableDiff} diff
 * @private
 */
lf.cache.Journal.prototype.updateCache_ = function(tableName, diff) {
  diff.getDeleted().getValues().forEach(
      function(row) {
        this.cache_.remove(tableName, [row.id()]);
      }, this);
  diff.getAdded().forEach(function(row, rowId) {
    this.cache_.set(tableName, [row]);
  }, this);
  diff.getModified().forEach(function(modification, rowId) {
    this.cache_.set(tableName, [modification[1]]);
  }, this);
};


/**
 * @param {!lf.schema.Table} table The table to be updated.
 * @param {!lf.cache.TableDiff} diff The difference to be applied.
 * @private
 */
lf.cache.Journal.prototype.updateTableIndices_ = function(table, diff) {
  var modifications = diff.getAsModifications();
  modifications.forEach(function(modification) {
    this.updateTableIndicesForRow_(table, modification);
  }, this);
};


/**
 * Updates all indices that are affefted as a result of the given modification.
 * In the case where an exception is thrown (constraint violation) all the
 * indices are unaffected.
 *
 * @param {!lf.schema.Table} table The table to be updated.
 * @param {!Array.<?lf.Row>} modification An array of exactly two elements where
 *     position 0 is the value before the modification and position 1 is after
 *     the modification. A value of null means that the row was either just
 *     created or just deleted.
 * @private
 * @throws {!lf.Exception}
 */
lf.cache.Journal.prototype.updateTableIndicesForRow_ = function(
    table, modification) {
  /** @type {!Array.<!lf.index.Index>} */
  var indices = table.getIndices().map(
      /**
       * @param {!lf.schema.Index} indexSchema
       * @this {!lf.cache.Journal}
       */
      function(indexSchema) {
        return this.indexStore_.get(indexSchema.getNormalizedName());
      }, this).concat([this.indexStore_.getRowIdIndex(table.getName())]);

  indices.forEach(
      /** @param {!lf.index.Index} index */
      function(index) {
        var keyNow = goog.isNull(modification[1]) ? null :
            modification[1].keyOfIndex(index.getName());
        var keyThen = goog.isNull(modification[0]) ? null :
            modification[0].keyOfIndex(index.getName());

        if (keyNow == keyThen) {
          return;
        }

        if (goog.isNull(keyThen) && !goog.isNull(keyNow)) {
          // Insertion
          index.add(keyNow, modification[1].id());
        } else if (!goog.isNull(keyThen) && !goog.isNull(keyNow)) {
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


/**
 * Checks that the given table is within the declared scope.
 * @param {!lf.schema.Table} tableSchema
 * @throws {!lfException}
 * @private
 */
lf.cache.Journal.prototype.checkScope_ = function(tableSchema) {
  if (!this.scope_.containsKey(tableSchema.getName())) {
    throw new lf.Exception(
        lf.Exception.Type.SCOPE_ERROR,
        tableSchema.getName() + ' is not in the journal\'s scope.');
  }
};
