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
goog.require('goog.string');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('hr.bdb');
goog.require('hr.db');
goog.require('lf.Capability');
goog.require('lf.backstore.IndexedDB');
goog.require('lf.backstore.Memory');
goog.require('lf.cache.DefaultCache');
goog.require('lf.service');
goog.require('lf.structs.map');
goog.require('lf.structs.set');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('IndexedDB');


/** @type {!goog.testing.PropertyReplacer} */
var propertyReplacer;


/** @type {!lf.Capability} */
var capability;


function setUp() {
  capability = lf.Capability.get();
  propertyReplacer = new goog.testing.PropertyReplacer();
}


function tearDown() {
  propertyReplacer.reset();
}


/**
 * Randomizes the schema name such that a new DB is created for every test run.
 * @param {!lf.schema.Database} schema
 * @return {!lf.schema.Database} A schema to be used for testing.
 */
function randomizeSchemaName(schema) {
  propertyReplacer.replace(schema, 'name', function() {
    return 'db_' + goog.string.getRandomString();
  });

  return schema;
}


function testInit_IndexedDB_NonBundled() {
  var schema = randomizeSchemaName(hr.db.getSchema());
  var global = hr.db.getGlobal();
  checkInit_IndexedDB(schema, global);
}


function testInit_IndexedDB_Bundled() {
  var schema = randomizeSchemaName(hr.bdb.getSchema());
  var global = hr.bdb.getGlobal();
  var cache = new lf.cache.DefaultCache(schema);
  global.registerService(lf.service.CACHE, cache);

  checkInit_IndexedDB(schema, global);
}


/**
 * Initializes a DB with the given schema and performs assertions on the tables
 * that were created.
 *
 * @param {!lf.schema.Database} schema
 * @param {!lf.Global} global
 */
function checkInit_IndexedDB(schema, global)  {
  if (!capability.indexedDb) {
    return;
  }

  var description = 'testInit_IndexedDB_' +
      schema.pragma().enableBundledMode ? 'Bundled' : 'NonBundled';
  asyncTestCase.waitForAsync(description);

  assertTrue(schema.getHoliday().persistentIndex());

  var indexedDb = new lf.backstore.IndexedDB(global, schema);
  indexedDb.init().then(
      /** @suppress {accessControls} */
      function() {
        var createdTableNames = lf.structs.set.create();
        for (var i = 0; i < indexedDb.db_.objectStoreNames.length; ++i) {
          createdTableNames.add(indexedDb.db_.objectStoreNames.item(i));
        }
        assertUserTables(schema, createdTableNames);
        assertIndexTables(schema, createdTableNames);

        asyncTestCase.continueTesting();
      }, fail);
}


function testInit_Memory() {
  asyncTestCase.waitForAsync('testInit_Memory');

  var schema = randomizeSchemaName(hr.db.getSchema());
  assertTrue(schema.getHoliday().persistentIndex());

  var memoryDb = new lf.backstore.Memory(schema);
  memoryDb.init().then(
      /** @suppress {accessControls} */
      function() {
        var createdTableNames = lf.structs.set.create(
            lf.structs.map.keys(memoryDb.tables_));
        assertUserTables(schema, createdTableNames);
        assertIndexTables(schema, createdTableNames);

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Asserts that an object store was created for each user-defined table.
 * @param {!lf.schema.Database} schema The database schema being tested.
 * @param {!lf.structs.Set<string>} tableNames The names of the tables that
 *     were created in the backing store.
 */
function assertUserTables(schema, tableNames) {
  schema.tables().forEach(function(tableSchema) {
    assertTrue(tableNames.has(tableSchema.getName()));
  });
}


/**
 * Asserts that an object store was created for each lf.schema.Index instance
 * that belongs to a user-defined table that has "persistentIndex" enabled.
 * @param {!lf.schema.Database} schema The database schema being tested.
 * @param {!lf.structs.Set<string>} tableNames The names of the tables that
 *     were created in the backing store.
 */
function assertIndexTables(schema, tableNames) {
  schema.tables().forEach(function(tableSchema) {
    tableSchema.getIndices().forEach(function(indexSchema) {
      assertEquals(
          tableSchema.persistentIndex(),
          tableNames.has(indexSchema.getNormalizedName()));
    });

    // Checking whether backing store for RowId index was created.
    assertEquals(
        tableSchema.persistentIndex(),
        tableNames.has(tableSchema.getRowIdIndexName()));
  });
}


/**
 * Finds the names of all indices that are persisted.
 * @param {!lf.schema.Database} schema
 * @return {!Array<string>}
 */
function getPersistedIndices(schema) {
  var indexNames = [];

  schema.tables().forEach(function(tableSchema) {
    if (tableSchema.persistentIndex()) {
      tableSchema.getIndices().forEach(function(indexSchema) {
        indexNames.push(indexSchema.getNormalizedName());
      });

      // Adding RowID index name to the returned array.
      indexNames.push(tableSchema.getRowIdIndexName());
    }
  });

  return indexNames;
}
