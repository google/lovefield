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
goog.provide('lf.cache.Prefetcher');

goog.require('goog.Promise');
goog.require('lf.Global');
goog.require('lf.TransactionType');
goog.require('lf.cache.Journal');
goog.require('lf.service');



/**
 * Prefetcher fetches rows from database into cache and build indices.
 * @constructor
 * @struct
 * @final
 */
lf.cache.Prefetcher = function() {
  /** @private {!lf.BackStore} */
  this.backStore_ = lf.Global.get().getService(lf.service.BACK_STORE);

  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = lf.Global.get().getService(lf.service.INDEX_STORE);
};


/**
 * Performs the prefetch.
 * @param {!lf.schema.Database} schema
 * @return {!IThenable}
 */
lf.cache.Prefetcher.prototype.init = function(schema) {
  // Sequentially load tables
  var tables = schema.getTables();
  var execSequentially = goog.bind(function() {
    if (tables.length == 0) {
      return goog.Promise.resolve();
    }

    var table = tables.shift();
    return this.fetch_(table).then(execSequentially);
  }, this);

  return execSequentially();
};


/**
 * Fetches contents of a table into cache, and build the index.
 * @param {!lf.schema.Table} table
 * @return {!IThenable}
 * @private
 */
lf.cache.Prefetcher.prototype.fetch_ = function(table) {
  var journal = new lf.cache.Journal([table]);
  var tx = this.backStore_.createTx(
      lf.TransactionType.READ_ONLY, journal);
  var store = tx.getTable(table);
  return store.get([]).then(goog.bind(function(results) {
    var cache = lf.Global.get().getService(lf.service.CACHE);
    cache.set(results);

    var indices = this.indexStore_.getTableIndices(table.getName());
    results.forEach(function(row) {
      indices.forEach(function(index, i) {
        var key = row.keyOfIndex(index.getName());
        index.set(key, row.id());
      });
    });
  }, this));
};
