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

goog.require('goog.structs.Set');
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
        throw new lf.Exception(
            lf.Exception.Type.CONSTRAINT,
            'Attempted to insert NULL value to non-nullable field ' +
            column.getNormalizedName());
      }
    }, this);
  }, this);
};
