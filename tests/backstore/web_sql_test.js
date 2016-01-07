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
goog.require('lf.Capability');
goog.require('lf.Global');
goog.require('lf.Row');
goog.require('lf.backstore.WebSql');
goog.require('lf.cache.DefaultCache');
goog.require('lf.index.MemoryIndexStore');
goog.require('lf.schema');
goog.require('lf.schema.DataStoreType');
goog.require('lf.service');
goog.require('lf.testing.backstore.ScudTester');
goog.require('lf.testing.getSchemaBuilder');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('WebSql');


/** @type {number} */
asyncTestCase.stepTimeout = 5000;  // Raise the timeout to 5 seconds.


/** @type {string} */
var schemaName;


/** @type {!lf.schema.Database} */
var schema;


/** @type {!lf.backstore.WebSql} */
var db;


/** @type {!lf.Capability} */
var capability;


function setUpPage() {
  capability = lf.Capability.get();
  schemaName = 'wsql' + goog.now();
}

function setUp() {
  if (!capability.webSql) {
    return;
  }

  schema = lf.testing.getSchemaBuilder().getSchema();
  var global = lf.Global.get();
  global.clear();

  lf.Row.setNextId(0);
  global.registerService(lf.service.CACHE, new lf.cache.DefaultCache(schema));
  global.registerService(
      lf.service.INDEX_STORE, new lf.index.MemoryIndexStore());
  global.registerService(lf.service.SCHEMA, schema);
}


function testSCUD() {
  if (!capability.webSql) {
    return;
  }

  // The schema name is on purpose padded with a timestamp to workaround the
  // issue that Chrome can't open the same WebSQL instance again if this test
  // has been run twice.
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

  asyncTestCase.waitForAsync('testRowId_Empty');
  lf.schema.create('foo' + goog.now(), 1).connect({
    storeType: lf.schema.DataStoreType.WEB_SQL
  }).then(function(db) {
    assertEquals(1, lf.Row.getNextId());
    asyncTestCase.continueTesting();
  });
}


/** @return {!lf.schema.Builder} */
function getSchemaBuilder() {
  var builder = lf.schema.create(schemaName, 1);
  builder.createTable('foo').addColumn('id', lf.Type.INTEGER);
  return builder;
}


/**
 * The following two tests test scanRowId() for non-empty database.
 * The test name is crafted so that it makes sure it runs one after the other.
 */
function test1_AddRow() {
  if (!capability.webSql) {
    return;
  }

  var builder = getSchemaBuilder();
  asyncTestCase.waitForAsync('test1_AddRow');
  builder.connect({
    storeType: lf.schema.DataStoreType.WEB_SQL
  }).then(function(db) {
    var t = db.getSchema().table('foo');
    var row = t.createRow({'id': 1});

    return db.insert().into(t).values([row]).exec();
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}

function test2_ScanRowId() {
  if (!capability.webSql) {
    return;
  }

  asyncTestCase.waitForAsync('test2_RowId');

  var builder = getSchemaBuilder();
  builder.connect({
    storeType: lf.schema.DataStoreType.WEB_SQL
  }).then(function(db) {
    assertEquals(2, lf.Row.getNextId());
    asyncTestCase.continueTesting();
  }, fail);
}


function testPersistentIndex() {
  if (!capability.webSql) {
    return;
  }

  asyncTestCase.waitForAsync('testPersistentIndex');
  var builder = lf.testing.getSchemaBuilder('foo' + goog.now(), true);
  builder.connect({storeType: lf.schema.DataStoreType.WEB_SQL}).then(
      function(db) {
        asyncTestCase.continueTesting();
      });
}


function testReservedWordAsTableName() {
  if (!capability.webSql) {
    return;
  }

  asyncTestCase.waitForAsync('testReservedWordAsTableName');
  var builder = lf.schema.create('foo' + goog.now(), 1);
  builder.createTable('Group').
      addColumn('id', lf.Type.INTEGER);
  var db;
  var g;
  builder.connect({storeType: lf.schema.DataStoreType.WEB_SQL}).then(
      function(instance) {
        db = instance;
        g = db.getSchema().table('Group');
        return db.insert().into(g).values([g.createRow({'id': 1})]).exec();
      }).then(function() {
    return db.select().from(g).exec();
  }).then(function(results) {
    assertEquals(1, results.length);
    assertEquals(1, results[0]['id']);
    return db.delete().from(g).exec();
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}
