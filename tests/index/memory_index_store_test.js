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

goog.require('goog.functions');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('lf.index.BTree');
goog.require('lf.index.ComparatorFactory');
goog.require('lf.index.MemoryIndexStore');
goog.require('lf.index.NullableIndex');
goog.require('lf.index.RowId');
goog.require('lf.testing.getSchemaBuilder');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'MemoryIndexStore');


/** @type {!goog.testing.PropertyReplacer} */
var propertyReplacer;


/** @type {!lf.index.IndexStore} */
var indexStore;


/** @type {!lf.schema.Database} */
var schema;


function setUp() {
  propertyReplacer = new goog.testing.PropertyReplacer();
  indexStore = new lf.index.MemoryIndexStore();
  schema = lf.testing.getSchemaBuilder().getSchema();
}


function tearDown() {
  propertyReplacer.reset();
}


function testMemoryIndexStore() {
  asyncTestCase.waitForAsync('testMemoryIndexStore');

  var tableA = schema.table('tableA');
  var tableB = schema.table('tableB');
  var tableF = schema.table('tableF');
  propertyReplacer.replace(tableB, 'persistentIndex', goog.functions.TRUE);

  assertFalse(tableA.persistentIndex());
  assertTrue(tableB.persistentIndex());
  assertFalse(tableF.persistentIndex());

  indexStore.init(schema).then(function() {
    // Table A index names.
    var tableAPkIndex = 'tableA.pkTableA';
    var tableANameIndex = 'tableA.idxName';
    var tableARowIdIndex = 'tableA.#';

    // Table B index names.
    var tableBPkIndex = 'tableB.pkTableB';
    var tableBNameIndex = 'tableB.idxName';
    var tableBRowIdIndex = 'tableB.#';

    // Table F index names.
    var tableFNameIndex = 'tableF.idxName';
    var tableFRowIdIndex = 'tableF.#';

    // Table G index names.
    var tableGFkIndex = 'tableG.fk_Id';
    var tableGFkIndex2 = 'tableG.idx_Id';

    // Table J index names.
    var tableJIdIndex = 'tableJ.idxId';

    assertIndicesType(
        [tableARowIdIndex, tableBRowIdIndex, tableFRowIdIndex],
        lf.index.RowId);
    assertIndicesType([tableAPkIndex], lf.index.BTree);
    assertIndicesType([tableGFkIndex], lf.index.BTree);
    assertIndicesType([tableGFkIndex2], lf.index.BTree);
    assertIndicesType([tableANameIndex], lf.index.BTree);
    assertIndicesType([tableBPkIndex, tableBNameIndex], lf.index.BTree);
    // Single-column nullable index is typed NullableIndex.
    assertIndicesType([tableFNameIndex], lf.index.NullableIndex);
    // Cross-column nullable index is typed BTree.
    assertIndicesType([tableJIdIndex], lf.index.BTree);

    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Asserts that the indices corresponding to the given index names are of a
 * specific type.
 * @param {!Array<string>} indexNames
 * @param {!Function} expectedType
 */
function assertIndicesType(indexNames, expectedType) {
  indexNames.forEach(function(indexName) {
    var index = indexStore.get(indexName);
    assertTrue(index instanceof expectedType);
  });
}


/**
 * Tests the case of calling getTableIndices() for a table that has no indices.
 */
function testGetTableIndices_NoIndices() {
  asyncTestCase.waitForAsync('testGetTableIndices');

  indexStore.init(schema).then(function() {
    var tableWithNoIndexName = schema.table('tableC');
    // There should be at least one row id index.
    assertEquals(1,
        indexStore.getTableIndices(tableWithNoIndexName.getName()).length);
    assertNotNull(indexStore.get(tableWithNoIndexName.getRowIdIndexName()));
    asyncTestCase.continueTesting();
  });
}


/**
 * Tests that when searching for a table's indices, the table name is used as a
 * prefix only.
 */
function testGetTableIndices_Prefix() {
  var index1 = new lf.index.RowId('MovieActor.#');
  var index2 = new lf.index.RowId('Actor.#');
  var index3 = new lf.index.RowId('ActorMovie.#');

  indexStore.set('MovieActor', index1);
  indexStore.set('Actor', index2);
  indexStore.set('ActorMovie', index3);

  var tableIndices = indexStore.getTableIndices('Actor');
  assertEquals(1, tableIndices.length);
  assertEquals(index2.getName(), tableIndices[0].getName());
}


/**
 * Tests that set() is correctly replacing any existing indices.
 */
function testSet() {
  asyncTestCase.waitForAsync('testSet');

  var tableSchema = schema.table('tableA');
  var indexSchema = tableSchema.getIndices()[0];

  indexStore.init(schema).then(function() {
    var indexBefore = indexStore.get(indexSchema.getNormalizedName());
    var comparator = lf.index.ComparatorFactory.create(indexSchema);
    var newIndex = new lf.index.BTree(
        indexSchema.getNormalizedName(),
        comparator,
        indexSchema.isUnique);
    indexStore.set(tableSchema.getName(), newIndex);

    var indexAfter = indexStore.get(indexSchema.getNormalizedName());
    assertTrue(indexBefore != indexAfter);
    assertTrue(newIndex == indexAfter);

    asyncTestCase.continueTesting();
  });
}
