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
goog.require('goog.functions');
goog.require('goog.structs.Set');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('goog.userAgent.product');
goog.require('hr.db');
goog.require('lf.Row');
goog.require('lf.backstore.IndexedDB');
goog.require('lf.backstore.Memory');
goog.require('lf.backstore.ObjectStore');
goog.require('lf.index.IndexMetadata');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('IndexedDB');


/** @type {!goog.testing.PropertyReplacer} */
var propertyReplacer;


function setUp() {
  propertyReplacer = new goog.testing.PropertyReplacer();
}


function tearDown() {
  propertyReplacer.reset();
}


/**
 * @return {!lf.schema.Database} A schema to be used for testing.
 */
function getSampleSchema() {
  var schema = hr.db.getSchema();
  propertyReplacer.replace(schema, 'getName', function() {
    return 'db_' + goog.string.getRandomString();
  });

  // Modifying schema such that the Job and Employee tables have persisted
  // indices enabled.
  var job = schema.getJob();
  propertyReplacer.replace(job, 'persistentIndex', goog.functions.TRUE);
  var employee = schema.getEmployee();
  propertyReplacer.replace(employee, 'persistentIndex', goog.functions.TRUE);

  return schema;
}


function testInit_IndexedDB() {
  if (goog.userAgent.product.SAFARI) {
    return;
  }

  asyncTestCase.waitForAsync('testInit_IndexedDB');

  var schema = getSampleSchema();
  assertTrue(schema.getJob().persistentIndex());
  assertTrue(schema.getEmployee().persistentIndex());
  var global = hr.db.getGlobal();

  var indexedDb = new lf.backstore.IndexedDB(
      global, schema, false /* bundledMode */);
  indexedDb.init().then(
      /** @suppress {accessControls} */
      function() {
        var createdTableNames = new goog.structs.Set(
            indexedDb.db_.objectStoreNames);
        assertUserTables(schema, createdTableNames);
        assertIndexTables(schema, createdTableNames);

        var indexSchemas = getPersistedIndices(schema);
        return checkAllIndexMetadataExist_IndexedDb(
            indexedDb.db_, indexSchemas);
      }).then(
      function() {
        asyncTestCase.continueTesting();
      }, fail);
}


function testInit_Memory() {
  asyncTestCase.waitForAsync('testInit_Memory');

  var schema = getSampleSchema();
  assertTrue(schema.getJob().persistentIndex());
  assertTrue(schema.getEmployee().persistentIndex());

  var memoryDb = new lf.backstore.Memory(schema);
  memoryDb.init().then(
      /** @suppress {accessControls} */
      function() {
        var createdTableNames = new goog.structs.Set(
            memoryDb.tables_.getKeys());
        assertUserTables(schema, createdTableNames);
        assertIndexTables(schema, createdTableNames);

        var indexSchemas = getPersistedIndices(schema);
        return checkAllIndexMetadataExist_MemoryDb(memoryDb, indexSchemas);
      }).then(
      function() {
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Asserts that an object store was created for each user-defined table.
 * @param {!lf.schema.Database} schema The database schema being tested.
 * @param {!goog.structs.Set<string>} tableNames The names of the tables that
 *     were created in the backing store.
 */
function assertUserTables(schema, tableNames) {
  schema.getTables().forEach(function(tableSchema) {
    assertTrue(tableNames.contains(tableSchema.getName()));
  });
}


/**
 * Asserts that an object store was created for each lf.schema.Index instance
 * that belongs to a user-defined table that has "persistentIndex" enabled.
 * @param {!lf.schema.Database} schema The database schema being tested.
 * @param {!goog.structs.Set<string>} tableNames The names of the tables that
 *     were created in the backing store.
 */
function assertIndexTables(schema, tableNames) {
  schema.getTables().forEach(function(tableSchema) {
    tableSchema.getIndices().forEach(function(indexSchema) {
      assertEquals(
          tableSchema.persistentIndex(),
          tableNames.contains(indexSchema.getNormalizedName()));
    });
  });
}


/**
 * Checks that the given backing store is populated with the index metadata.
 * @param {!lf.Stream} objectStore
 * @return {!IThenable}
 */
function checkIndexMetadataExist(objectStore) {
  return objectStore.get([]).then(function(results) {
    assertEquals(1, results.length);
    var metadataRow = results[0];
    assertEquals(
        lf.index.IndexMetadata.Type.BTREE,
        metadataRow.payload().type);
  });
}


/**
 * Checks that index metadata have been persisted for all given indices, for the
 * case if an IndexedDB backing store.
 * @param {!IDBDatabase} db
 * @param {!Array<!lf.schema.Index>} indexSchemas
 * @return {!IThenable}
 */
function checkAllIndexMetadataExist_IndexedDb(db, indexSchemas) {
  var scope = indexSchemas.map(function(indexSchema) {
    return indexSchema.getNormalizedName();
  });

  var tx = db.transaction(scope, 'readonly');
  var promises = indexSchemas.map(function(indexSchema) {
    var objectStore = new lf.backstore.ObjectStore(
        tx.objectStore(indexSchema.getNormalizedName()),
        lf.Row.deserialize);
    return checkIndexMetadataExist(objectStore);
  });

  return goog.Promise.all(promises);
}


/**
 * Checks that index metadata have been persisted for all given indices, for the
 * case if an MemoryDb backing store.
 * @param {!lf.backstore.Memory} db
 * @param {!Array<!lf.schema.Index>} indexSchemas
 * @return {!IThenable}
 */
function checkAllIndexMetadataExist_MemoryDb(db, indexSchemas) {
  var promises = indexSchemas.map(function(indexSchema) {
    var objectStore = db.getTableInternal(indexSchema.getNormalizedName());
    return checkIndexMetadataExist(objectStore);
  });

  return goog.Promise.all(promises);
}


/**
 * Finds the schemas of all indices that are persisted.
 * @param {!lf.schema.Database} schema
 * @return {!Array<!lf.schema.Index>}
 */
function getPersistedIndices(schema) {
  var tableSchemas = schema.getTables().filter(
      function(tableSchema) {
        return tableSchema.persistentIndex();
      });
  var indexSchemas = [];
  tableSchemas.forEach(function(tableSchema) {
    tableSchema.getIndices().forEach(function(indexSchema) {
      indexSchemas.push(indexSchema);
    });
  });

  return indexSchemas;
}
