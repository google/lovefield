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
goog.setTestOnly();
goog.provide('lf.testing.MockEnv');

goog.require('lf.Global');
goog.require('lf.ObserverRegistry');
goog.require('lf.backstore.Memory');
goog.require('lf.cache.DefaultCache');
goog.require('lf.index.MemoryIndexStore');
goog.require('lf.proc.DefaultQueryEngine');
goog.require('lf.proc.Runner');
goog.require('lf.service');
goog.require('lf.testing.MockSchema');



/**
 * A helper class which setup the common testing environment.
 * @constructor
 * @struct
 * @final
 */
lf.testing.MockEnv = function() {
  /** @type {!lf.testing.MockSchema} */
  this.schema = new lf.testing.MockSchema();

  /** @type {!lf.proc.DefaultQueryEngine} */
  this.queryEngine;

  /** @type {!lf.proc.Runner} */
  this.runner = new lf.proc.Runner();

  /** @type {!lf.backstore.Memory} */
  this.store = new lf.backstore.Memory(this.schema);

  /** @type {!lf.cache.DefaultCache} */
  this.cache = new lf.cache.DefaultCache();

  /** @type {!lf.index.MemoryIndexStore} */
  this.indexStore = new lf.index.MemoryIndexStore();

  /** @type {!lf.ObserverRegistry} */
  this.observerRegistry = new lf.ObserverRegistry();
};


/** @return {!IThenable} */
lf.testing.MockEnv.prototype.init = function() {
  var global = lf.Global.get();
  return this.store.init().then(goog.bind(function() {
    global.registerService(lf.service.BACK_STORE, this.store);

    this.queryEngine = new lf.proc.DefaultQueryEngine(global);
    global.registerService(lf.service.QUERY_ENGINE, this.queryEngine);

    global.registerService(lf.service.RUNNER, this.runner);
    global.registerService(lf.service.CACHE, this.cache);
    global.registerService(lf.service.INDEX_STORE, this.indexStore);
    global.registerService(lf.service.OBSERVER_REGISTRY, this.observerRegistry);
    return this.indexStore.init(this.schema);
  }, this));
};
