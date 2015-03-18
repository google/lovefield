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
goog.provide('lf.backstore.LocalStorage');

goog.require('goog.Promise');
goog.require('goog.object');
goog.require('lf.BackStore');
goog.require('lf.Exception');
goog.require('lf.backstore.LocalStorageTable');
goog.require('lf.backstore.LocalStorageTx');



/**
 * A backing store implementation using LocalStorage. It can hold at most 10MB
 * of data, depending on browser. This backing store is experimental.
 * @implements {lf.BackStore}
 * @constructor
 *
 * @param {!lf.schema.Database} schema The schema of the database.
 */
lf.backstore.LocalStorage = function(schema) {
  /** @private {!lf.schema.Database} */
  this.schema_ = schema;

  /** @private {!Object} */
  this.db_;
};


/** Synchronous version of init(). */
lf.backstore.LocalStorage.prototype.initSync = function() {
  if (!window.localStorage) {
    throw new lf.Exception(lf.Exception.Type.NOT_SUPPORTED,
        'LocalStorage not supported by platform.');
  }

  // Loads everything. The design of this backstore will hold all references.
  // To graduate it out of experimental, this may need to be addressed.
  var data = window.localStorage.getItem(this.schema_.name());
  if (goog.isDefAndNotNull(data)) {
    this.checkExisting_(data);
  } else {
    this.createNew_();
  }
};


/** @override */
lf.backstore.LocalStorage.prototype.init = function(opt_onUpgrade) {
  return new goog.Promise(goog.bind(function(resolve, reject) {
    this.initSync();
    resolve();
  }, this));
};


/**
 * @param {string} data
 * @private
 */
lf.backstore.LocalStorage.prototype.checkExisting_ = function(data) {
  var db;
  db = JSON.parse(data);
  if (db['version#'] != this.schema_.version()) {
    // TODO(arthurhsu): implement upgrade logic
    throw new lf.Exception(lf.Exception.Type.NOT_SUPPORTED,
        'LocalStorage upgrade logic not implemented.');
  }
  this.db_ = /** @type {!Object} */ (db);
};


/** @private */
lf.backstore.LocalStorage.prototype.createNew_ = function() {
  this.db_ = {};
  this.db_['version#'] = this.schema_.version();
  this.schema_.tables().forEach(function(table) {
    this.db_[table.getName()] = {};
    if (table.persistentIndex()) {
      var indices = table.getIndices();
      indices.forEach(function(index) {
        this.db_[index.getNormalizedName()] = {};
      }, this);
    }
  }, this);
  this.commit();
};


/**
 * @param {string} tableName The name of the table to get. Throws an exception
 *     if such a table does not exist.
 * @return {!lf.Stream}
 * @throws {lf.Exception}
 */
lf.backstore.LocalStorage.prototype.getTableInternal = function(tableName) {
  if (!goog.object.containsKey(this.db_, tableName)) {
    throw new lf.Exception(
        lf.Exception.Type.DATA,
        'Table ' + tableName + ' does not exist.');
  }

  return new lf.backstore.LocalStorageTable(this.db_[tableName]);
};


/** @override */
lf.backstore.LocalStorage.prototype.createTx = function(mode, journal) {
  return new lf.backstore.LocalStorageTx(this, mode, journal);
};


/** @override */
lf.backstore.LocalStorage.prototype.close = function() {
};


/**
 * Flushes changes to local storage.
 */
lf.backstore.LocalStorage.prototype.commit = function() {
  window.localStorage.setItem(this.schema_.name(), JSON.stringify(this.db_));
};
