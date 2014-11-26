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
goog.provide('lf.base');
goog.provide('lf.base.BackStoreType');

goog.require('lf.Global');
goog.require('lf.ObserverRegistry');
goog.require('lf.backstore.IndexedDB');
goog.require('lf.backstore.Memory');
goog.require('lf.cache.DefaultCache');
goog.require('lf.cache.Prefetcher');
goog.require('lf.eval.Registry');
goog.require('lf.index.MemoryIndexStore');
goog.require('lf.proc.DefaultQueryEngine');
goog.require('lf.proc.Runner');
goog.require('lf.service');


/**
 * The available backing store types.
 * @enum {number}
 */
lf.base.BackStoreType = {
  INDEXED_DB: 0,
  MEMORY: 1
};


/**
 * @param {!lf.schema.Database} schema The schema of the database.
 * @param {!lf.base.BackStoreType} backStoreType The type of backing store
 *     to use. Defaultsto INDEXED_DB.
 * @param {!function(!lf.raw.BackStore):!IThenable=} opt_onUpgrade
 * @param {boolean=} opt_bundledMode
 * @return {!IThenable} A promise resolved after all initialization operations
 *     have finished.
 */
lf.base.init = function(schema, backStoreType, opt_onUpgrade, opt_bundledMode) {
  lf.Global.reset();
  var global = lf.Global.get();

  var cache = new lf.cache.DefaultCache();
  global.registerService(lf.service.CACHE, cache);

  var backStore = (backStoreType == lf.base.BackStoreType.MEMORY) ?
      new lf.backstore.Memory(schema) :
      new lf.backstore.IndexedDB(global, schema, opt_bundledMode);
  global.registerService(lf.service.BACK_STORE, backStore);

  return backStore.init(opt_onUpgrade).then(function() {
    var queryEngine = new lf.proc.DefaultQueryEngine(global);
    global.registerService(lf.service.QUERY_ENGINE, queryEngine);
    var runner = new lf.proc.Runner();
    global.registerService(lf.service.RUNNER, runner);
    var indexStore = new lf.index.MemoryIndexStore();
    global.registerService(lf.service.INDEX_STORE, indexStore);
    var evalRegistry = new lf.eval.Registry();
    global.registerService(lf.service.EVAL_REGISTRY, evalRegistry);
    var observerRegistry = new lf.ObserverRegistry(global);
    global.registerService(lf.service.OBSERVER_REGISTRY, observerRegistry);
    return indexStore.init(schema);

  }).then(function() {
    var prefetcher = new lf.cache.Prefetcher(global);
    return prefetcher.init(schema);
  });
};


/**
 * @param {!lf.schema.Database} schema The schema of the database.
 */
lf.base.closeDatabase = function(schema) {
  var global = lf.Global.get();
  try {
    var backstore = /** @type {!lf.BackStore} */ (
        global.getService(lf.service.BACK_STORE));
    backstore.close();
  } catch (e) {
    // Swallow the exception if DB is not initialized yet.
  }
};
