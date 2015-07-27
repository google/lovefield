/**
 * @license
 * Copyright 2015 The Lovefield Project Authors. All Rights Reserved.
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

goog.require('lf.TransactionType');
goog.require('lf.backstore.BaseTx');
goog.require('lf.backstore.WebSqlTable');
goog.require('lf.structs.map');



/**
 * Wrapper for Transaction object obtained from WebSQL.
 * @constructor
 * @struct
 * @extends {lf.backstore.BaseTx}
 *
 * @param {!Database} db
 * @param {!lf.cache.Journal} journal
 * @param {!lf.TransactionType} txType
 */
lf.backstore.WebSqlTx = function(db, journal, txType) {
  lf.backstore.WebSqlTx.base(this, 'constructor', journal, txType);

  /** @private {!Database} */
  this.db_ = db;

  /** @private {!SQLTransaction} */
  this.tx_;

  /** @private {!lf.structs.Map<string, !lf.backstore.WebSqlTable>} */
  this.tables_ = lf.structs.map.create();

  /** @private {!Array<!lf.backstore.WebSqlTx.Command_>} */
  this.commands_ = [];
};
goog.inherits(lf.backstore.WebSqlTx, lf.backstore.BaseTx);


/**
 * @typedef {{
 *   statement: string,
 *   params: !Array,
 *   transform: (undefined|!function(!Object):!Array<!lf.Row.Raw>)
 * }}
 */
lf.backstore.WebSqlTx.Command_;


/** @override */
lf.backstore.WebSqlTx.prototype.getTable = function(tableName, deserializeFn) {
  var table = this.tables_.get(tableName) || null;
  if (goog.isNull(table)) {
    table = new lf.backstore.WebSqlTable(this, tableName, deserializeFn);
    this.tables_.set(tableName, table);
  }

  return table;
};


/**
 * Queues a SQL statement for the transaction.
 * @param {string} statement
 * @param {!Array} params
 * @param {!function(!Object):!Array<!lf.Row.Raw>=} opt_transform
 */
lf.backstore.WebSqlTx.prototype.queue = function(
    statement, params, opt_transform) {
  this.commands_.push({
    statement: statement,
    params: params,
    transform: opt_transform
  });
};


/** @override */
lf.backstore.WebSqlTx.prototype.commitInternal = function() {
  var lastResults;
  var transformer;
  var onTxError = this.resolver.reject.bind(this.resolver);
  var onExecError = function(tx, e) {
    this.resolver.reject(e);
  }.bind(this);

  var callback = goog.bind(function(tx, results) {
    lastResults = results;
    if (this.commands_.length) {
      var command = this.commands_.shift();
      transformer = command.transform;
      tx.executeSql(command.statement, command.params, callback, onExecError);
    } else {
      var ret = lastResults;
      if (goog.isDefAndNotNull(transformer) &&
          goog.isDefAndNotNull(lastResults)) {
        ret = transformer(lastResults);
      }
      this.resolver.resolve(ret);
    }
  }, this);

  if (this.txType == lf.TransactionType.READ_ONLY) {
    this.db_.readTransaction(callback, onTxError);
  } else {
    this.db_.transaction(callback, onTxError);
  }

  return this.resolver.promise;
};


/** @override */
lf.backstore.WebSqlTx.prototype.abort = function() {
  this.commands_ = [];
};
