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
goog.provide('lf.cache.Journal');

goog.require('goog.asserts');
goog.require('lf.ConstraintAction');
goog.require('lf.ConstraintTiming');
goog.require('lf.Exception');
goog.require('lf.cache.ConstraintChecker');
goog.require('lf.cache.InMemoryUpdater');
/** @suppress {extraRequire} */
goog.require('lf.cache.Modification');
goog.require('lf.cache.TableDiff');
goog.require('lf.service');
goog.require('lf.structs.map');

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
 * @param {!lf.structs.Set<!lf.schema.Table>} scope A set of tables that this
 *     journal should allow access. Trying to access any table not in that set
 *     will result in an error.
 */
lf.cache.Journal = function(global, scope) {
  /**
   * Scope of this transaction in the form of table schema.
   * @private {!lf.structs.Map<string, !lf.schema.Table>}
   */
  this.scope_ = lf.structs.map.create();
  scope.forEach(
      /**
       * @this {!lf.cache.Journal}
       * @param {!lf.schema.Table} tableSchema
       */
      function(tableSchema) {
        this.scope_.set(tableSchema.getName(), tableSchema);
      }, this);

  /** @private {!lf.schema.Database} */
  this.schema_ = global.getService(lf.service.SCHEMA);

  /** @private {!lf.cache.Cache} */
  this.cache_ = global.getService(lf.service.CACHE);

  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = global.getService(lf.service.INDEX_STORE);

  /** @private {!lf.cache.ConstraintChecker} */
  this.constraintChecker_ = new lf.cache.ConstraintChecker(global);

  /** @private {!lf.cache.InMemoryUpdater} */
  this.inMemoryUpdater_ = new lf.cache.InMemoryUpdater(global);

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
   * @private {!lf.structs.Map<string, !lf.cache.TableDiff>}
   */
  this.tableDiffs_ = lf.structs.map.create();
};


/**
 * @return {!lf.structs.Map<string, !lf.cache.TableDiff>}
 */
lf.cache.Journal.prototype.getDiff = function() {
  return this.tableDiffs_;
};


/**
 * @return {!Array<!lf.index.Index>} The indices that were modified in this
 *     within this journal.
 * TODO(dpapad): Indices currently can't provide a diff, therefore the entire
 * index is flushed into disk every time, even if only one leaf-node changed.
 */
lf.cache.Journal.prototype.getIndexDiff = function() {
  var tableSchemas = lf.structs.map.keys(this.tableDiffs_).map(
      function(tableName) {
        return this.scope_.get(tableName);
      }, this);

  var indices = [];
  tableSchemas.forEach(
      /**
       * @param {!lf.schema.Table} tableSchema
       * @this {lf.cache.Journal}
       */
      function(tableSchema) {
        if (tableSchema.persistentIndex()) {
          var tableIndices = tableSchema.getIndices();
          tableIndices.forEach(
              /**
               * @param {!lf.schema.Index} indexSchema
               * @this {lf.cache.Journal}
               */
              function(indexSchema) {
                indices.push(this.indexStore_.get(
                    indexSchema.getNormalizedName()));
              }, this);
          indices.push(this.indexStore_.get(tableSchema.getName() + '.#'));
        }
      }, this);

  return indices;
};


/**
 * @return {!lf.structs.Map<string, !lf.schema.Table>}
 */
lf.cache.Journal.prototype.getScope = function() {
  return this.scope_;
};


/**
 * @param {!lf.schema.Table} table
 * @param {!Array<!lf.Row>} rows
 * @throws {!lf.Exception}
 */
lf.cache.Journal.prototype.insert = function(table, rows) {
  this.assertJournalWritable_();
  this.checkScope_(table);
  this.constraintChecker_.checkNotNullable(table, rows);
  this.constraintChecker_.checkForeignKeysForInsert(
      table, rows, lf.ConstraintTiming.IMMEDIATE);

  for (var i = 0; i < rows.length; i++) {
    this.modifyRow_(table, [null /* rowBefore */, rows[i] /* rowNow */]);
  }
};


/**
 * Updates the journal to reflect a modification (insertion, update, deletion)
 * of a single row.
 * @param {!lf.schema.Table} table The table where the row belongs.
 * @param {!lf.cache.Modification} modification
 * @private
 * @throws {!lf.Exception}
 */
lf.cache.Journal.prototype.modifyRow_ = function(table, modification) {
  var tableName = table.getName();
  var diff = this.tableDiffs_.get(tableName) ||
      new lf.cache.TableDiff(tableName);
  this.tableDiffs_.set(tableName, diff);

  try {
    this.inMemoryUpdater_.updateTableIndicesForRow(table, modification);
  } catch (e) {
    this.pendingRollback_ = true;
    throw e;
  }

  var rowBefore = modification[0];
  var rowNow = modification[1];
  if (goog.isNull(rowBefore) && !goog.isNull(rowNow)) {
    // Insertion
    this.cache_.set(tableName, rowNow);
    diff.add(rowNow);
  } else if (!goog.isNull(rowBefore) && !goog.isNull(rowNow)) {
    // Update
    this.cache_.set(tableName, rowNow);
    diff.modify(modification);
  } else if (!goog.isNull(rowBefore) && goog.isNull(rowNow)) {
    // Deletion
    this.cache_.remove(tableName, rowBefore.id());
    diff.delete(rowBefore);
  }
};


/**
 * @param {!lf.schema.Table} table
 * @param {!Array<!lf.Row>} rows
 * @throws {!lf.Exception}
 */
lf.cache.Journal.prototype.update = function(table, rows) {
  this.assertJournalWritable_();
  this.checkScope_(table);
  this.constraintChecker_.checkNotNullable(table, rows);

  var modifications = rows.map(function(row) {
    var rowBefore = /** @type {!lf.Row} */ (this.cache_.get(row.id()));
    return [rowBefore /* rowBefore */, row /* rowNow */];
  }, this);
  this.updateByCascade_(table, modifications);

  this.constraintChecker_.checkForeignKeysForUpdate(
      table, modifications, lf.ConstraintTiming.IMMEDIATE);
  modifications.forEach(function(modification) {
    this.modifyRow_(table, modification);
  }, this);
};


/**
 * @param {!lf.schema.Table} table
 * @param {!Array<!lf.Row>} rows
 * @throws {!lf.Exception}
 */
lf.cache.Journal.prototype.insertOrReplace = function(table, rows) {
  this.assertJournalWritable_();
  this.checkScope_(table);
  this.constraintChecker_.checkNotNullable(table, rows);

  for (var i = 0; i < rows.length; i++) {
    var rowNow = rows[i];
    var rowBefore = null;

    var existingRowId =
        this.constraintChecker_.findExistingRowIdInPkIndex(table, rowNow);

    if (goog.isDefAndNotNull(existingRowId)) {
      rowBefore = /** @type {!lf.Row} */ (this.cache_.get(existingRowId));
      rowNow.assignRowId(existingRowId);
      var modification = [rowBefore, rowNow];
      this.constraintChecker_.checkForeignKeysForUpdate(
          table, [modification], lf.ConstraintTiming.IMMEDIATE);
    } else {
      this.constraintChecker_.checkForeignKeysForInsert(
          table, [rowNow], lf.ConstraintTiming.IMMEDIATE);
    }

    this.modifyRow_(table, [rowBefore, rowNow]);
  }
};


/**
 * @param {!lf.schema.Table} table
 * @param {!Array<!lf.Row>} rows
 * @throws {!lf.Exception}
 */
lf.cache.Journal.prototype.remove = function(table, rows) {
  this.assertJournalWritable_();
  this.checkScope_(table);

  this.removeByCascade_(table, rows);
  this.constraintChecker_.checkForeignKeysForDelete(
      table, rows, lf.ConstraintTiming.IMMEDIATE);

  for (var i = 0; i < rows.length; i++) {
    this.modifyRow_(table, [rows[i] /* rowBefore */, null /* rowNow */]);
  }
};


/**
 * Updates rows in the DB as a result of cascading foreign key constraints.
 * @param {!lf.schema.Table} table The table where the update is initiated.
 * @param {!Array<!lf.cache.Modification>} modifications The initial
 *     modifications.
 * @private
 */
lf.cache.Journal.prototype.updateByCascade_ = function(table, modifications) {
  var foreignKeySpecs = this.schema_.info().getReferencingForeignKeys(
      table.getName(), lf.ConstraintAction.CASCADE);
  if (goog.isNull(foreignKeySpecs)) {
    // The affected table does not appear as the parent in any CASCADE foreign
    // key constraint, therefore no cascading detection is needed.
    return;
  }
  var cascadedUpdates = this.constraintChecker_.detectCascadeUpdates(
      table, modifications, foreignKeySpecs);
  cascadedUpdates.keys().forEach(function(rowId) {
    var updates = cascadedUpdates.get(rowId);
    updates.forEach(function(update) {
      var table = this.schema_.table(update.fkSpec.childTable);
      var rowBefore = /** @type {!lf.Row} */ (this.cache_.get(rowId));
      // TODO(dpapad): Explore faster ways to clone an lf.Row.
      var rowAfter = table.deserializeRow(rowBefore.serialize());
      rowAfter.payload()[update.fkSpec.childColumn] =
          update.originalUpdatedRow.payload()[update.fkSpec.parentColumn];
      this.modifyRow_(
          table, [rowBefore /* rowBefore */, rowAfter /* rowNow */]);
    }, this);
  }, this);
};


/**
 * Removes rows from the DB as a result of cascading foreign key constraints.
 * @param {!lf.schema.Table} table The table where the deletion is initiated.
 * @param {!Array<!lf.Row>} rows The initial rows to be deleted.
 * @private
 */
lf.cache.Journal.prototype.removeByCascade_ = function(table, rows) {
  var foreignKeySpecs = this.schema_.info().getReferencingForeignKeys(
      table.getName(), lf.ConstraintAction.CASCADE);
  if (goog.isNull(foreignKeySpecs)) {
    // The affected table does not appear as the parent in any CASCADE foreign
    // key constraint, therefore no cascading detection is needed.
    return;
  }

  var cascadeDeletion = this.constraintChecker_.detectCascadeDeletion(
      table, rows);
  var cascadeRowIds = cascadeDeletion.rowIdsPerTable;

  cascadeDeletion.tableOrder.forEach(function(tableName) {
    var table = this.schema_.table(tableName);
    var rows = cascadeRowIds.get(tableName).map(function(rowId) {
      return this.cache_.get(rowId);
    }, this);
    this.constraintChecker_.checkForeignKeysForDelete(
        table, rows, lf.ConstraintTiming.IMMEDIATE);
    rows.forEach(function(row) {
      this.modifyRow_(table, [row /* rowBefore */, null /* rowNow */]);
    }, this);
  }, this);
};


/**
 * Performs constraint checks that have been deferred.
 * @throws {!lf.Exception}
 */
lf.cache.Journal.prototype.checkDeferredConstraints = function() {
  this.tableDiffs_.forEach(
      /** @this {lf.cache.Journal} */
      function(tableDiff, tableName) {
        var table = this.scope_.get(tableDiff.getName());
        this.constraintChecker_.checkForeignKeysForInsert(
            table, lf.structs.map.values(tableDiff.getAdded()),
            lf.ConstraintTiming.DEFERRABLE);
        this.constraintChecker_.checkForeignKeysForDelete(
            table, lf.structs.map.values(tableDiff.getDeleted()),
            lf.ConstraintTiming.DEFERRABLE);
        this.constraintChecker_.checkForeignKeysForUpdate(
            table, lf.structs.map.values(tableDiff.getModified()),
            lf.ConstraintTiming.DEFERRABLE);
      }, this);
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

  var reverseDiffs = lf.structs.map.values(this.tableDiffs_).map(
      function(tableDiff) {
        return tableDiff.getReverse();
      });
  this.inMemoryUpdater_.update(reverseDiffs);

  this.terminated_ = true;
  this.pendingRollback_ = false;
};


/**
 * Checks that the given table is within the declared scope.
 * @param {!lf.schema.Table} tableSchema
 * @throws {!lfException}
 * @private
 */
lf.cache.Journal.prototype.checkScope_ = function(tableSchema) {
  if (!this.scope_.has(tableSchema.getName())) {
    // 106: Attempt to access {0} outside of specified scope.
    throw new lf.Exception(106, tableSchema.getName());
  }
};
