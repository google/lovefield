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
goog.provide('lf.cache.ConstraintChecker');

goog.require('lf.ConstraintAction');
goog.require('lf.Exception');
/** @suppress {extraRequire} */
goog.require('lf.cache.Modification');
goog.require('lf.service');
goog.require('lf.structs.MapSet');
goog.require('lf.structs.map');

goog.forwardDeclare('lf.Global');
goog.forwardDeclare('lf.schema.Column');
goog.forwardDeclare('lf.schema.ForeignKeySpec');
goog.forwardDeclare('lf.schema.IndexedColumn');
goog.forwardDeclare('lf.schema.Table');



/**
 * A helper class for performing various constraint checks.
 *
 * @constructor
 * @struct
 *
 * @param {!lf.Global} global
 */
lf.cache.ConstraintChecker = function(global) {
  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = global.getService(lf.service.INDEX_STORE);

  /** @private {!lf.schema.Database} */
  this.schema_ = global.getService(lf.service.SCHEMA);

  /** @private {!lf.cache.Cache} */
  this.cache_ = global.getService(lf.service.CACHE);

  /**
   * A map where the keys are normalized lf.schema.ForeignKeySpec names, and the
   * values are corresponding parent column indices. The map is used such that
   * this association does not have to be detected more than once.
   * @private {?lf.structs.Map<name, !lf.index.Index>}
   */
  this.foreignKeysParentIndices_ = null;
};


/**
 * Finds if any row with the same primary key exists in the primary key index.
 * @param {!lf.schema.Table} table The table where the row belongs.
 * @param {!lf.Row} row The row whose primary key needs to checked.
 * @return {?number} The row ID of an existing row that has the same primary
 *     key as the input row, on null if no existing row was found.
 */
lf.cache.ConstraintChecker.prototype.findExistingRowIdInPkIndex = function(
    table, row) {
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  if (goog.isNull(pkIndexSchema)) {
    // There is no primary key for the given table.
    return null;
  }
  return this.findExistingRowIdInIndex_(pkIndexSchema, row);
};


/**
 * Finds if any row with the same index key exists in the given index.
 * @param {!lf.schema.Index} indexSchema The index to check.
 * @param {!lf.Row} row The row whose index key needs to checked.
 * @return {?number} The row ID of an existing row that has the same index
 *     key as the input row, on null if no existing row was found.
 * @private
 */
lf.cache.ConstraintChecker.prototype.findExistingRowIdInIndex_ = function(
    indexSchema, row) {
  var indexName = indexSchema.getNormalizedName();
  var indexKey = row.keyOfIndex(indexName);
  var index = this.indexStore_.get(indexName);

  var rowIds = index.get(/** @type {!lf.index.Index.Key} */ (indexKey));
  return rowIds.length == 0 ? null : rowIds[0];
};


/**
 * Checks whether any not-nullable constraint violation occurs as a result of
 * inserting/updating the given set of rows.
 * @param {!lf.schema.Table} table The table where the rows belong.
 * @param {!Array<!lf.Row>} rows The rows being inserted.
 * @throws {!lf.Exception}
 */
lf.cache.ConstraintChecker.prototype.checkNotNullable = function(table, rows) {
  var notNullable = table.getConstraint().getNotNullable();
  rows.forEach(function(row) {
    notNullable.forEach(
        /** @param {!lf.schema.Column} column */
        function(column) {
          if (!goog.isDefAndNotNull(row.payload()[column.getName()])) {
            // 202: Attempted to insert NULL value to non-nullable field {0}.
            throw new lf.Exception(202, column.getNormalizedName());
          }
        }, this);
  }, this);
};


/**
 * Checks that all referred keys in the given rows actually exist.
 * @param {!lf.schema.Table} table
 * @param {!Array<!lf.cache.Modification>} modifications
 * @param {!lf.ConstraintTiming} constraintTiming Only constraints with this
 *     timing will be checked.
 * @throws {!lf.Exception}
 * @private
 */
lf.cache.ConstraintChecker.prototype.checkReferredKeys_ = function(
    table, modifications, constraintTiming) {
  var foreignKeySpecs = table.getConstraint().getForeignKeys();
  foreignKeySpecs.forEach(function(foreignKeySpec) {
    if (foreignKeySpec.timing == constraintTiming) {
      this.checkReferredKey_(foreignKeySpec, modifications);
    }
  }, this);
};


/**
 * @param {!lf.schema.ForeignKeySpec} foreignKeySpec
 * @param {!Array<!lf.cache.Modification>} modifications
 * @throws {!lf.Exception}
 * @private
 */
lf.cache.ConstraintChecker.prototype.checkReferredKey_ = function(
    foreignKeySpec, modifications) {
  var parentIndex = this.getParentIndex_(foreignKeySpec);
  modifications.forEach(function(modification) {
    var didColumnValueChange = lf.cache.ConstraintChecker.didColumnValueChange_(
        modification[0], modification[1], foreignKeySpec.name);

    if (didColumnValueChange) {
      var rowAfter = modification[1];
      var parentKey = rowAfter.keyOfIndex(foreignKeySpec.name);
      // A null value in the child column implies to ignore it, and not consider
      // it as a constraint violation.
      if (!goog.isNull(parentKey) && !parentIndex.containsKey(parentKey)) {
        // 203: Foreign key constraint violation on constraint {0}.
        throw new lf.Exception(203, foreignKeySpec.name);
      }
    }
  }, this);
};


/**
 * Finds the index corresponding to the parent column of the given foreign key,
 * by querying the schema and the IndexStore.
 * @param {!lf.schema.ForeignKeySpec} foreignKeySpec
 * @return {!lf.index.Index} The index corresponding to the parent column of the
 *     given foreign key constraint.
 * @private
 */
lf.cache.ConstraintChecker.prototype.findParentIndex_ = function(
    foreignKeySpec) {
  var parentTable = this.schema_.table(foreignKeySpec.parentTable);
  var parentColumn = /** @type {!lf.schema.Column} */ (
      parentTable[foreignKeySpec.parentColumn]);
  // getIndex() must find an index since the parent of a foreign key constraint
  // must have a dedicated index.
  var parentIndexSchema = /** @type {!lf.schema.Index} */ (
      parentColumn.getIndex());
  return /** @type {!lf.index.Index} */ (
      this.indexStore_.get(parentIndexSchema.getNormalizedName()));
};


/**
 * Gets the index corresponding to the parent column of the given foreign key.
 * Leverages this.foreignKeysParentIndices_ map, such that the work for finding
 * the parent index happens only once per foreign key.
 * @param {!lf.schema.ForeignKeySpec} foreignKeySpec
 * @return {!lf.index.Index} The index corresponding to the parent column of the
 *     given foreign key constraint.
 * @private
 */
lf.cache.ConstraintChecker.prototype.getParentIndex_ = function(
    foreignKeySpec) {
  if (goog.isNull(this.foreignKeysParentIndices_)) {
    this.foreignKeysParentIndices_ = lf.structs.map.create();
  }

  var parentIndex =
      this.foreignKeysParentIndices_.get(foreignKeySpec.name) || null;
  if (goog.isNull(parentIndex)) {
    parentIndex = this.findParentIndex_(foreignKeySpec);
    this.foreignKeysParentIndices_.set(foreignKeySpec.name, parentIndex);
  }

  return parentIndex;
};


/**
 * @param {?lf.Row} rowBefore
 * @param {?lf.Row} rowAfter
 * @param {string} indexName
 * @return {boolean}
 * @private
 */
lf.cache.ConstraintChecker.didColumnValueChange_ = function(
    rowBefore, rowAfter, indexName) {
  var deletionOrAddition = (goog.isNull(rowBefore) ? !goog.isNull(rowAfter) :
      goog.isNull(rowAfter));
  return deletionOrAddition ||
      (rowBefore.keyOfIndex(indexName) != rowAfter.keyOfIndex(indexName));
};


/**
 * Checks that no referring keys exist for the given rows.
 * @param {!lf.schema.Table} table
 * @param {!Array<!lf.cache.Modification>} modifications
 * @param {!lf.ConstraintTiming} constraintTiming Only constraints with this
 *     timing will be checked.
 * @param {!lf.ConstraintAction=} opt_constraintAction Only constraints with
 *     this action will be checked. If not provided both CASCADE and RESTRICT
 *     are checked.
 * @throws {!lf.Exception}
 * @private
 */
lf.cache.ConstraintChecker.prototype.checkReferringKeys_ = function(
    table, modifications, constraintTiming, opt_constraintAction) {
  var foreignKeySpecs = this.schema_.info().getReferencingForeignKeys(
      table.getName(), opt_constraintAction);
  if (goog.isNull(foreignKeySpecs)) {
    return;
  }

  // TODO(dpapad): Enhance lf.schema.Info#getReferencingForeignKeys to filter
  // based on constraint timing, such that this linear search is avoided.
  foreignKeySpecs = foreignKeySpecs.filter(function(foreignKeySpec) {
    return foreignKeySpec.timing == constraintTiming;
  });

  if (foreignKeySpecs.length == 0) {
    return;
  }

  this.loopThroughReferringRows_(
      foreignKeySpecs, modifications,
      function(foreignKeySpec, childIndex, parentKey) {
        if (childIndex.containsKey(parentKey)) {
          // 203: Foreign key constraint violation on constraint {0}.
          throw new lf.Exception(203, foreignKeySpec.name);
        }
      });
};


/**
 * Finds row IDs that refer to the given modified rows and specifically only if
 * the refer to a modified column.
 * @param {!lf.schema.Table} table
 * @param {!Array<!lf.cache.Modification>} modifications
 * @return {?lf.structs.MapSet<string, number>} Referring row IDs per table.
 * @private
 */
lf.cache.ConstraintChecker.prototype.findReferringRowIds_ = function(
    table, modifications) {
  // Finding foreign key constraints referring to the affected table.
  var foreignKeySpecs = this.schema_.info().getReferencingForeignKeys(
      table.getName(), lf.ConstraintAction.CASCADE);
  if (goog.isNull(foreignKeySpecs)) {
    return null;
  }

  var referringRowIds = new lf.structs.MapSet();
  this.loopThroughReferringRows_(
      foreignKeySpecs, modifications,
      function(foreignKeySpec, childIndex, parentKey) {
        var childRowIds = childIndex.get(parentKey);
        if (childRowIds.length > 0) {
          referringRowIds.setMany(foreignKeySpec.childTable, childRowIds);
        }
      });
  return referringRowIds;
};


/**
 * Finds all rows in the database that should be updated as a result of
 * cascading updates, taking into account the given foreign key constraints.
 * @param {!lf.schema.Table} table
 * @param {!Array<!lf.cache.Modification>} modifications
 * @param {!Array<!lf.schema.ForeignKeySpec>} foreignKeySpecs
 * @return {?lf.cache.ConstraintChecker.CascadeUpdate} null if no cascaded
 *     updates were found.
 */
lf.cache.ConstraintChecker.prototype.detectCascadeUpdates = function(
    table, modifications, foreignKeySpecs) {
  var cascadedUpdates = new lf.structs.MapSet();
  this.loopThroughReferringRows_(
      foreignKeySpecs, modifications,
      function(foreignKeySpec, childIndex, parentKey, modification) {
        var childRowIds = childIndex.get(parentKey);
        childRowIds.forEach(function(rowId) {
          cascadedUpdates.set(
              rowId, {
                fkSpec: foreignKeySpec,
                originalUpdatedRow: modification[1]
              });
        });
      });
  return cascadedUpdates;
};


/**
 * Loops through the given list of foreign key constraints, for each modifed row
 * and invokes the given callback only when a referred column's value has been
 * modified.
 * @param {!Array<!lf.schema.ForeignKeySpec>} foreignKeySpecs
 * @param {!Array<!lf.cache.Modification>} modifications
 * @param {function(
 *     !lf.schema.ForeignKeySpec,
 *     !lf.index.Index,
 *     ?lf.index.Index.Key,
 *     !lf.cache.Modification)} callbackFn
 * @private
 */
lf.cache.ConstraintChecker.prototype.loopThroughReferringRows_ = function(
    foreignKeySpecs, modifications, callbackFn) {
  foreignKeySpecs.forEach(
      /** @param {!lf.schema.ForeignKeySpec} foreignKeySpec */
      function(foreignKeySpec) {
        var childIndex = /** @type {!lf.index.Index} */ (
            this.indexStore_.get(foreignKeySpec.name));
        var parentIndex = this.getParentIndex_(foreignKeySpec);
        modifications.forEach(function(modification) {
          var didColumnValueChange =
              lf.cache.ConstraintChecker.didColumnValueChange_(
                  modification[0], modification[1], parentIndex.getName());

          if (didColumnValueChange) {
            var rowBefore = modification[0];
            var parentKey = rowBefore.keyOfIndex(parentIndex.getName());
            callbackFn(foreignKeySpec, childIndex, parentKey, modification);
          }
        }, this);
      }, this);
};


/**
 * Performs all necessary foreign key constraint checks for the case where new
 * rows are inserted.
 * @param {!lf.schema.Table} table
 * @param {!Array<!lf.Row>} rows
 * @param {!lf.ConstraintTiming} constraintTiming Only constraints with this
 *     timing will be checked.
 * @throws {!lf.Exception}
 */
lf.cache.ConstraintChecker.prototype.checkForeignKeysForInsert = function(
    table, rows, constraintTiming) {
  if (rows.length == 0) {
    return;
  }

  var modifications = rows.map(function(row) {
    return [null /* rowBefore */, row /* rowNow */];
  });
  this.checkReferredKeys_(table, modifications, constraintTiming);
};


/**
 * Performs all necessary foreign key constraint checks for the case of existing
 * rows being updated.
 * @param {!lf.schema.Table} table
 * @param {!Array<!lf.cache.Modification>} modifications
 * @param {!lf.ConstraintTiming} constraintTiming Only constraints with this
 *     timing will be checked.
 * @throws {!lf.Exception}
 */
lf.cache.ConstraintChecker.prototype.checkForeignKeysForUpdate = function(
    table, modifications, constraintTiming) {
  if (modifications.length == 0) {
    return;
  }

  this.checkReferredKeys_(table, modifications, constraintTiming);
  this.checkReferringKeys_(
      table, modifications, constraintTiming, lf.ConstraintAction.RESTRICT);
};


/**
 * Performs all necessary foreign key constraint checks for the case of rows
 * being deleted.
 * @param {!lf.schema.Table} table
 * @param {!Array<!lf.Row>} rows
 * @param {!lf.ConstraintTiming} constraintTiming Only constraints with this
 *     timing will be checked.
 * @throws {!lf.Exception}
 */
lf.cache.ConstraintChecker.prototype.checkForeignKeysForDelete = function(
    table, rows, constraintTiming) {
  if (rows.length == 0) {
    return;
  }

  var modifications = rows.map(function(row) {
    return [row /* rowBefore */, null /* rowNow */];
  });
  this.checkReferringKeys_(
      table, modifications, constraintTiming, lf.ConstraintAction.RESTRICT);
};


/**
 * Finds all rows in the database that should be deleted as a result of
 * cascading deletions.
 * @param {!lf.schema.Table} table
 * @param {!Array<!lf.Row>} rows The original rows being deleted (before taking
 *     cascating into account.
 * @return {!lf.cache.ConstraintChecker.CascadeDeletion}
 */
lf.cache.ConstraintChecker.prototype.detectCascadeDeletion = function(
    table, rows) {
  var result = {
    tableOrder: [],
    rowIdsPerTable: new lf.structs.MapSet()
  };

  var lastRowIdsToDelete = new lf.structs.MapSet();
  lastRowIdsToDelete.setMany(
      table.getName(), rows.map(function(row) { return row.id(); }));

  do {
    var newRowIdsToDelete = new lf.structs.MapSet();
    lastRowIdsToDelete.keys().forEach(function(tableName) {
      var table = this.schema_.table(tableName);
      var rowIds = lastRowIdsToDelete.get(tableName);
      var modifications = rowIds.map(
          /**
           * @param {number} rowId
           * @this {!lf.cache.ConstraintChecker}
           */
          function(rowId) {
            var row = this.cache_.get(rowId);
            return [row /* rowBefore */, null /* rowNow */];
          }, this);
      var referringRowIds = this.findReferringRowIds_(table, modifications);
      if (!goog.isNull(referringRowIds)) {
        result.tableOrder.unshift.apply(
            result.tableOrder, referringRowIds.keys());
        newRowIdsToDelete.merge(referringRowIds);
      }
    }, this);
    lastRowIdsToDelete = newRowIdsToDelete;
    result.rowIdsPerTable.merge(lastRowIdsToDelete);
  } while (lastRowIdsToDelete.size > 0);

  return result;
};


/**
 * Holds row IDs (per-table) to be deleted because of the existence of cascade
 * constraints. Also holds the order in which tables need to be modified such
 * that no constraints are broken.
 * @typedef {{
 *   tableOrder: !Array<string>,
 *   rowIdsPerTable: !lf.structs.MapSet<string, number>
 * }}
 */
lf.cache.ConstraintChecker.CascadeDeletion;


/**
 * Holds the row IDs of rows to be updated because of the existence of
 * cascade constraints. For each rowID it stores the foreign key constraints and
 * the values of the updated original rows.
 * @typedef {!lf.structs.MapSet<number, {
 *   fkSpec: !lf.schema.ForeignKeySpec,
 *   originalUpdatedRow: !lf.Row
 * }>}
 */
lf.cache.ConstraintChecker.CascadeUpdate;
