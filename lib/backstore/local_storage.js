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
goog.provide('lf.backstore.LocalStorage');

goog.require('goog.Promise');
goog.require('lf.BackStore');
goog.require('lf.Exception');
goog.require('lf.backstore.LocalStorageTable');
goog.require('lf.backstore.LocalStorageTx');
goog.require('lf.structs.map');



/**
 * A backing store implementation using LocalStorage. It can hold at most 10MB
 * of data, depending on browser. This backing store is experimental.
 *
 * Format of LocalStorage:
 *
 * namespace.version# Version of this database
 * namespace.tableName Serialized object of the table
 *
 * @implements {lf.BackStore}
 * @constructor @struct
 *
 * @param {!lf.schema.Database} schema The schema of the database.
 */
lf.backstore.LocalStorage = function(schema) {
  /** @private {!lf.schema.Database} */
  this.schema_ = schema;

  /** @private {!lf.structs.Map<string, !lf.backstore.LocalStorageTable>} */
  this.tables_ = lf.structs.map.create();

  /** @private {?function(!Array<!lf.cache.TableDiff>)} */
  this.changeHandler_ = null;

  /** @private {?Function} */
  this.listener_ = null;
};


/** Synchronous version of init(). */
lf.backstore.LocalStorage.prototype.initSync = function() {
  if (!window.localStorage) {
    // 359: LocalStorage is not supported by platform
    throw new lf.Exception(359);
  }

  var versionKey = this.schema_.name() + '.version#';
  var version = window.localStorage.getItem(versionKey);
  if (goog.isDefAndNotNull(version)) {
    if (version != this.schema_.version().toString()) {
      // TODO(arthurhsu): implement upgrade logic
      // 360: Not implemented yet.
      throw new lf.Exception(360);
    }
    this.loadTables_();
  } else {
    this.loadTables_();
    window.localStorage.setItem(versionKey, this.schema_.version().toString());
    this.commit();
  }
};


/** @override */
lf.backstore.LocalStorage.prototype.init = function(opt_onUpgrade) {
  return new goog.Promise(function(resolve, reject) {
    this.initSync();
    resolve();
  }.bind(this));
};


/** @private */
lf.backstore.LocalStorage.prototype.loadTables_ = function() {
  var prefix = this.schema_.name() + '.';
  this.schema_.tables().forEach(function(table) {
    var tableName = table.getName();
    this.tables_.set(
        tableName,
        new lf.backstore.LocalStorageTable(prefix + tableName));
    if (table.persistentIndex()) {
      var indices = table.getIndices();
      indices.forEach(function(index) {
        var indexName = index.getNormalizedName();
        this.tables_.set(
            indexName,
            new lf.backstore.LocalStorageTable(prefix + indexName));
      }, this);
    }
  }, this);
};


/** @override */
lf.backstore.LocalStorage.prototype.getTableInternal = function(tableName) {
  if (!this.tables_.has(tableName)) {
    // 101: Table {0} not found.
    throw new lf.Exception(101, tableName);
  }

  return this.tables_.get(tableName);
};


/** @override */
lf.backstore.LocalStorage.prototype.createTx = function(
    mode, scope, opt_journal) {
  return new lf.backstore.LocalStorageTx(this, mode, opt_journal);
};


/** @override */
lf.backstore.LocalStorage.prototype.close = function() {
};


/** @override */
lf.backstore.LocalStorage.prototype.subscribe = function(handler) {
  this.changeHandler_ = handler;
  if (goog.isDefAndNotNull(this.listener_)) {
    return;
  }

  this.listener_ = this.onStorageEvent_.bind(this);
  window.addEventListener('storage', this.listener_, false);
};


/**
 * Flushes changes to local storage.
 */
lf.backstore.LocalStorage.prototype.commit = function() {
  this.tables_.forEach(function(table, tableName) {
    table.commit();
  });
};


/** @override */
lf.backstore.LocalStorage.prototype.unsubscribe = function() {
  if (goog.isDefAndNotNull(this.listener_)) {
    window.removeEventListener('storage', this.listener_, false);
    this.listener_ = null;
    this.changeHandler_ = null;
  }
};


/** @override */
lf.backstore.LocalStorage.prototype.notify = function(changes) {
  if (goog.isDefAndNotNull(this.changeHandler_)) {
    this.changeHandler_(changes);
  }
};


/**
 * @param {!Event} raw
 * @private
 */
lf.backstore.LocalStorage.prototype.onStorageEvent_ = function(raw) {
  var ev = /** @type {!StorageEvent} */ (raw);
  if (ev.storageArea != window.localStorage ||
      ev.key.indexOf(this.schema_.name() + '.') != 0) {
    return;
  }

  var newValue = window.localStorage.getItem(ev.key);
  var newData = {};
  if (!goog.isNull(newValue)) {
    try {
      // Retrieves the new value from local storage. IE does not offer that in
      // the StorageEvent.
      newData = JSON.parse(newValue);
    } catch (e) {
      return;
    }
  }

  var tableName = ev.key.slice(this.schema_.name().length + 1);
  var table = this.tables_.get(tableName);
  if (table) {
    this.changeHandler_([table.diff(newData)]);
  }
};
