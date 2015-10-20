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
goog.provide('lf.cache.DefaultCache');

goog.require('goog.asserts');
goog.require('lf.cache.Cache');
goog.require('lf.structs.map');
goog.require('lf.structs.set');
goog.forwardDeclare('lf.schema.Database');



/**
 * In-memory row cache.
 * @param {!lf.schema.Database} dbSchema
 * @implements {lf.cache.Cache}
 * @constructor @struct
 */
lf.cache.DefaultCache = function(dbSchema) {
  /** @private {!lf.structs.Map<number, lf.Row>} */
  this.map_ = lf.structs.map.create();

  /** @private {!lf.structs.Map<string, !lf.structs.Set<number>>} */
  this.tableRows_ = lf.structs.map.create();

  // Create set for tableRows
  dbSchema.tables().forEach(function(table) {
    this.tableRows_.set(table.getName(), lf.structs.set.create());
  }, this);
};


/** @override */
lf.cache.DefaultCache.prototype.set = function(tableName, row) {
  this.map_.set(row.id(), row);
  this.tableRows_.get(tableName).add(row.id());
};


/** @override */
lf.cache.DefaultCache.prototype.setMany = function(tableName, rows) {
  var tableSet = this.tableRows_.get(tableName);
  rows.forEach(function(row) {
    this.map_.set(row.id(), row);
    tableSet.add(row.id());
  }, this);
};


/** @override */
lf.cache.DefaultCache.prototype.get = function(id) {
  return this.map_.get(id) || null;
};


/** @override */
lf.cache.DefaultCache.prototype.getMany = function(ids) {
  return ids.map(function(id) {
    return this.get(id);
  }, this);
};


/** @override */
lf.cache.DefaultCache.prototype.getRange = function(tableName, fromId, toId) {
  var data = [];
  var min = Math.min(fromId, toId);
  var max = Math.max(fromId, toId);
  var tableSet = this.tableRows_.get(tableName);

  // Ensure the least number of keys are iterated.
  if (tableSet.size < max - min) {
    tableSet.forEach(
        /** @this {lf.cache.DefaultCache} */
        function(key) {
          if (key >= min && key <= max) {
            var value = this.map_.get(key);
            goog.asserts.assert(
                goog.isDefAndNotNull(value), 'Inconsistent cache');
            data.push(value);
          }
        }, this);
  } else {
    for (var i = min; i <= max; ++i) {
      if (!tableSet.has(i)) {
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
lf.cache.DefaultCache.prototype.remove = function(tableName, id) {
  this.map_.delete(id);
  this.tableRows_.get(tableName).delete(id);
};


/** @override */
lf.cache.DefaultCache.prototype.removeMany = function(tableName, ids) {
  var tableSet = this.tableRows_.get(tableName);
  ids.forEach(function(id) {
    this.map_.delete(id);
    tableSet.delete(id);
  }, this);
};


/** @override */
lf.cache.DefaultCache.prototype.getCount = function(opt_tableName) {
  return goog.isDefAndNotNull(opt_tableName) ?
      this.tableRows_.get(opt_tableName).size :
      this.map_.size;
};


/** @override */
lf.cache.DefaultCache.prototype.clear = function() {
  this.map_.clear();
  this.tableRows_.clear();
};
