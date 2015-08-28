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
goog.setTestOnly();
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('lf.Global');
goog.require('lf.backstore.LocalStorage');
goog.require('lf.cache.DefaultCache');
goog.require('lf.index.MemoryIndexStore');
goog.require('lf.service');
goog.require('lf.testing.backstore.ScudTester');
goog.require('lf.testing.getSchemaBuilder');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('LocalStorage');


/** @type {!lf.backstore.LocalStorage} */
var db;


/** @type {!lf.cache.Cache} */
var cache;


/** @type {!lf.schema.Database} */
var schema;


function setUp() {
  asyncTestCase.waitForAsync('setUp');

  var indexStore = new lf.index.MemoryIndexStore();
  schema = lf.testing.getSchemaBuilder().getSchema();
  cache = new lf.cache.DefaultCache(schema);

  var global = lf.Global.get();
  global.registerService(lf.service.CACHE, cache);
  global.registerService(lf.service.INDEX_STORE, indexStore);
  global.registerService(lf.service.SCHEMA, schema);

  window.localStorage.clear();
  db = new lf.backstore.LocalStorage(schema);

  db.init().then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that the backstore.Memory is instantiated according to the schema
 * instance that is passed into its constructor.
 */
function testConstruction() {
  assertTrue(schema.tables().length > 0);

  schema.tables().forEach(
      function(table) {
        assertNotNull(db.getTableInternal(table.getName()));
      });
}


function testGetTable_NonExisting() {
  assertThrows(
      goog.bind(db.getTableInternal, db, 'nonExistingTableName'));
}


function testSCUD() {
  var scudTester = new lf.testing.backstore.ScudTester(
      db,
      lf.Global.get(),
      function() {
        var newDb = new lf.backstore.LocalStorage(schema);
        newDb.initSync();
        return newDb;
      });

  scudTester.run().then(function() {
    asyncTestCase.continueTesting();
  });

  asyncTestCase.waitForAsync('testSCUD');
}
