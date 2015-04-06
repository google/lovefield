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
goog.provide('lf.backstore.WebSqlRawBackStore');

goog.require('goog.Promise');
goog.require('goog.object');
goog.require('lf.Exception');
goog.require('lf.Row');
goog.require('lf.raw.BackStore');



/**
 * @implements {lf.raw.BackStore.<Database>}
 * @constructor
 * @struct
 * @final
 *
 * @param {number} oldVersion
 * @param {!Database} db
 */
lf.backstore.WebSqlRawBackStore = function(oldVersion, db) {
  /** @private {!Database} */
  this.db_ = db;

  /** @private {number} */
  this.version_ = oldVersion;
};


/** @override */
lf.backstore.WebSqlRawBackStore.prototype.getRawDBInstance = function() {
  return this.db_;
};


/** @override */
lf.backstore.WebSqlRawBackStore.prototype.getRawTransaction = function() {
  throw new lf.Exception(
      lf.Exception.Type.NOT_SUPPORTED,
      'Use the raw instance to create transaction instead.');
};


/** @override */
lf.backstore.WebSqlRawBackStore.prototype.dropTable = function(tableName) {
  // TODO(arthurhsu): implement
  return goog.Promise.reject();
};


/** @override */
lf.backstore.WebSqlRawBackStore.prototype.addTableColumn = function(
    tableName, columnName, defaultValue) {
  // TODO(arthurhsu): implement
  return goog.Promise.reject();
};


/** @override */
lf.backstore.WebSqlRawBackStore.prototype.dropTableColumn = function(
    tableName, columnName) {
  // TODO(arthurhsu): implement
  return goog.Promise.reject();
};


/** @override */
lf.backstore.WebSqlRawBackStore.prototype.renameTableColumn = function(
    tableName, oldColumnName, newColumnName) {
  // TODO(arthurhsu): implement
  return goog.Promise.reject();
};


/** @override */
lf.backstore.WebSqlRawBackStore.prototype.createRow = function(payload) {
  // TODO(arthurhsu): implement
  return lf.Row.create(payload);
};


/** @override */
lf.backstore.WebSqlRawBackStore.prototype.getVersion = function() {
  return this.version_;
};


/** @param {!lf.backstore.WebSqlTx} tx */
lf.backstore.WebSqlRawBackStore.queueListTables = function(tx) {
  var GET_TABLE_NAMES = 'SELECT tbl_name FROM sqlite_master WHERE type="table"';

  tx.queue(GET_TABLE_NAMES, [], function(results) {
    var tableNames = new Array(results.rows.length);
    for (var i = 0; i < tableNames.length; ++i) {
      tableNames[i] = results.rows.item(i)['tbl_name'];
    }
    return tableNames;
  });
};


/** @override */
lf.backstore.WebSqlRawBackStore.prototype.dump = function() {
  // TODO(arthurhsu): implement
  return goog.Promise.reject();
};
