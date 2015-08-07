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
goog.provide('lf.raw.BackStore');



/**
 * Raw datastore interface passed to onUpgrade() function.
 * @template RawDB, RawTx
 * @interface
 */
lf.raw.BackStore = function() {};


/**
 * @return {RawDB} Original database instance that can be used for low-level
 *     data manipulations, not really useful for IndexedDB.
 */
lf.raw.BackStore.prototype.getRawDBInstance;


/**
 * @return {RawTx} Original database upgrade transaction.
 */
lf.raw.BackStore.prototype.getRawTransaction;


/**
 * Removes a table from data store. Lovefield does not support automatic
 * dropping table. Users must call dropTable manually during upgrade to purge
 * table that is no longer used from database.
 * @param {string} tableName
 * @return {!IThenable}
 */
lf.raw.BackStore.prototype.dropTable;


/**
 * Adds a column to existing table rows. This API does not provide any
 * consistency check. Callers are solely responsible for making sure the values
 * of `columnName` and `defaultValue` are consistent with the new schema.
 * @param {string} tableName
 * @param {string} columnName
 * @param {string|number|boolean|Date|ArrayBuffer|null} defaultValue
 * @return {!IThenable}
 */
lf.raw.BackStore.prototype.addTableColumn;


/**
 * @param {string} tableName
 * @param {string} columnName
 * @return {!IThenable}
 */
lf.raw.BackStore.prototype.dropTableColumn;


/**
 * Renames a column for all existing table rows.
 * @param {string} tableName
 * @param {string} oldColumnName
 * @param {string} newColumnName
 * @return {!IThenable}
 */
lf.raw.BackStore.prototype.renameTableColumn;


/**
 * Creates a Lovefield row structure that can be stored into raw DB instance
 * via raw transaction.
 * @param {!Object} payload
 * @return {!lf.Row}
 */
lf.raw.BackStore.prototype.createRow;


/** @return {number} Version of existing DB. */
lf.raw.BackStore.prototype.getVersion;


/**
 * Offers last resort for data rescue. This function dumps all rows in the
 * database to one single JSON object.
 * @return {!IThenable<!Object>} All rows in DB. The format is a JSON object of
 *     {
 *        "table1": [ <row1>, <row2>, ..., <rowN> ],
 *        "table2": [ ... ],
 *        ...
 *        "tableM": [ ... ]
 *     }
 */
lf.raw.BackStore.prototype.dump;
