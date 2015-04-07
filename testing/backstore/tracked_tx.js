/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
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
goog.provide('lf.testing.backstore.TrackedTx');

goog.require('goog.structs.Map');
goog.require('lf.TransactionType');
goog.require('lf.backstore.BaseTx');
goog.require('lf.testing.backstore.TrackedTable');



/**
 * Pseudo transaction object that tracks all changes made for a single flush.
 * @constructor
 * @struct
 * @extends {lf.backstore.BaseTx}
 *
 * @param {!lf.BackStore} store
 * @param {!lf.TransactionType} type
 * @param {!lf.cache.Journal} journal
 */
lf.testing.backstore.TrackedTx = function(store, type, journal) {
  lf.testing.backstore.TrackedTx.base(this, 'constructor', journal, type);

  /** @private {!lf.BackStore} */
  this.store_ = store;

  /**
   * A directory of all the table connections that have been created within this
   * transaction.
   * @private {!goog.structs.Map<string, !lf.testing.backstore.TrackedTable>}
   */
  this.tables_ = new goog.structs.Map();

  if (type == lf.TransactionType.READ_ONLY) {
    this.resolver.resolve();
  }
};
goog.inherits(lf.testing.backstore.TrackedTx, lf.backstore.BaseTx);


/** @override */
lf.testing.backstore.TrackedTx.prototype.getTable = function(
    tableName, deserializeFn) {
  var table = this.tables_.get(tableName, null);
  if (goog.isNull(table)) {
    table = new lf.testing.backstore.TrackedTable(
        this.store_.getTableInternal(tableName), tableName);
    this.tables_.set(tableName, table);
  }

  return table;
};


/** @override */
lf.testing.backstore.TrackedTx.prototype.abort = function() {
  this.resolver.reject(undefined);
};


/** @override */
lf.testing.backstore.TrackedTx.prototype.commit = function() {
  lf.testing.backstore.TrackedTx.base(this, 'commit');

  var requests = [];
  var tableDiffs = [];
  this.tables_.getKeys().forEach(
      function(tableName) {
        var table = this.tables_.get(tableName);
        requests.push(table.whenRequestsDone());
        tableDiffs.push(table.getDiff());
      }, this);

  // Waiting for all asynchronous operations to finish.
  return goog.Promise.all(requests).then(function() {
    // Notifying observers.
    this.store_.notify(tableDiffs);
    this.resolver.resolve();
    return this.resolver.promise;
  }.bind(this));
};
