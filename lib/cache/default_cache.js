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

goog.require('goog.structs.Map');
goog.require('lf.cache.Cache');



/**
 * In-memory row cache.
 * @param {number=} opt_maxRows Maxium number of rows to cache.
 * @implements {lf.cache.Cache}
 * @constructor @struct
 */
lf.cache.DefaultCache = function(opt_maxRows) {
  /** @protected {!goog.structs.Map.<number, lf.Row>} */
  this.map = new goog.structs.Map();

  /** @private {number} */
  this.limit_ = opt_maxRows || Number.MAX_VALUE;
};


/** @override */
lf.cache.DefaultCache.prototype.set = function(rows) {
  rows.forEach(goog.bind(function(row) {
    this.map.set(row.id(), row);
  }, this));

  if (this.map.getCount() > this.limit_) {
    // TODO(arthurhsu): honor cache limit, possibly by LRU.
  }
};


/** @override */
lf.cache.DefaultCache.prototype.get = function(ids) {
  return ids.map(goog.bind(function(id) {
    return this.map.get(id, null);
  }, this));
};


/** @override */
lf.cache.DefaultCache.prototype.remove = function(ids) {
  ids.forEach(function(id) {
    this.map.remove(id);
  }, this);
};


/** @override */
lf.cache.DefaultCache.prototype.getCount = function() {
  return this.map.getCount();
};
