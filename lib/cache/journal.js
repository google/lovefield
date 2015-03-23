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

goog.require('goog.asserts');
goog.require('goog.structs.Map');
goog.require('goog.structs.Set');
goog.require('lf.Exception');
goog.require('lf.cache.ConstraintChecker');
goog.require('lf.cache.InMemoryUpdater');
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
 * @param {!Array<!lf.schema.Table>} scope A list of tables that this journal
 *     should allow access. Trying to access any table not in that list will
 *     result in an error.
 */
lf.cache.Journal = function(global, scope) {
  /**
   * Scope of this transaction in the form of table schema.
   * @private {!goog.structs.Map<string, !lf.schema.Table>}
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
   * @private {!goog.structs.Map<string, !lf.cache.TableDiff>}
   */
  this.tableDiffs_ = new goog.structs.Map();
};


/**
 * @return {!goog.structs.Map<string, !lf.cache.TableDiff>}
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
  var tableSchemas = this.tableDiffs_.getKeys().map(
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
 * @return {!goog.structs.Map<string, !lf.schema.Table>}
 */
lf.cache.Journal.prototype.getScope = function() {
  return this.scope_;
};


/**
 * @return {!Array<string>} The names of all persisted index tables that can be
 *     affected by this journal.
 */
lf.cache.Journal.prototype.getIndexScope = function() {
  var indexScope = [];

  var tables = this.scope_.getValues();
  tables.forEach(function(tableSchema) {
    if (tableSchema.persistentIndex()) {
      var tableIndices = tableSchema.getIndices();
      tableIndices.forEach(function(indexSchema) {
        indexScope.push(indexSchema.getNormalizedName());
      });

      // Adding RowId backing store name to the scope.
      indexScope.push(tableSchema.getName() + '.#');
    }
  });

  return indexScope;
};


/**
 * @param {!lf.schema.Table} table
 * @param {!Array<!lf.Row>} rows
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
      new lf.cache.TableDiff(tableName);
  this.tableDiffs_.set(tableName, diff);

  var modification = [rowBefore, rowNow];
  try {
    this.inMemoryUpdater_.updateTableIndicesForRow(table, modification);
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
 * @param {!Array<!lf.Row>} rows
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
 * @param {!Array<!lf.Row>} rows
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
 * @param {!Array<!lf.Row>} rows
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

  var reverseDiffs = this.tableDiffs_.getValues().map(
      function(tableDiff) {
        return tableDiff.getReverse();
      }, this);
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
  if (!this.scope_.containsKey(tableSchema.getName())) {
    throw new lf.Exception(
        lf.Exception.Type.SCOPE_ERROR,
        tableSchema.getName() + ' is not in the journal\'s scope.');
  }
};
