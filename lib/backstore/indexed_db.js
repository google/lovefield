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
goog.require('lf.BackStore');
goog.require('lf.Exception');
goog.require('lf.Row');
goog.require('lf.TransactionType');
goog.require('lf.backstore.BundledObjectStore');
goog.require('lf.backstore.IndexedDBRawBackStore');
goog.require('lf.backstore.IndexedDBTx');
goog.require('lf.backstore.ObjectStore');
goog.require('lf.backstore.Page');
goog.require('lf.backstore.TableType');
goog.require('lf.index.IndexMetadata');
goog.require('lf.index.IndexMetadataRow');



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
    // As a result the onblocked event is not handled delibrately.
    request.onerror = reject;
    request.onupgradeneeded = goog.bind(function(ev) {
      this.onUpgradeNeeded_(onUpgrade, ev).then(
          function() {}, reject);
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
  var rawDb = new lf.backstore.IndexedDBRawBackStore(
      ev.oldVersion, db, tx, this.bundledMode_);
  this.removeIndexTables_(db, tx);
  this.createTables_(db, tx);
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
 * @param {!IDBTransaction} tx The IndexedDB upgrade transaction from
 *     IDBOpenDBRequest.
 * @private
 */
lf.backstore.IndexedDB.prototype.createTables_ = function(db, tx) {
  this.schema_.tables().forEach(
      goog.partial(this.createObjectStoresForTable_, db, tx),
      this);
};


/**
 * Creates all backing store tables for the given user-defined table.
 * @param {!IDBDatabase} db
 * @param {!IDBTransaction} tx The IndexedDB upgrade transaction from
 *     IDBOpenDBRequest.
 * @param {!lf.schema.Table} tableSchema The table schema.
 * @private
 */
lf.backstore.IndexedDB.prototype.createObjectStoresForTable_ = function(
    db, tx, tableSchema) {
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
          this.createIndexTable_(
              db, tx,
              indexSchema.getNormalizedName(),
              lf.index.IndexMetadata.Type.BTREE);
        }, this);

    // Creating RowId index table.
    this.createIndexTable_(
        db, tx,
        tableSchema.getRowIdIndexName(),
        lf.index.IndexMetadata.Type.ROW_ID);
  }
};


/**
 * Creates a backing store corresponding to a persisted index.
 * @param {!IDBDatabase} db
 * @param {!IDBTransaction} tx The IndexedDB upgrade transaction from
 *     IDBOpenDBRequest.
 * @param {string} indexName The normalized name of the index.
 * @param {lf.index.IndexMetadata.Type} indexType The type of the persisted
 *     index.
 * @private
 */
lf.backstore.IndexedDB.prototype.createIndexTable_ = function(
    db, tx, indexName, indexType) {
  if (!db.objectStoreNames.contains(indexName)) {
    db.createObjectStore(indexName, {keyPath: 'id'});
    var store = tx.objectStore(indexName);

    // Need to take into account whether bundledMode_ is enabled when
    // initializing the index metadata row, therefore wrapping the native
    // IDBObjectStore with ObjectStore/BundledObjectStore, since those classes
    // already handle serializing the row appropriately.
    var objectStore = this.bundledMode_ ?
        lf.backstore.BundledObjectStore.forTableType(
            this.global_, store, lf.Row.deserialize,
            lf.backstore.TableType.INDEX) :
        new lf.backstore.ObjectStore(store, lf.Row.deserialize);
    objectStore.put([lf.index.IndexMetadataRow.forType(indexType)]);
  }
};


/** @override */
lf.backstore.IndexedDB.prototype.createTx = function(
    type, journal) {
  // Adding user-defined tables to the underlying tx's scope.
  var scope = journal.getScope().getValues().map(
      function(table) {
        return table.getName();
      });

  // Adding any existing index tables to the underlying tx's scope.
  journal.getIndexScope().forEach(function(indexTableName) {
    scope.push(indexTableName);
  });

  var nativeTx = this.db_.transaction(scope,
      type == lf.TransactionType.READ_ONLY ? 'readonly' : 'readwrite');
  return new lf.backstore.IndexedDBTx(
      this.global_, nativeTx, journal, type, this.bundledMode_);
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
   */
  var extractRowId = goog.bind(function(cursor) {
    if (this.bundledMode_) {
      var page = lf.backstore.Page.deserialize(cursor.value);
      return goog.object.getKeys(page.getPayload()).reduce(function(prev, cur) {
        return Math.max(prev, cur);
      }, 0);
    }

    return cursor.key;
  }, this);

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


/** @override */
lf.backstore.IndexedDB.prototype.getTableInternal = function(tableName) {
  throw new lf.Exception(lf.Exception.Type.SYNTAX,
      'IndexedDB tables needs to be acquired from transactions');
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
