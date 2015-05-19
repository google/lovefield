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
goog.module('lf.cache.DefaultCache');
// TODO(dpapad): Remove once the codebase has migrated fully to goog.module.
goog.module.declareLegacyNamespace();

var asserts = goog.require('goog.asserts');
var Map = goog.require('goog.structs.Map');
var Set = goog.require('goog.structs.Set');
var Cache = goog.require('lf.cache.Cache');



exports = goog.defineClass(null, {
  /**
   * In-memory row cache.
   * @param {number=} opt_maxRows Maxium number of rows to cache.
   * @implements {Cache}
   */
  constructor: function(opt_maxRows) {
    /** @private {!Map<number, lf.Row>} */
    this.map_ = new Map();

    /** @private {!Map<string, !Set<number>>} */
    this.tableRows_ = new Map();

    /** @private {number} */
    this.limit_ = opt_maxRows || Number.MAX_VALUE;
  },


  /**
   * @param {string} tableName
   * @return {!Set<number>} Row id set of that table.
   * @private
   */
  getTableSet_: function(tableName) {
    var set = this.tableRows_.get(tableName, null);
    if (goog.isNull(set)) {
      set = new Set();
      this.tableRows_.set(tableName, set);
    }
    return set;
  },


  /** @override */
  set: function(tableName, rows) {
    var tableSet = this.getTableSet_(tableName);
    rows.forEach(goog.bind(function(row) {
      this.map_.set(row.id(), row);
      tableSet.add(row.id());
    }, this));

    if (this.map_.getCount() > this.limit_) {
      // TODO(arthurhsu): honor cache limit, possibly by LRU.
    }
  },


  /** @override */
  get: function(ids) {
    return ids.map(goog.bind(function(id) {
      return this.map_.get(id, null);
    }, this));
  },


  /** @override */
  getRange: function(tableName, fromId, toId) {
    var data = [];
    var min = Math.min(fromId, toId);
    var max = Math.max(fromId, toId);
    var tableSet = this.getTableSet_(tableName);

    // Ensure the least number of keys are iterated.
    if (tableSet.getCount() < max - min) {
      tableSet.getValues().forEach(function(key) {
        if (key >= min && key <= max) {
          var value = this.map_.get(key);
          asserts.assert(goog.isDefAndNotNull(value), 'Inconsistent cache');
          data.push(value);
        }
      }, this);
    } else {
      for (var i = min; i <= max; ++i) {
        if (!tableSet.contains(i)) {
          continue;
        }
        var value = this.map_.get(i);
        asserts.assert(goog.isDefAndNotNull(value), 'Inconsistent cache');
        data.push(value);
      }
    }
    return data;
  },


  /** @override */
  remove: function(tableName, ids) {
    var tableSet = this.getTableSet_(tableName);
    ids.forEach(function(id) {
      this.map_.remove(id);
      tableSet.remove(id);
    }, this);
  },


  /**
   * @param {string=} opt_tableName
   * @override
   */
  getCount: function(opt_tableName) {
    return goog.isDefAndNotNull(opt_tableName) ?
        this.getTableSet_(opt_tableName).getCount() :
        this.map_.getCount();
  }
});
