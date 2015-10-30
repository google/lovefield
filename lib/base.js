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
goog.provide('lf.base');

goog.require('lf.Capability');
goog.require('lf.Exception');
goog.require('lf.Flags');
goog.require('lf.ObserverRegistry');
goog.require('lf.backstore.ExternalChangeObserver');
goog.require('lf.backstore.Firebase');
goog.require('lf.backstore.IndexedDB');
goog.require('lf.backstore.Memory');
goog.require('lf.backstore.ObservableStore');
goog.require('lf.backstore.WebSql');
goog.require('lf.cache.DefaultCache');
goog.require('lf.cache.Prefetcher');
goog.require('lf.debug.inspect');
goog.require('lf.index.MemoryIndexStore');
goog.require('lf.proc.DefaultQueryEngine');
goog.require('lf.proc.Runner');
goog.require('lf.schema.DataStoreType');
goog.require('lf.service');


/**
 * @param {!lf.Global} global
 * @param {!lf.schema.ConnectOptions=} opt_options
 * @return {!IThenable} A promise resolved after all initialization operations
 *     have finished.
 */
lf.base.init = function(global, opt_options) {
  var schema = global.getService(lf.service.SCHEMA);
  var options = opt_options || {};

  var cache = new lf.cache.DefaultCache(schema);
  global.registerService(lf.service.CACHE, cache);

  var backStore = null;
  var observeExternalChanges = false;
  if (lf.Flags.MEMORY_ONLY) {
    backStore = new lf.backstore.Memory(schema);
  } else {
    var dataStoreType;
    if (!goog.isDefAndNotNull(options['storeType'])) {
      var capability = lf.Capability.get();
      dataStoreType =
          capability.indexedDb ? lf.schema.DataStoreType.INDEXED_DB :
              (capability.webSql ? lf.schema.DataStoreType.WEB_SQL :
               lf.schema.DataStoreType.MEMORY);
    } else {
      dataStoreType = options['storeType'];
    }
    switch (dataStoreType) {
      case lf.schema.DataStoreType.INDEXED_DB:
        backStore = new lf.backstore.IndexedDB(global, schema);
        break;
      case lf.schema.DataStoreType.MEMORY:
        backStore = new lf.backstore.Memory(schema);
        break;
      case lf.schema.DataStoreType.OBSERVABLE_STORE:
        backStore = new lf.backstore.ObservableStore(schema);
        break;
      case lf.schema.DataStoreType.WEB_SQL:
        backStore = new lf.backstore.WebSql(
            global, schema, options['webSqlDbSize']);
        break;
      case lf.schema.DataStoreType.FIREBASE:
        backStore = new lf.backstore.Firebase(schema,
            /** @type {!Firebase} */ (options['firebase']));
        observeExternalChanges = true;
        break;
      default:
        // 300: Not supported.
        throw new lf.Exception(300);
        break;
    }
  }
  global.registerService(lf.service.BACK_STORE, backStore);

  var indexStore = new lf.index.MemoryIndexStore();
  global.registerService(lf.service.INDEX_STORE, indexStore);
  return backStore.init(options['onUpgrade']).then(function() {
    var queryEngine = new lf.proc.DefaultQueryEngine(global);
    global.registerService(lf.service.QUERY_ENGINE, queryEngine);
    var runner = new lf.proc.Runner();
    global.registerService(lf.service.RUNNER, runner);
    var observerRegistry = new lf.ObserverRegistry();
    global.registerService(lf.service.OBSERVER_REGISTRY, observerRegistry);
    return indexStore.init(schema);
  }).then(function() {
    if (observeExternalChanges) {
      var externalChangeObserver =
          new lf.backstore.ExternalChangeObserver(global);
      externalChangeObserver.startObserving();
    }
    if (options['enableInspector']) {
      lf.base.enableInspector_(global);
    }
    var prefetcher = new lf.cache.Prefetcher(global);
    return prefetcher.init(schema);
  });
};


/**
 * Exposes a global '#lfExport' method, that can be used by the Lovefield
 * Inspector Devtools Chrome extension.
 * @param {!lf.Global} global
 * @private
 */
lf.base.enableInspector_ = function(global) {
  window.top['#lfInspect'] = lf.debug.inspect;
};


/**
 * @param {!lf.Global} global
 */
lf.base.closeDatabase = function(global) {
  try {
    var backstore = global.getService(lf.service.BACK_STORE);
    backstore.close();
  } catch (e) {
    // Swallow the exception if DB is not initialized yet.
  }
};
