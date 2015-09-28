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
goog.provide('lf.backstore.LocalStorageTx');

goog.require('lf.TransactionType');
goog.require('lf.backstore.BaseTx');



/**
 * Fake transaction object for LocalStorage backstore.
 * @constructor
 * @struct
 * @extends {lf.backstore.BaseTx}
 *
 * @param {!lf.backstore.LocalStorage} store
 * @param {!lf.TransactionType} type
 * @param {!lf.cache.Journal=} opt_journal
 */
lf.backstore.LocalStorageTx = function(store, type, opt_journal) {
  lf.backstore.LocalStorageTx.base(this, 'constructor', type, opt_journal);

  /** @private {!lf.backstore.LocalStorage} */
  this.store_ = store;

  if (type == lf.TransactionType.READ_ONLY) {
    this.resolver.resolve();
  }
};
goog.inherits(lf.backstore.LocalStorageTx, lf.backstore.BaseTx);


/** @override */
lf.backstore.LocalStorageTx.prototype.getTable = function(
    tableName, deserializeFn, tableType) {
  return this.store_.getTableInternal(tableName);
};


/** @override */
lf.backstore.LocalStorageTx.prototype.abort = function() {
  this.resolver.reject(undefined);
};


/** @override */
lf.backstore.LocalStorageTx.prototype.commitInternal = function() {
  this.store_.commit();
  this.resolver.resolve();
  return this.resolver.promise;
};
