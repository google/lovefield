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
goog.provide('lf.cache.ConstraintChecker');

goog.require('goog.structs.Set');
goog.require('lf.Exception');
goog.require('lf.Global');
goog.require('lf.service');



/**
 * A helper class for performing various constraint checks.
 *
 * @constructor
 * @struct
 */
lf.cache.ConstraintChecker = function() {
  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = lf.Global.get().getService(lf.service.INDEX_STORE);
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

  var pkIndexName = pkIndexSchema.getNormalizedName();
  var primaryKey = /** @type {!lf.index.Index.Key} */ (
      row.keyOfIndex(pkIndexName));
  var pkIndex = this.indexStore_.get(pkIndexName);

  var rowIds = pkIndex.get(primaryKey);
  return rowIds.length == 0 ? null : rowIds[0];
};


/**
 * Checks whether any of the given rows already exists in the backstore, or in
 * this journal.
 * @param {!lf.schema.Table} table
 * @param {!Array.<!lf.Row>} rows
 */
lf.cache.ConstraintChecker.prototype.checkPrimaryKeyExistence = function(
    table, rows) {
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  if (goog.isNull(pkIndexSchema)) {
    // There is no primary key for the given table, nothing to check.
    return;
  }

  var existingPrimaryKey = null;
  var primaryKeyAlreadyExists = rows.some(
      function(row) {
        var existingRowId = this.findExistingRowIdInPkIndex(table, row);
        if (!goog.isNull(existingRowId)) {
          existingPrimaryKey = row.keyOfIndex(
              pkIndexSchema.getNormalizedName());
          return true;
        }

        return false;
      }, this);

  if (primaryKeyAlreadyExists) {
    throw new lf.Exception(
        lf.Exception.Type.CONSTRAINT,
        'A row with primary key ' + existingPrimaryKey + ' already exists ' +
        ' in table ' + table.getName());
  }
};


/**
 * Checks that the primary keys in the given set of rows are unique.
 * @param {!lf.schema.Table} table
 * @param {!Array.<!lf.Row>} rows
 */
lf.cache.ConstraintChecker.prototype.checkPrimaryKeysUnique = function(
    table, rows) {
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  if (goog.isNull(pkIndexSchema)) {
    // There is no primary key for the given table, nothing to check.
    return;
  }

  var primaryKeys = new goog.structs.Set();
  rows.forEach(function(row) {
    var primaryKey = row.keyOfIndex(pkIndexSchema.getNormalizedName());
    primaryKeys.add(primaryKey);
  });

  if (primaryKeys.getCount() < rows.length) {
    throw new lf.Exception(
        lf.Exception.Type.CONSTRAINT,
        'Primary key violation when inserting rows to ' +
        table.getName());
  }
};


/**
 * Checks if any primary key violation occurs as a result of updating the given
 * set of rows.
 * @param {!lf.schema.Table} table
 * @param {!Array.<!lf.Row>} rows
 */
lf.cache.ConstraintChecker.prototype.checkPrimaryKeyUpdate = function(
    table, rows) {
  var primaryKeyModified = rows.some(function(updatedRow) {
    var existingRowId = this.findExistingRowIdInPkIndex(table, updatedRow);
    return existingRowId != updatedRow.id();
  }, this);

  if (!primaryKeyModified) {
    // Primary key is not modified so there is nothing to be checked.
    return;
  }

  if (rows.length > 1) {
    // Primary key is set to the same value for multiple rows. The query syntax
    // for update accepts only literals as values therefore all modified rows
    // will result in having the same value for the affeted column.
    throw new lf.Exception(
        lf.Exception.Type.CONSTRAINT,
        'Primary key violation when updating rows for ' + table.getName());
  } else {
    this.checkPrimaryKeyExistence(table, [rows[0]]);
  }
};
