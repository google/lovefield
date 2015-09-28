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

goog.require('goog.Promise');
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
 * @param {!lf.TransactionType} txType
 * @param {!lf.cache.Journal=} opt_journal
 */
lf.backstore.WebSqlTx = function(db, txType, opt_journal) {
  lf.backstore.WebSqlTx.base(this, 'constructor', txType, opt_journal);

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
 *   transform: (undefined|!function(!Object):!Array<!lf.Row.Raw>),
 *   resolver: !goog.promise.Resolver
 * }}
 */
lf.backstore.WebSqlTx.Command_;


/** @const {string} */
lf.backstore.WebSqlTx.INDEX_MARK = '__d__';


/**
 * SQL standards disallow "." and "#" in the name of table. However, Lovefield
 * will name index tables using their canonical name, which contains those
 * illegal characters. As a result, we need to escape the table name.
 * @param {string} tableName
 * @return {string}
 */
lf.backstore.WebSqlTx.escapeTableName = function(tableName) {
  return tableName.
      replace('.', lf.backstore.WebSqlTx.INDEX_MARK).
      replace('#', '__s__');
};


/** @override */
lf.backstore.WebSqlTx.prototype.getTable = function(tableName, deserializeFn) {
  var table = this.tables_.get(tableName) || null;
  if (goog.isNull(table)) {
    table = new lf.backstore.WebSqlTable(
        this, lf.backstore.WebSqlTx.escapeTableName(tableName), deserializeFn);
    this.tables_.set(tableName, table);
  }

  return table;
};


/**
 * Queues a SQL statement for the transaction.
 * @param {string} statement
 * @param {!Array} params
 * @param {!function(!Object):!Array<!lf.Row.Raw>=} opt_transform
 * @return {!IThenable}
 */
lf.backstore.WebSqlTx.prototype.queue = function(
    statement, params, opt_transform) {
  var resolver = goog.Promise.withResolver();
  this.commands_.push({
    statement: statement,
    params: params,
    transform: opt_transform,
    resolver: resolver
  });
  return resolver.promise;
};


/** @override */
lf.backstore.WebSqlTx.prototype.commitInternal = function() {
  var lastCommand = null;
  var onTxError = this.resolver.reject.bind(this.resolver);
  var onExecError = function(tx, e) {
    this.resolver.reject(e);
  }.bind(this);

  var results = [];
  var callback = function(tx, opt_results) {
    if (!goog.isNull(lastCommand)) {
      var ret = opt_results;
      if (goog.isDefAndNotNull(lastCommand.transform) &&
          goog.isDefAndNotNull(opt_results)) {
        ret = lastCommand.transform(opt_results);
      }
      results.push(ret);
      lastCommand.resolver.resolve(ret);
    }

    if (this.commands_.length > 0) {
      var command = this.commands_.shift();
      lastCommand = command;
      tx.executeSql(command.statement, command.params, callback, onExecError);
    } else {
      this.resolver.resolve(results);
    }
  }.bind(this);

  if (this.txType == lf.TransactionType.READ_ONLY) {
    this.db_.readTransaction(
        /** @type {!function(SQLTransaction)} */ (callback), onTxError);
  } else {
    this.db_.transaction(
        /** @type {!function(SQLTransaction)} */ (callback), onTxError);
  }

  return this.resolver.promise;
};


/** @override */
lf.backstore.WebSqlTx.prototype.abort = function() {
  this.commands_ = [];
};
