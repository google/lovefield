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
goog.provide('lf.backstore.WebSqlRawBackStore');

goog.require('goog.Promise');
goog.require('lf.Exception');
goog.require('lf.Row');
goog.require('lf.TransactionType');
goog.require('lf.backstore.IndexedDBRawBackStore');
goog.require('lf.backstore.WebSqlTx');
goog.require('lf.cache.Journal');
goog.require('lf.raw.BackStore');
goog.require('lf.structs.set');



/**
 * WebSQL raw back store. Please note that all altering functions will commit
 * immediately due to implementation restrictions. This is different from the
 * IndexedDB raw back store.
 *
 * @implements {lf.raw.BackStore.<Database>}
 * @constructor
 * @struct
 * @final
 * @export
 *
 * @param {!lf.Global} global
 * @param {number} oldVersion
 * @param {!Database} db
 */
lf.backstore.WebSqlRawBackStore = function(global, oldVersion, db) {
  /** @private {!Database} */
  this.db_ = db;

  /** @private {!lf.Global} */
  this.global_ = global;

  /** @private {number} */
  this.version_ = oldVersion;
};


/** @override @export */
lf.backstore.WebSqlRawBackStore.prototype.getRawDBInstance = function() {
  return this.db_;
};


/** @override @export */
lf.backstore.WebSqlRawBackStore.prototype.getRawTransaction = function() {
  // 356: Use WebSQL instance to create transaction instead.
  throw new lf.Exception(356);
};


/**
 * @return {!lf.backstore.WebSqlTx}
 * @private
 */
lf.backstore.WebSqlRawBackStore.prototype.createTx_ = function() {
  return new lf.backstore.WebSqlTx(
      this.db_,
      lf.TransactionType.READ_WRITE,
      new lf.cache.Journal(this.global_, lf.structs.set.create()));
};


/** @override @export */
lf.backstore.WebSqlRawBackStore.prototype.dropTable = function(tableName) {
  var tx = this.createTx_();
  tx.queue('DROP TABLE ' + tableName, []);
  return tx.commit();
};


/**
 * @param {string} tableName
 * @return {!IThenable<!Array<!lf.Row.Raw>>}
 * @private
 */
lf.backstore.WebSqlRawBackStore.prototype.dumpTable_ = function(tableName) {
  var tx = this.createTx_();
  tx.queue('SELECT id, value FROM ' + tableName, []);
  return tx.commit().then(function(results) {
    var length = results[0].rows.length;
    var rows = new Array(length);
    for (var i = 0; i < length; ++i) {
      rows[i] = /** @type {!lf.Row.Raw} */ ({
        id: results[0].rows.item(i)['id'],
        value: JSON.parse(results[0].rows.item(i)['value'])
      });
    }

    return goog.Promise.resolve(rows);
  });
};


/**
 * @param {string} tableName
 * @param {!function(!lf.Row.Raw): !lf.Row.Raw} transformer
 * @return {!IThenable}
 * @private
 */
lf.backstore.WebSqlRawBackStore.prototype.transformColumn_ = function(
    tableName, transformer) {
  var tx = this.createTx_();
  var sql = 'UPDATE ' + tableName + ' SET value=? WHERE id=?';
  return this.dumpTable_(tableName).then(function(rows) {
    rows.forEach(function(row) {
      var newRow = transformer(row);
      tx.queue(sql, [JSON.stringify(newRow.value), newRow.id]);
    });
    return tx.commit();
  });
};


/** @override @export */
lf.backstore.WebSqlRawBackStore.prototype.addTableColumn = function(
    tableName, columnName, defaultValue) {
  var value = lf.backstore.IndexedDBRawBackStore.convert(defaultValue);

  return this.transformColumn_(tableName, function(row) {
    row.value[columnName] = value;
    return row;
  });
};


/** @override @export */
lf.backstore.WebSqlRawBackStore.prototype.dropTableColumn = function(
    tableName, columnName) {
  return this.transformColumn_(tableName, function(row) {
    delete row.value[columnName];
    return row;
  });
};


/** @override @export */
lf.backstore.WebSqlRawBackStore.prototype.renameTableColumn = function(
    tableName, oldColumnName, newColumnName) {
  return this.transformColumn_(tableName, function(row) {
    row.value[newColumnName] = row.value[oldColumnName];
    delete row.value[oldColumnName];
    return row;
  });
};


/** @override @export */
lf.backstore.WebSqlRawBackStore.prototype.createRow = function(payload) {
  var data = {};
  for (var key in payload) {
    data[key] = lf.backstore.IndexedDBRawBackStore.convert(payload[key]);
  }

  return lf.Row.create(data);
};


/** @override @export */
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


/** @override @export */
lf.backstore.WebSqlRawBackStore.prototype.dump = function() {
  var resolver = goog.Promise.withResolver();

  var tx = this.createTx_();
  lf.backstore.WebSqlRawBackStore.queueListTables(tx);

  var ret = {};
  tx.commit().then(function(results) {
    var tables = results[0].filter(function(name) {
      return name != '__lf_ver' && name != '__WebKitDatabaseInfoTable__';
    });
    var promises = tables.map(
        /** @this {!lf.backstore.WebSqlRawBackStore} */
        function(tableName) {
          return this.dumpTable_(tableName).then(function(rows) {
            ret[tableName] = rows;
          });
        }, this);
    goog.Promise.all(promises).then(function() {
      resolver.resolve(ret);
    });
  }.bind(this));

  return resolver.promise;
};
