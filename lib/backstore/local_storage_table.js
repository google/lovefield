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
goog.provide('lf.backstore.LocalStorageTable');

goog.require('goog.Promise');
goog.require('lf.Row');
goog.require('lf.Table');
goog.require('lf.cache.TableDiff');



/**
 * Tables are stored in LocalStorage as a stringified data object in the format
 * of {id1: row1, id2: row2, ..., idN: rowN}.
 * @constructor @struct
 * @implements {lf.Table}
 *
 * @param {string} tableKey Key of the table, i.e. schemaName.tableName
 */
lf.backstore.LocalStorageTable = function(tableKey) {
  /** @private {string} */
  this.key_ = tableKey;

  /** @private {!Object} */
  this.data_ = {};

  var rawData = window.localStorage.getItem(tableKey);
  if (rawData != null) {
    this.data_ = /** @type {!Object} */ (JSON.parse(rawData));
  }
};


/** @override */
lf.backstore.LocalStorageTable.prototype.get = function(ids) {
  var results;

  if (ids.length == 0) {
    results = Object.keys(this.data_).map(function(key) {
      var id = parseInt(key, 10);
      return new lf.Row(id, this.data_[key]);
    }, this);
  } else {
    results = [];
    ids.forEach(function(id) {
      if (this.data_.hasOwnProperty(id.toString())) {
        results.push(new lf.Row(id, this.data_[id.toString()]));
      }
    }, this);
  }

  return goog.Promise.resolve(results);
};


/** @override */
lf.backstore.LocalStorageTable.prototype.put = function(rows) {
  rows.forEach(function(row) {
    this.data_[row.id().toString()] = row.payload();
  }, this);

  return goog.Promise.resolve();
};


/** @override */
lf.backstore.LocalStorageTable.prototype.remove = function(ids) {
  if (ids.length == 0 || ids.length == Object.keys(this.data_).length) {
    // Remove all.
    this.data_ = {};
  } else {
    ids.forEach(function(id) {
      delete this.data_[id];
    }, this);
  }

  return goog.Promise.resolve();
};


/**
 * Flushes contents to Local Storage.
 */
lf.backstore.LocalStorageTable.prototype.commit = function() {
  window.localStorage.setItem(this.key_, JSON.stringify(this.data_));
};


/**
 * Generates table diff from new data.
 * @param {!Object} newData
 * @return {!lf.cache.TableDiff}
 */
lf.backstore.LocalStorageTable.prototype.diff = function(newData) {
  var oldIds = Object.keys(this.data_);
  var newIds = Object.keys(newData);

  var diff = new lf.cache.TableDiff(this.key_);
  newIds.forEach(function(id) {
    var rowId = parseInt(id, 10);
    if (this.data_.hasOwnProperty(id)) {
      // A maybe update: the event simply pass back all values of table.
      if (JSON.stringify(this.data_[id]) != JSON.stringify(newData[id])) {
        diff.modify([
          new lf.Row(rowId, this.data_[id]),
          new lf.Row(rowId, newData[id])
        ]);
      }
    } else {
      // Add
      diff.add(new lf.Row(rowId, newData[id]));
    }
  }, this);
  oldIds.filter(function(id) {
    return !newData.hasOwnProperty(id);
  }, this).forEach(function(id) {
    diff.delete(new lf.Row(parseInt(id, 10), this.data_[id]));
  }, this);
  return diff;
};
