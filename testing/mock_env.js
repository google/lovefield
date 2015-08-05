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
goog.setTestOnly();
goog.provide('lf.testing.MockEnv');

goog.require('lf.Global');
goog.require('lf.proc.Database');
goog.require('lf.schema.DataStoreType');
goog.require('lf.service');



/**
 * A helper class which setup the common testing environment.
 * @constructor
 * @struct
 * @final
 *
 * @param {!lf.schema.Database} schema
 */
lf.testing.MockEnv = function(schema) {
  /** @type {!lf.schema.Database} */
  this.schema = schema;

  /** @type {!lf.proc.QueryEngine} */
  this.queryEngine;

  /** @type {!lf.proc.Runner} */
  this.runner;

  /** @type {!lf.BackStore} */
  this.store;

  /** @type {!lf.cache.Cache} */
  this.cache;

  /** @type {!lf.index.IndexStore} */
  this.indexStore;

  /** @type {!lf.ObserverRegistry} */
  this.observerRegistry;

  /** @type {!lf.proc.Database} */
  this.db;

  /** @type {!lf.Global} */
  this.global;
};


/** @return {!IThenable} */
lf.testing.MockEnv.prototype.init = function() {
  var global = lf.Global.get();
  this.global = global;
  global.registerService(lf.service.SCHEMA, this.schema);

  this.db = new lf.proc.Database(global);
  return this.db.init({storeType: lf.schema.DataStoreType.MEMORY}).then(
      function() {
        this.cache = global.getService(lf.service.CACHE);
        this.store = global.getService(lf.service.BACK_STORE);
        this.queryEngine = global.getService(lf.service.QUERY_ENGINE);
        this.runner = global.getService(lf.service.RUNNER);
        this.indexStore = global.getService(lf.service.INDEX_STORE);
        this.observerRegistry = global.getService(lf.service.OBSERVER_REGISTRY);
      }.bind(this));
};


/** @return {!IThenable} */
lf.testing.MockEnv.prototype.addSampleData = function() {
  var table = this.schema.tables()[0];
  var sampleDataCount = 9;
  var rows = new Array(sampleDataCount);
  for (var i = 0; i < sampleDataCount; i++) {
    rows[i] = table.createRow({
      'id': i.toString(),
      'name': 'dummyName' + i.toString()
    });
    rows[i].assignRowId(i);
  }
  return this.db.insert().into(table).values(rows).exec();
};
