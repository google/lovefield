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
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('lf.Global');
goog.require('lf.cache.Prefetcher');
goog.require('lf.index.BTree');
goog.require('lf.index.IndexMetadata');
goog.require('lf.index.IndexMetadataRow');
goog.require('lf.index.MemoryIndexStore');
goog.require('lf.index.RowId');
goog.require('lf.testing.MockEnv');
goog.require('lf.testing.MockSchema');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('Prefetcher');


/** @type {!goog.testing.PropertyReplacer} */
var propertyReplacer;


/** @type {!lf.testing.MockEnv} */
var env;


function setUpPage() {
  propertyReplacer = new goog.testing.PropertyReplacer();
}


function tearDown() {
  propertyReplacer.reset();
}


function setUp() {
  env = new lf.testing.MockEnv();

  // Modifying tableA to use persisted indices.
  propertyReplacer.replace(
      env.schema.tables()[0], 'persistentIndex', goog.functions.TRUE);

  asyncTestCase.waitForAsync('init');
  env.init().then(goog.bind(asyncTestCase.continueTesting, asyncTestCase));
}


function testPrefetcher() {
  // Setup some data first.
  var rows = getSampleRows(19);

  var table = env.store.getTableInternal(env.schema.tables()[3].getName());
  var indices = env.indexStore.getTableIndices(
      env.schema.tables()[3].getName());
  var rowIdIndex = indices[0];
  var pkIndex = indices[1];
  var nameIndex = indices[2];

  asyncTestCase.waitForAsync('testPrefetcher');
  table.put(rows).then(function() {
    assertEquals(0, env.cache.getCount());
    assertArrayEquals([], rowIdIndex.get(1001));
    assertEquals(0, rowIdIndex.getRange().length);
    assertEquals(0, pkIndex.getRange().length);
    assertEquals(0, nameIndex.getRange().length);

    var prefetcher = new lf.cache.Prefetcher(lf.Global.get());
    return prefetcher.init(env.schema);
  }, fail).then(function() {
    assertEquals(rows.length, env.cache.getCount());
    assertEquals(rows[1], env.cache.get([pkIndex.get(1001)[0]])[0]);
    assertEquals(rows[1], env.cache.get([indices[3].get('1001_name1')[0]])[0]);

    // Checking that indices have the right size after initialization.
    assertEquals(rows.length, rowIdIndex.getRange().length);
    assertEquals(rows.length, pkIndex.getRange().length);
    assertEquals(rows.length, nameIndex.getRange().length);

    asyncTestCase.continueTesting();
  });
}


/**
 * Tests that Prefetcher is reconstructing persisted indices from the backing
 * store.
 */
function testInit_PersistentIndices() {
  asyncTestCase.waitForAsync('testInit_PersistentIndices');


  var rows = getSampleRows(10);
  var tableSchema = env.schema.tables()[0];
  propertyReplacer.replace(tableSchema, 'persistentIndex', goog.functions.TRUE);

  simulatePersistedIndices(tableSchema, rows).then(
      function() {
        var prefetcher = new lf.cache.Prefetcher(lf.Global.get());
        return prefetcher.init(env.schema);
      }).then(
      function() {
        // Check that RowId index has been properly reconstructed.
        var rowIdIndex = env.indexStore.get(tableSchema.getRowIdIndexName());
        assertTrue(rowIdIndex instanceof lf.index.RowId);
        assertEquals(rows.length, rowIdIndex.getRange().length);

        // Check that remaining indices have been properly reconstructed.
        var indices = env.indexStore.getTableIndices(
            tableSchema.getName()).slice(1);
        indices.forEach(function(index) {
          assertTrue(index instanceof lf.index.BTree);
          assertEquals(rows.length, index.getRange().length);
        });

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * @param {number} rowCount The number of sample rows to generate.
 * @return {!Array<!lf.Row>}
 */
function getSampleRows(rowCount) {
  var rows = [];

  var rowCountFirstHalf = Math.floor(rowCount / 2);
  for (var i = 0; i < rowCountFirstHalf; i++) {
    rows.push(new lf.testing.MockSchema.Row(i + 2, {
      'id': 1000 + i,
      'name': 'name' + i
    }));
  }

  // Generating a few rows with non-unique values for the "name" field. This
  // allows tests in this file to trigger the case where an index corresponding
  // to a non-unique field is initialized.
  for (var i = rowCountFirstHalf; i < rowCount; i++) {
    rows.push(new lf.testing.MockSchema.Row(i + 2, {
      'id': 1000 + i,
      'name': 'nonUniqueName'
    }));
  }

  return rows;
}


/**
 * Populates the backstore tables that correspond to indices for the given table
 * with dummy data. Used for testing prefetcher#init.
 * @param {!lf.schema.Table} tableSchema
 * @param {!Array<lf.Row>} tableRows
 * @return {!IThenable} A signal that index contents have been persisted in the
 *     backing store.
 */
function simulatePersistedIndices(tableSchema, tableRows) {
  var tempIndexStore = new lf.index.MemoryIndexStore();
  return tempIndexStore.init(env.schema).then(function() {
    var indices = tempIndexStore.getTableIndices(tableSchema.getName());
    tableRows.forEach(function(row) {
      indices.forEach(function(index) {
        var key = /** @type {!lf.index.Index.Key} */ (
            row.keyOfIndex(index.getName()));
        index.add(key, row.id());
      });
    });

    var serializedIndices = indices.map(function(index) {
      var indexType = index.getName() == tableSchema.getRowIdIndexName() ?
          lf.index.IndexMetadata.Type.ROW_ID :
          lf.index.IndexMetadata.Type.BTREE;
      var indexMetadataRow = lf.index.IndexMetadataRow.forType(indexType);
      return [indexMetadataRow].concat(index.serialize());
    });
    var whenIndexTablesPopulated = indices.map(function(index, i) {
      var indexTable = env.store.getTableInternal(index.getName());
      return indexTable.put(serializedIndices[i]);
    });

    return goog.Promise.all(whenIndexTablesPopulated);
  });
}
