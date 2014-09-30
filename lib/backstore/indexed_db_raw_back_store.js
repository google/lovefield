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
goog.provide('lf.backstore.IndexedDBRawBackStore');

goog.require('goog.Promise');
goog.require('goog.object');
goog.require('goog.structs.Map');
goog.require('lf.Row');
goog.require('lf.raw.BackStore');



/**
 * IndexedDB wrapper during database upgrade.
 * @implements {lf.raw.BackStore.<IDBDatabase>}
 * @constructor
 * @struct
 * @final
 *
 * @param {number} version
 * @param {!IDBDatabase} db The IndexedDB from IDBOpenDBRequest.
 * @param {!IDBTransaction} tx The IndexedDB upgrade transaction from
 *     IDBOpenDBRequest.
 */
lf.backstore.IndexedDBRawBackStore = function(version, db, tx) {
  /** @private {!IDBDatabase} */
  this.db_ = db;

  /** @private {!IDBTransaction} */
  this.tx_ = tx;

  /** @private {number} */
  this.version_ = version;
};


/** @override */
lf.backstore.IndexedDBRawBackStore.prototype.getRawDBInstance = function() {
  return this.db_;
};


/** @override */
lf.backstore.IndexedDBRawBackStore.prototype.getRawTransaction = function() {
  return this.tx_;
};


/** @override */
lf.backstore.IndexedDBRawBackStore.prototype.dropTable = function(tableName) {
  return new goog.Promise(function(resolve, reject) {
    try {
      this.db_.deleteObjectStore(tableName);
    } catch (e) {
      reject(e);
      return;
    }
    resolve();
  }, this);
};


/**
 * @param {string} tableName
 * @param {!function(!IDBCursor)} loopFunc Function to run in cursor loop.
 * @param {!function(!IDBObjectStore)} endFunc Function to run when loop ends
 * @return {!IThenable}
 * @private
 */
lf.backstore.IndexedDBRawBackStore.prototype.openCursorForWrite_ = function(
    tableName, loopFunc, endFunc) {
  return new goog.Promise(function(resolve, reject) {
    var req;
    try {
      var store = this.tx_.objectStore(tableName);
      req = store.openCursor();
    } catch (e) {
      reject(e);
      return;
    }
    req.onsuccess = function(ev) {
      var cursor = /** @type {IDBCursor} */ (req.result);
      if (cursor) {
        loopFunc(cursor);
        cursor.continue();
      } else {
        endFunc(store);
        resolve();
      }
    };
    req.onerror = reject;
  }, this);
};


/**
 * @param {string|number|boolean|Date|ArrayBuffer|null} value
 * @return {string|number|boolean|null} Converted value
 */
lf.backstore.IndexedDBRawBackStore.convert = function(value) {
  var ret = null;
  if (value instanceof ArrayBuffer) {
    ret = lf.Row.binToHex(value);
  } else if (value instanceof Date) {
    ret = value.getTime();
  } else {
    ret = value;
  }
  return ret;
};


/** @override */
lf.backstore.IndexedDBRawBackStore.prototype.addTableColumn = function(
    tableName, columnName, defaultValue) {
  var value = lf.backstore.IndexedDBRawBackStore.convert(defaultValue);
  var loopFunc = function(cursor) {
    var row = lf.Row.deserialize(cursor.value);
    row.payload()[columnName] = value;
    cursor.update(row.serialize());
  };
  var endFunc = function() {};
  return this.openCursorForWrite_(tableName, loopFunc, endFunc);
};


/** @override */
lf.backstore.IndexedDBRawBackStore.prototype.dropTableColumn = function(
    tableName, columnName) {
  var loopFunc = function(cursor) {
    var row = lf.Row.deserialize(cursor.value);
    delete row.payload()[columnName];
    cursor.update(row.serialize());
  };
  var endFunc = function() {};
  return this.openCursorForWrite_(tableName, loopFunc, endFunc);
};


/**
 * @param {string} tableName
 * @return {!IThenable.<!Array.<{id: number, value: *}>>} data
 * @private
 */
lf.backstore.IndexedDBRawBackStore.prototype.getTableRows_ = function(
    tableName) {
  var results = [];
  return new goog.Promise(function(resolve, reject) {
    var req;
    try {
      req = this.tx_.objectStore(tableName).openCursor();
    } catch (e) {
      reject(e);
      return;
    }
    req.onsuccess = function(ev) {
      var cursor = req.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = reject;
  }, this);
};


/** @override */
lf.backstore.IndexedDBRawBackStore.prototype.createRow = function(payload) {
  var data = {};
  goog.object.forEach(payload, goog.bind(function(value, key) {
    data[key] = lf.backstore.IndexedDBRawBackStore.convert(value);
  }, this));
  return lf.Row.create(data);
};


/** @override */
lf.backstore.IndexedDBRawBackStore.prototype.getVersion = function() {
  return this.version_;
};


/** @override */
lf.backstore.IndexedDBRawBackStore.prototype.dump = function() {
  var tables = this.db_.objectStoreNames;
  var promises = [];
  for (var i = 0; i < tables.length; ++i) {
    var tableName = tables.item(i);
    promises.push(this.dumpTable_(tableName));
  }

  return goog.Promise.all(promises).then(
      function(tableDumps) {
        var results = {};
        tableDumps.forEach(function(tableDump, index) {
          results[tables.item(index)] = tableDump;
        });
        return results;
      });
};


/**
 * @param {string} tableName
 * @return {!IThenable.<!Array.<!Object>>}
 * @private
 */
lf.backstore.IndexedDBRawBackStore.prototype.dumpTable_ = function(tableName) {
  return this.getTableRows_(tableName).then(
      function(rawRows) {
        return rawRows.map(function(rawRow) {
          return rawRow['value'];
        });
      });
};
