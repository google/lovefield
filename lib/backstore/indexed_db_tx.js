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
goog.provide('lf.backstore.IndexedDBTx');

goog.require('lf.backstore.BaseTx');
goog.require('lf.backstore.BundledObjectStore');
goog.require('lf.backstore.ObjectStore');
goog.require('lf.backstore.TableType');



/**
 * Wrapper for IDBTransaction object obtained from IndexedDB.
 * @constructor
 * @struct
 * @extends {lf.backstore.BaseTx}
 *
 * @param {!lf.Global} global
 * @param {!IDBTransaction} transaction
 * @param {!lf.TransactionType} txType
 * @param {boolean} bundleMode If the containing DB is in bundle mode.
 * @param {!lf.cache.Journal=} opt_journal
 */
lf.backstore.IndexedDBTx = function(
    global, transaction, txType, bundleMode, opt_journal) {
  lf.backstore.IndexedDBTx.base(this, 'constructor', txType, opt_journal);

  /** @private {!lf.Global} */
  this.global_ = global;

  /** @private {!IDBTransaction} */
  this.tx_ = transaction;

  /** @private {boolean} */
  this.bundleMode_ = bundleMode;

  this.tx_.oncomplete = this.resolver.resolve.bind(this.resolver);
  this.tx_.onabort = this.resolver.reject.bind(this.resolver);
};
goog.inherits(lf.backstore.IndexedDBTx, lf.backstore.BaseTx);


/** @override */
lf.backstore.IndexedDBTx.prototype.getTable = function(
    tableName, deserializeFn, opt_tableType) {
  if (this.bundleMode_) {
    var tableType = goog.isDefAndNotNull(opt_tableType) ?
        opt_tableType : lf.backstore.TableType.DATA;
    return lf.backstore.BundledObjectStore.forTableType(
        this.global_, this.tx_.objectStore(tableName),
        deserializeFn, tableType);
  } else {
    return new lf.backstore.ObjectStore(
        this.tx_.objectStore(tableName), deserializeFn);
  }
};


/** @override */
lf.backstore.IndexedDBTx.prototype.abort = function() {
  this.tx_.abort();
};


/** @override */
lf.backstore.IndexedDBTx.prototype.commitInternal = function() {
  return this.resolver.promise;
};
