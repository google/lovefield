/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
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
goog.require('goog.Promise');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('lf.Global');
goog.require('lf.Row');
goog.require('lf.backstore.WebSql');
goog.require('lf.cache.DefaultCache');
goog.require('lf.index.MemoryIndexStore');
goog.require('lf.service');
goog.require('lf.testing.Capability');
goog.require('lf.testing.MockSchema');
goog.require('lf.testing.backstore.ScudTester');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('WebSql');


/** @type {number} */
asyncTestCase.stepTimeout = 5000;  // Raise the timeout to 5 seconds.


/** @type {!lf.cache.Cache} */
var cache;


/** @type {!lf.index.IndexStore} */
var indexStore;


/** @type {!lf.schema.Database} */
var schema;


/** @type {!lf.backstore.WebSql} */
var db;


/** @type {!lf.testing.Capability} */
var capability;


function setUpPage() {
  capability = lf.testing.Capability.get();
}

function setUp() {
  if (!capability.webSql) {
    return;
  }

  cache = new lf.cache.DefaultCache();
  schema = new lf.testing.MockSchema();

  // Workaround the issue that Chrome can't open the same WebSQL instance again.
  schema.setName(schema.name() + goog.now());
  indexStore = new lf.index.MemoryIndexStore();
  var global = lf.Global.get();
  global.registerService(lf.service.CACHE, cache);
  global.registerService(lf.service.INDEX_STORE, indexStore);
  global.registerService(lf.service.SCHEMA, schema);
}


function testSCUD() {
  if (!capability.webSql) {
    return;
  }

  db = new lf.backstore.WebSql(lf.Global.get(), schema);
  var scudTester = new lf.testing.backstore.ScudTester(db, lf.Global.get());

  scudTester.run().then(function() {
    asyncTestCase.continueTesting();
  }, fail);

  asyncTestCase.waitForAsync('testSCUD');
}


/** Tests scanRowId() for the case where all tables are empty. */
function testRowId_Empty() {
  if (!capability.webSql) {
    return;
  }

  asyncTestCase.waitForAsync('testScanRowId');
  db = new lf.backstore.WebSql(lf.Global.get(), schema);
  db.init().then(function() {
    assertEquals(0, lf.Row.getNextId());
    asyncTestCase.continueTesting();
  });
}
