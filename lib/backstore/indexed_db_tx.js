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
goog.provide('lf.backstore.IndexedDBTx');

goog.require('goog.log');
goog.require('lf.backstore.BaseTx');
goog.require('lf.backstore.ObjectStore');



/**
 * Wrapper for IDBTransaction object obtained from IndexedDB.
 * @constructor
 * @struct
 * @extends {lf.backstore.BaseTx}
 *
 * @param {!IDBTransaction} transaction
 * @param {!lf.cache.Journal} journal
 * @param {!lf.TransactionType} txType
 */
lf.backstore.IndexedDBTx = function(transaction, journal, txType) {
  lf.backstore.IndexedDBTx.base(this, 'constructor', journal, txType);

  /** @private {!IDBTransaction} */
  this.tx_ = transaction;

  /** @private {goog.debug.Logger} */
  this.logger_ = goog.log.getLogger('lf.backstore.IndexedDBTx');

  this.tx_.oncomplete = goog.bind(this.resolver.resolve, this.resolver);
  this.tx_.onabort = goog.bind(this.resolver.reject, this.resolver);
};
goog.inherits(lf.backstore.IndexedDBTx, lf.backstore.BaseTx);


/** @override */
lf.backstore.IndexedDBTx.prototype.getLogger = function() {
  return this.logger_;
};


/** @override */
lf.backstore.IndexedDBTx.prototype.getTable = function(table) {
  return new lf.backstore.ObjectStore(
      this.tx_.objectStore(table.getName()),
      table.deserializeRow);
};


/** @override */
lf.backstore.IndexedDBTx.prototype.abort = function() {
  this.tx_.abort();
};
