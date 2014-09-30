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
goog.provide('lf.backstore.IndexedDB');

goog.require('goog.Promise');
goog.require('goog.log');
goog.require('lf.BackStore');
goog.require('lf.Exception');
goog.require('lf.Row');
goog.require('lf.TransactionType');
goog.require('lf.backstore.IndexedDBRawBackStore');
goog.require('lf.backstore.IndexedDBTx');

goog.forwardDeclare('goog.debug.Logger');



/**
 * IndexedDB-backed back store.
 * @param {!lf.schema.Database} schema
 * @constructor
 * @struct
 * @final
 * @implements {lf.BackStore}
 */
lf.backstore.IndexedDB = function(schema) {
  /** @private {!lf.schema.Database} */
  this.schema_ = schema;

  /** @private {!IDBDatabase} */
  this.db_;

  /** @private {goog.debug.Logger} */
  this.logger_ = goog.log.getLogger('lf.backstore.IndexedDB');
};


/** @override */
lf.backstore.IndexedDB.prototype.init = function(opt_onUpgrade) {
  var indexedDB =
      window.indexedDB ||
      window.mozIndexedDB ||
      window.webkitIndexedDB ||
      window.msIndexedDB;
  if (!goog.isDefAndNotNull(indexedDB)) {
    throw new lf.Exception(lf.Exception.Type.NOT_SUPPORTED,
        'IndexedDB not supported by platform.');
  }

  var onUpgrade = opt_onUpgrade || function(rawDb) {
    return goog.Promise.resolve();
  };

  return new goog.Promise(function(resolve, reject) {
    var request;
    try {
      request = indexedDB.open(
          this.schema_.getName(), this.schema_.getVersion());
    } catch (e) {
      reject(e);
      return;
    }

    // Event sequence for IndexedDB database upgrade:
    // indexedDB.open found version mismatch
    //   --> onblocked (maybe, see http://www.w3.org/TR/IndexedDB 3.3.7)
    //   --> onupgradeneeded (when IndexedDB is ready to handle the connection)
    //   --> onsuccess
    // As a result the onblocked event is not handled delibrately.
    request.onerror = reject;
    request.onupgradeneeded = goog.bind(function(ev) {
      this.onUpgradeNeeded_(onUpgrade, ev).then(
          function() {},
          goog.bind(function(e) {
            goog.log.error(this.logger_, 'onUpgradeNeeded failed: ' + e);
            // The following call to reject() might be ignored if the IDB
            // transaction has been closed prematurely, because this promise
            // will have (erroneously) already resolved within onsuccess below.
            reject(e);
          }, this));
    }, this);
    request.onsuccess = goog.bind(function(ev) {
      this.db_ = ev.target.result;
      this.scanRowId_().then(goog.bind(function(rowId) {
        lf.Row.setNextId(rowId + 1);
        resolve(this.db_);
      }, this));
    }, this);
  }, this);
};


/**
 * @param {!function(!lf.raw.BackStore):!IThenable} onUpgrade
 * @param {!IDBVersionChangeEvent} ev
 * @return {!IThenable}
 * @private
 */
lf.backstore.IndexedDB.prototype.onUpgradeNeeded_ = function(onUpgrade, ev) {
  var db = ev.target.result;
  var tx = ev.target.transaction;
  var rawDb = new lf.backstore.IndexedDBRawBackStore(ev.oldVersion, db, tx);
  this.createTables_(db);
  return onUpgrade(rawDb);
};


/**
 * Creates tables if they had not existed on the database.
 * @param {!IDBDatabase} db
 * @private
 */
lf.backstore.IndexedDB.prototype.createTables_ = function(db) {
  var schemaTables = this.schema_.getTables().map(function(table) {
    return table.getName();
  });
  for (var i = 0; i < schemaTables.length; ++i) {
    if (!db.objectStoreNames.contains(schemaTables[i])) {
      db.createObjectStore(schemaTables[i], {keyPath: 'id'});
    }
  }
};


/** @override */
lf.backstore.IndexedDB.prototype.createTx = function(
    type, journal) {
  var scope = journal.getScope().getValues().map(
      function(table) {
        return table.getName();
      });
  var nativeTx = this.db_.transaction(scope,
      type == lf.TransactionType.READ_ONLY ? 'readonly' : 'readwrite');
  return new lf.backstore.IndexedDBTx(nativeTx, journal);
};


/**
 * Scans existing database and find the maximum row id.
 * @param {!IDBTransaction=} opt_tx
 * @return {!IThenable.<number>}
 * @private
 */
lf.backstore.IndexedDB.prototype.scanRowId_ = function(opt_tx) {
  var tableNames = this.schema_.getTables().map(function(table) {
    return table.getName();
  });

  var db = this.db_;
  var maxRowId = 0;

  /**
   * @param {string} tableName
   * @return {!IThenable}
   */
  var scanTableRowId = goog.bind(function(tableName) {
    return new goog.Promise(function(resolve, reject) {
      var req;
      try {
        var tx = opt_tx || db.transaction([tableName]);
        req = tx.objectStore(tableName).openCursor(null, 'prev');
      } catch (e) {
        goog.log.error(this.logger_, 'scanRowId failed: ' + e);
        reject(e);
        return;
      }
      req.onsuccess = function(ev) {
        var cursor = ev.target.result;
        if (cursor) {
          maxRowId = Math.max(maxRowId, cursor.key);
          cursor.continue();
        }
        resolve(maxRowId);
      };
      req.onerror = function() {
        resolve(maxRowId);
      };
    }, this);
  }, this);

  /** @return {!IThenable} */
  var execSequentially = function() {
    if (tableNames.length == 0) {
      return goog.Promise.resolve();
    }

    var tableName = tableNames.shift();
    return scanTableRowId(tableName).then(execSequentially);
  };

  return new goog.Promise(function(resolve, reject) {
    execSequentially().then(function() {
      resolve(maxRowId);
    });
  });
};


/** @override */
lf.backstore.IndexedDB.prototype.close = function() {
  this.db_.close();
};
