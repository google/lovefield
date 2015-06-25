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
goog.require('lf.service');



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
    notNullable.forEach(function(column) {
      if (goog.isNull(row.payload()[column.getName()])) {
        // 202: Attempted to insert NULL value to non-nullable field {0}.
        throw new lf.Exception(202, column.getNormalizedName());
      }
    }, this);
  }, this);
};


/**
 * Checks that all referred keys in the given rows actually exist.
 * @param {!lf.schema.Table} table
 * @param {!Array<!lf.Row>} rows
 * @param {!lf.ConstraintTiming} constraintTiming Only constraints with this
 *     timing will be checked.
 * @throws {!lf.Exception}
 */
lf.cache.ConstraintChecker.prototype.checkReferredKeys = function(
    table, rows, constraintTiming) {
  var foreignKeySpecs = table.getConstraint().getForeignKeys();
  foreignKeySpecs.forEach(function(foreignKeySpec) {
    if (foreignKeySpec.timing == constraintTiming) {
      this.checkReferredKey_(foreignKeySpec, rows);
    }
  }, this);
};


/**
 * @param {!lf.schema.ForeignKeySpec} foreignKeySpec
 * @param {!Array<!lf.Row>} rows
 * @throws {!lf.Exception}
 * @private
 */
lf.cache.ConstraintChecker.prototype.checkReferredKey_ = function(
    foreignKeySpec, rows) {
  var parentTable = this.schema_.table(foreignKeySpec.parentTable);
  var parentColumn = parentTable[foreignKeySpec.parentColumn];
  var parentIndexSchema = parentColumn.getIndices().filter(
      function(indexSchema) {
        return indexSchema.columns.length == 1 &&
            indexSchema.columns[0].schema.getName() ==
                foreignKeySpec.parentColumn;
      })[0];
  var parentIndex = this.indexStore_.get(parentIndexSchema.getNormalizedName());

  rows.forEach(function(row) {
    var parentKey = row.payload()[foreignKeySpec.childColumn];
    if (!parentIndex.containsKey(parentKey)) {
      // 203: Foreign key constraint violation on constraint {0}.
      throw new lf.Exception(203, foreignKeySpec.fkName);
    }
  });
};


/**
 * Checks that no referring keys exist for the given rows.
 * @param {!lf.schema.Table} table
 * @param {!Array<!lf.Row>} rows
 * @param {!lf.ConstraintTiming} constraintTiming Only constraints with this
 *     timing will be checked.
 * @throws {!lf.Exception}
 */
lf.cache.ConstraintChecker.prototype.checkReferringKeys = function(
    table, rows, constraintTiming) {
  var parentForeignKeys = table.getReferencingForeignKeys();
  if (!goog.isDefAndNotNull(parentForeignKeys)) {
    return;
  }

  parentForeignKeys.forEach(function(foreignKeySpec) {
    if (foreignKeySpec.timing != constraintTiming) {
      return;
    }
    var childIndex = this.indexStore_.get(foreignKeySpec.fkName);
    rows.forEach(function(row) {
      var parentKey = row.payload()[foreignKeySpec.parentColumn];
      if (childIndex.containsKey(parentKey)) {
        // 203: Foreign key constraint violation on constraint {0}.
        throw new lf.Exception(203, foreignKeySpec.fkName);
      }
    });
  }, this);
};
