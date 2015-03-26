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
goog.provide('lf.BackStore');

goog.forwardDeclare('lf.Table');
goog.forwardDeclare('lf.TransactionType');
goog.forwardDeclare('lf.backstore.Tx');
goog.forwardDeclare('lf.cache.TableDiff');
goog.forwardDeclare('lf.cache.Journal');
goog.forwardDeclare('lf.raw.BackStore');



/**
 * Interface for all backing stores to implement (Indexed DB, filesystem,
 * memory etc).
 * @interface
 */
lf.BackStore = function() {};


/**
 * Initialize the database and setting up row id.
 * @param {function(!lf.raw.BackStore):!IThenable=} opt_onUpgrade
 * @return {!IThenable} A promise firing after this backing store has been
 *     initialized.
 */
lf.BackStore.prototype.init;


/**
 * Creates backstore native transaction that is tied to a given journal.
 * @param {!lf.TransactionType} type
 * @param {!lf.cache.Journal} journal
 * @return {!lf.backstore.Tx}
 */
lf.BackStore.prototype.createTx;


/**
 * Closes the database. This is just best-effort.
 */
lf.BackStore.prototype.close;


/**
 * Returns one table based on table name.
 * @param {string} tableName
 * @return {!lf.Table}
 * @throws {lf.Exception}
 */
lf.BackStore.prototype.getTableInternal;


/**
 * Subscribe to back store changes outside of this connection. Each change event
 * corresponds to one transaction. The events will be fired in the order of
 * reception, which implies the order of transactions happening. Each backstore
 * will allow only one change handler.
 * @param {!function(!Array<!lf.cache.TableDiff>)} handler
 */
lf.BackStore.prototype.subscribe;


/**
 * Unsubscribe current change handler.
 */
lf.BackStore.prototype.unsubscribe;


/**
 * Notifies registered observers with table diffs.
 * @param {!Array<!lf.cache.TableDiff>} changes
 */
lf.BackStore.prototype.notify;
