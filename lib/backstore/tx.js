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
goog.provide('lf.backstore.Tx');

goog.forwardDeclare('lf.backstore.TableType');



/**
 * Tx objects are wrappers of backstore-provided transactions. The interface
 * defines common methods for these wrappers.
 * @interface
 */
lf.backstore.Tx = function() {};


/**
 * @param {string} tableName  The name of the requested table. Throws an
 *     exception if such a table does not exist.
 * @param {!function(!lf.Row.Raw): !lf.Row} deserializeFn The
 *     function to call for deserializing DB records in this table.
 * @param {!lf.backstore.TableType} tableType The type of the requested
 *     table.
 * @return {!lf.Table}
 * @throws {lf.Exception}
 */
lf.backstore.Tx.prototype.getTable;


/**
 * @return {?lf.cache.Journal} The journal associated with this transaction.
 *     The journal keeps track of all changes happened within the transaction.
 *     Null if this is a READ_ONLY transaction.
 */
lf.backstore.Tx.prototype.getJournal;


/**
 * Commits transaction by applying all changes in this transaction's journal to
 * the backing store.
 * @return {!IThenable} A signal that all changes were written to the backing
 *     store.
 */
lf.backstore.Tx.prototype.commit;


/**
 * Aborts tranaction. Caller shall listen to rejection of commit() to detect
 * end of transaction.
 * @type {function()}
 */
lf.backstore.Tx.prototype.abort;


/**
 * Returns transaction stats if transaction is finalized, otherwise null.
 * @return {?lf.TransactionStats}
 */
lf.backstore.Tx.prototype.stats;
