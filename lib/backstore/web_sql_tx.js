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
goog.provide('lf.backstore.WebSqlTx');

goog.require('goog.Promise');
goog.require('goog.structs.Map');
goog.require('lf.TransactionType');
goog.require('lf.backstore.BaseTx');
goog.require('lf.backstore.TrackedTable');
goog.require('lf.backstore.WebSqlTable');



/**
 * Wrapper for Transaction object obtained from WebSQL.
 * @constructor
 * @struct
 * @extends {lf.backstore.BaseTx}
 *
 * @param {!lf.Global} global
 * @param {!Database} db
 * @param {!lf.cache.Journal} journal
 * @param {!lf.TransactionType} txType
 */
lf.backstore.WebSqlTx = function(global, db, journal, txType) {
  lf.backstore.WebSqlTx.base(this, 'constructor', journal, txType);

  /** @private {!Database} */
  this.db_ = db;

  /** @private {!SQLTransaction} */
  this.tx_;

  /** @private {!goog.structs.Map<string, !lf.backstore.TrackedTable>} */
  this.tables_ = new goog.structs.Map();
};
goog.inherits(lf.backstore.WebSqlTx, lf.backstore.BaseTx);


/**
 * @return {!IThenable}
 * @private
 */
lf.backstore.WebSqlTx.prototype.whenReady_ = function() {
  if (goog.isDefAndNotNull(this.tx_)) {
    return goog.Promise.resolve();
  } else {
    return new goog.Promise(goog.bind(function(resolve, reject) {
      var txHandler = goog.bind(function(tx) {
        this.tx_ = tx;
        resolve();
      }, this);

      if (this.txType == lf.TransactionType.READ_ONLY) {
        this.db_.readTransaction(txHandler, reject);
      } else {
        this.db_.transaction(txHandler, reject);
      }
    }, this));
  }
};


/** @override */
lf.backstore.WebSqlTx.prototype.getTable = function(tableName, deserializeFn) {
  var table = this.tables_.get(tableName, null);
  if (goog.isNull(table)) {
    table = new lf.backstore.TrackedTable(
        new lf.backstore.WebSqlTable(this, tableName, deserializeFn),
        tableName);
    this.tables_.set(tableName, table);
  }

  return table;
};


/** @override */
lf.backstore.WebSqlTx.prototype.commit = function() {
  lf.backstore.WebSqlTx.base(this, 'commit');
  return this.whenReady_().then(goog.bind(function() {
    return goog.Promise.all(this.tables_.getValues().map(function(table) {
      return table.whenRequestsDone();
    }));
  }, this)).then(goog.bind(function() {
    this.resolver.resolve();
  }, this));
};


/** @override */
lf.backstore.WebSqlTx.prototype.abort = function() {
  this.whenReady_().then(goog.bind(function() {
    // This is the way to abort WebSQL transaction: give an invalid statement.
    this.tx_.executeSql('UPDATE .invalid%name SET nada = 1');
  }, this));
};


/**
 * @param {string} sql
 * @param {!Array} params
 * @return {!IThenable}
 */
lf.backstore.WebSqlTx.prototype.execSql = function(sql, params) {
  return this.whenReady_().then(goog.bind(function() {
    return lf.backstore.WebSqlTx.execSql(this.tx_, sql, params);
  }, this));
};


/**
 * Wraps a WebSQL execution as promise.
 * @param {!SQLTransaction} transaction
 * @param {string} sql
 * @param {!Array} params
 * @return {!IThenable}
 */
lf.backstore.WebSqlTx.execSql = function(transaction, sql, params) {
  return new goog.Promise(function(resolve, reject) {
    transaction.executeSql(sql, params, function(tx, results) {
      resolve(results);
    }, function(tx, e) {
      reject(e);
    });
  });
};

