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
goog.provide('lf.cache.DefaultCache');

goog.require('goog.asserts');
goog.require('goog.structs.Map');
goog.require('goog.structs.Set');
goog.require('lf.cache.Cache');



/**
 * In-memory row cache.
 * @param {number=} opt_maxRows Maxium number of rows to cache.
 * @implements {lf.cache.Cache}
 * @constructor @struct
 */
lf.cache.DefaultCache = function(opt_maxRows) {
  /** @private {!goog.structs.Map<number, lf.Row>} */
  this.map_ = new goog.structs.Map();

  /** @private {!goog.structs.Map<string, !goog.structs.Set<number>>} */
  this.tableRows_ = new goog.structs.Map();

  /** @private {number} */
  this.limit_ = opt_maxRows || Number.MAX_VALUE;
};


/**
 * @param {string} tableName
 * @return {!goog.structs.Set<number>} Row id set of that table.
 * @private
 */
lf.cache.DefaultCache.prototype.getTableSet_ = function(tableName) {
  var set = this.tableRows_.get(tableName, null);
  if (goog.isNull(set)) {
    set = new goog.structs.Set();
    this.tableRows_.set(tableName, set);
  }
  return set;
};


/** @override */
lf.cache.DefaultCache.prototype.set = function(tableName, rows) {
  var tableSet = this.getTableSet_(tableName);
  rows.forEach(goog.bind(function(row) {
    this.map_.set(row.id(), row);
    tableSet.add(row.id());
  }, this));

  if (this.map_.getCount() > this.limit_) {
    // TODO(arthurhsu): honor cache limit, possibly by LRU.
  }
};


/** @override */
lf.cache.DefaultCache.prototype.get = function(ids) {
  return ids.map(goog.bind(function(id) {
    return this.map_.get(id, null);
  }, this));
};


/** @override */
lf.cache.DefaultCache.prototype.getRange = function(tableName, fromId, toId) {
  var data = [];
  var min = Math.min(fromId, toId);
  var max = Math.max(fromId, toId);
  var tableSet = this.getTableSet_(tableName);

  // Ensure the least number of keys are iterated.
  if (tableSet.getCount() < max - min) {
    tableSet.getValues().forEach(function(key) {
      if (key >= min && key <= max) {
        var value = this.map_.get(key);
        goog.asserts.assert(goog.isDefAndNotNull(value), 'Inconsistent cache');
        data.push(value);
      }
    }, this);
  } else {
    for (var i = min; i <= max; ++i) {
      if (!tableSet.contains(i)) {
        continue;
      }
      var value = this.map_.get(i);
      goog.asserts.assert(goog.isDefAndNotNull(value), 'Inconsistent cache');
      data.push(value);
    }
  }
  return data;
};


/** @override */
lf.cache.DefaultCache.prototype.remove = function(tableName, ids) {
  var tableSet = this.getTableSet_(tableName);
  ids.forEach(function(id) {
    this.map_.remove(id);
    tableSet.remove(id);
  }, this);
};


/**
 * @param {string=} opt_tableName
 * @override
 */
lf.cache.DefaultCache.prototype.getCount = function(opt_tableName) {
  return goog.isDefAndNotNull(opt_tableName) ?
      this.getTableSet_(opt_tableName).getCount() :
      this.map_.getCount();
};
