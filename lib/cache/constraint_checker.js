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

goog.require('lf.Exception');
/** @suppress {extraRequire} */
goog.require('lf.cache.Modification');
goog.require('lf.service');

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
      var parentKey = rowAfter.payload()[foreignKeySpec.childColumn];
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
 * @param {!lf.schema.ForeignKeySpec} foreignKeySpec
 * @return {!lf.index.Index} The index corresponding to the parent column of the
 *     given foreign key constraint.
 * @private
 */
lf.cache.ConstraintChecker.prototype.getParentIndex_ = function(
    foreignKeySpec) {
  var parentTable = this.schema_.table(foreignKeySpec.parentTable);
  var parentColumn = /** @type {!lf.schema.Column} */ (
      parentTable[foreignKeySpec.parentColumn]);
  var parentIndexSchema = /** @type {!lf.schema.Index} */ (
      parentColumn.getIndices().filter(
      /** @param {!lf.schema.Index} indexSchema */
      function(indexSchema) {
        return indexSchema.columns.length == 1 &&
            /** @type {!lf.schema.IndexedColumn} */ (indexSchema.columns[0]).
                schema.getName() == foreignKeySpec.parentColumn;
      })[0]);
  return /** @type {!lf.index.Index} */ (
      this.indexStore_.get(parentIndexSchema.getNormalizedName()));
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
 * @throws {!lf.Exception}
 * @private
 */
lf.cache.ConstraintChecker.prototype.checkReferringKeys_ = function(
    table, modifications, constraintTiming) {
  var parentForeignKeys =
      this.schema_.info().getReferencingForeignKeys(table.getName());
  if (!goog.isDefAndNotNull(parentForeignKeys)) {
    return;
  }

  parentForeignKeys.forEach(
      /** @param {!lf.schema.ForeignKeySpec} foreignKeySpec */
      function(foreignKeySpec) {
        if (foreignKeySpec.timing != constraintTiming) {
          return;
        }
        var childIndex = this.indexStore_.get(foreignKeySpec.name);
        modifications.forEach(function(modification) {
          var parentIndex = this.getParentIndex_(foreignKeySpec);
          var didColumnValueChange =
              lf.cache.ConstraintChecker.didColumnValueChange_(
                  modification[0], modification[1], parentIndex.getName());

          if (didColumnValueChange) {
            var rowBefore = modification[0];
            var parentKey = rowBefore.payload()[foreignKeySpec.parentColumn];
            if (childIndex.containsKey(parentKey)) {
              // 203: Foreign key constraint violation on constraint {0}.
              throw new lf.Exception(203, foreignKeySpec.name);
            }
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
  this.checkReferringKeys_(table, modifications, constraintTiming);
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
  this.checkReferringKeys_(table, modifications, constraintTiming);
};
