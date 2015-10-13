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
goog.provide('lf.backstore.IndexedDB');

goog.require('goog.Promise');
goog.require('lf.BackStore');
goog.require('lf.Exception');
goog.require('lf.Row');
goog.require('lf.TransactionType');
goog.require('lf.backstore.IndexedDBRawBackStore');
goog.require('lf.backstore.IndexedDBTx');
goog.require('lf.backstore.Page');
goog.require('lf.structs.set');



/**
 * IndexedDB-backed back store.
 *
 * The backstore supports "Bundle Mode", which will bundle 2^BUNDLE_EXPONENT
 * logical rows into a physical row (called bundled page) and store it in DB.
 * The reason behind this is to workaround IndexedDB spec design flaw in loading
 * large tables. Say one wanted to load all rows from table, the implementation
 * based on current spec is
 *
 * var req = objectStore.openCursor();
 * req.onsuccess = function() {
 *   if (cursor) {
 *     // get one row by using cursor.value
 *     cursor.continue();
 *   } else {
 *     // finished
 *   }
 * };
 *
 * Which involves N calls of cursor.continue and N eventing of onsuccess. This
 * is very expensive when N is big. WebKit needs 57us for firing an event on an
 * HP Z620, and the wall clock time for loading 100K rows will be 5.7s just for
 * firing N onsuccess events.
 *
 * As a result, the bundle mode is created to bundle many rows into a physical
 * row to workaround overhead caused by number of rows.
 *
 * @constructor
 * @struct
 * @final
 * @implements {lf.BackStore}
 *
 * @param {!lf.Global} global
 * @param {!lf.schema.Database} schema
 */
lf.backstore.IndexedDB = function(global, schema) {
  /** @private {!lf.Global} */
  this.global_ = global;

  /** @private {!lf.schema.Database} */
  this.schema_ = schema;

  /** @private {!IDBDatabase} */
  this.db_;

  /** @private {boolean} */
  this.bundledMode_ = /** @type {boolean} */ (
      schema.pragma().enableBundledMode) || false;
};


/** @override */
lf.backstore.IndexedDB.prototype.init = function(opt_onUpgrade) {
  var indexedDB =
      window.indexedDB ||
      window.mozIndexedDB ||
      window.webkitIndexedDB ||
      window.msIndexedDB;
  if (!goog.isDefAndNotNull(indexedDB)) {
    // 352: IndexedDB is not supported by platform.
    throw new lf.Exception(352);
  }

  var onUpgrade = opt_onUpgrade || function(rawDb) {
    return goog.Promise.resolve();
  };

  return new goog.Promise(function(resolve, reject) {
    var request;
    try {
      request = indexedDB.open(
          this.schema_.name(), this.schema_.version());
    } catch (e) {
      reject(e);
      return;
    }

    // Event sequence for IndexedDB database upgrade:
    // indexedDB.open found version mismatch
    //   --> onblocked (maybe, see http://www.w3.org/TR/IndexedDB 3.3.7)
    //   --> onupgradeneeded (when IndexedDB is ready to handle the connection)
    //   --> onsuccess
    // As a result the onblocked event is not handled deliberately.
    request.onerror = function(e) {
      var error = e.target.error;
      // 361: Unable to open IndexedDB database.
      reject(new lf.Exception(361, error.name, error.message));
    };
    request.onupgradeneeded = function(ev) {
      this.onUpgradeNeeded_(onUpgrade, ev).then(
          function() {}, reject);
    }.bind(this);
    request.onsuccess = function(ev) {
      this.db_ = ev.target.result;
      this.scanRowId_().then(function(rowId) {
        lf.Row.setNextId(rowId + 1);
        resolve(this.db_);
      }.bind(this));
    }.bind(this);
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
  var rawDb = new lf.backstore.IndexedDBRawBackStore(
      ev.oldVersion, db, tx, this.bundledMode_);
  this.removeIndexTables_(db, tx);
  this.createTables_(db);
  return onUpgrade(rawDb);
};


/**
 * Removes Lovefield-created index tables.
 * @param {!IDBDatabase} db
 * @param {!IDBTransaction} tx The IndexedDB upgrade transaction from
 *     IDBOpenDBRequest.
 * @private
 */
lf.backstore.IndexedDB.prototype.removeIndexTables_ = function(db, tx) {
  var storeNames = [];
  for (var i = 0; i < db.objectStoreNames.length; ++i) {
    var name = db.objectStoreNames.item(i);
    // Remove all persisted indices.
    if (name.indexOf('.') != -1) {
      storeNames.push(name);
    }
  }
  storeNames.forEach(function(store) {
    try {
      db.deleteObjectStore(store);
    } catch (e) {
      // Ignore the error.
    }
  });
};


/**
 * Creates tables if they had not existed on the database.
 * @param {!IDBDatabase} db
 * @private
 */
lf.backstore.IndexedDB.prototype.createTables_ = function(db) {
  this.schema_.tables().forEach(
      goog.partial(this.createObjectStoresForTable_, db),
      this);
};


/**
 * Creates all backing store tables for the given user-defined table.
 * @param {!IDBDatabase} db
 * @param {!lf.schema.Table} tableSchema The table schema.
 * @private
 */
lf.backstore.IndexedDB.prototype.createObjectStoresForTable_ = function(
    db, tableSchema) {
  if (!db.objectStoreNames.contains(tableSchema.getName())) {
    db.createObjectStore(tableSchema.getName(), {keyPath: 'id'});
  }

  if (tableSchema.persistentIndex()) {
    var tableIndices = tableSchema.getIndices();
    tableIndices.forEach(
        /**
         * @param {!lf.schema.Index} indexSchema
         * @this {lf.backstore.IndexedDB}
         */
        function(indexSchema) {
          this.createIndexTable_(db, indexSchema.getNormalizedName());
        }, this);

    // Creating RowId index table.
    this.createIndexTable_(db, tableSchema.getRowIdIndexName());
  }
};


/**
 * Creates a backing store corresponding to a persisted index.
 * @param {!IDBDatabase} db
 * @param {string} indexName The normalized name of the index.
 *     index.
 * @private
 */
lf.backstore.IndexedDB.prototype.createIndexTable_ = function(
    db, indexName) {
  if (!db.objectStoreNames.contains(indexName)) {
    db.createObjectStore(indexName, {keyPath: 'id'});
  }
};


/** @override */
lf.backstore.IndexedDB.prototype.createTx = function(
    type, scope, opt_journal) {
  var nativeTx = this.db_.transaction(
      lf.backstore.IndexedDB.getIndexedDBScope_(scope),
      type == lf.TransactionType.READ_ONLY ? 'readonly' : 'readwrite');
  return new lf.backstore.IndexedDBTx(
      this.global_, nativeTx, type, this.bundledMode_, opt_journal);
};


/**
 * @param {!Array<!lf.schema.Table>} scope
 * @return {!Array<string>}
 * @private
 */
lf.backstore.IndexedDB.getIndexedDBScope_ = function(scope) {
  var indexedDBScope = lf.structs.set.create();

  scope.forEach(function(tableSchema) {
    // Adding user-defined table to the scope.
    indexedDBScope.add(tableSchema.getName());

    // If the table has persisted indices, adding the corresponding backing
    // store tables to the scope too.
    if (tableSchema.persistentIndex()) {
      var tableIndices = tableSchema.getIndices();
      tableIndices.forEach(
          /** @param {!lf.schema.Index} indexSchema */
          function(indexSchema) {
            indexedDBScope.add(indexSchema.getNormalizedName());
          });

      // Adding RowId backing store name to the scope.
      indexedDBScope.add(tableSchema.getRowIdIndexName());
    }
  });

  return lf.structs.set.values(indexedDBScope);
};


/**
 * Scans existing database and find the maximum row id.
 * @param {!IDBTransaction=} opt_tx
 * @return {!IThenable<number>}
 * @private
 */
lf.backstore.IndexedDB.prototype.scanRowId_ = function(opt_tx) {
  var tableNames = this.schema_.tables().map(function(table) {
    return table.getName();
  });

  var db = this.db_;
  var maxRowId = 0;

  /**
   * @param {!IDBCursor} cursor
   * @return {number} Max row id
   * @this {lf.backstore.IndexedDB}
   */
  var extractRowId = function(cursor) {
    if (this.bundledMode_) {
      var page = lf.backstore.Page.deserialize(cursor.value);
      return Object.keys(page.getPayload()).reduce(function(prev, cur) {
        return Math.max(prev, cur);
      }, 0);
    }

    return cursor.key;
  }.bind(this);

  /**
   * @param {string} tableName
   * @return {!IThenable}
   */
  var scanTableRowId = function(tableName) {
    return new goog.Promise(function(resolve, reject) {
      var req;
      try {
        var tx = opt_tx || db.transaction([tableName]);
        req = tx.objectStore(tableName).openCursor(null, 'prev');
      } catch (e) {
        reject(e);
        return;
      }
      req.onsuccess = function(ev) {
        var cursor = ev.target.result;
        if (cursor) {
          // Since the cursor is traversed in the reverse direction, only the
          // first record needs to be examined to determine the max row ID.
          maxRowId = Math.max(maxRowId, extractRowId(cursor));
        }
        resolve(maxRowId);
      };
      req.onerror = function() {
        resolve(maxRowId);
      };
    });
  };

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


/** @override */
lf.backstore.IndexedDB.prototype.getTableInternal = function(tableName) {
  // 511: IndexedDB tables needs to be acquired from transactions.
  throw new lf.Exception(511);
};


/** @override */
lf.backstore.IndexedDB.prototype.subscribe = function(handler) {
  // Not supported yet.
};


/** @override */
lf.backstore.IndexedDB.prototype.unsubscribe = function() {
  // Not supported yet.
};


/** @override */
lf.backstore.IndexedDB.prototype.notify = function(changes) {
  // Not supported.
};
