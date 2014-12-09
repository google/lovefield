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
goog.require('lf.index.AATree');
goog.require('lf.index.BTree');
goog.require('lf.index.Map');
goog.require('lf.index.MemoryIndexStore');
goog.require('lf.index.RowId');
goog.require('lf.testing.MockSchema');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'MemoryIndexStore');


/** @type {!goog.testing.PropertyReplacer} */
var propertyReplacer;


/** @type {!lf.index.IndexStore} */
var indexStore;


function setUp() {
  propertyReplacer = new goog.testing.PropertyReplacer();
  indexStore = new lf.index.MemoryIndexStore();
}


function tearDown() {
  propertyReplacer.reset();
}


function testMemoryIndexStore() {
  asyncTestCase.waitForAsync('testMemoryIndexStore');

  var schema = new lf.testing.MockSchema();
  var tableA = schema.getTables()[0];
  var tableB = schema.getTables()[1];
  propertyReplacer.replace(tableB, 'persistentIndex', goog.functions.TRUE);

  assertFalse(tableA.persistentIndex());
  assertTrue(tableB.persistentIndex());

  indexStore.init(schema).then(function() {
    // Table A index names.
    var tableAPkIndex = 'tableA.pkId';
    var tableANameIndex = 'tableA.idxName';
    var tableARowIdIndex = 'tableA.#';

    // Table B index names.
    var tableBPkIndex = 'tableB.pkId';
    var tableBNameIndex = 'tableB.idxName';
    var tableBRowIdIndex = 'tableB.#';

    assertIndicesType([tableARowIdIndex, tableBRowIdIndex], lf.index.RowId);
    assertIndicesType([tableAPkIndex], lf.index.AATree);
    assertIndicesType([tableANameIndex], lf.index.Map);
    assertIndicesType([tableBPkIndex, tableBNameIndex], lf.index.BTree);

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

  var schema = new lf.testing.MockSchema();

  indexStore.init(schema).then(function() {
    var tableWithNoIndexName = schema.getTables()[2];  // tableC_
    // There should be at least one row id index.
    assertEquals(1,
        indexStore.getTableIndices(tableWithNoIndexName.getName()).length);
    assertNotNull(indexStore.get(tableWithNoIndexName.getRowIdIndexName()));
    asyncTestCase.continueTesting();
  });
}
