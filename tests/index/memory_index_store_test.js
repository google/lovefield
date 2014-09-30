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

goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('lf.index.AATree');
goog.require('lf.index.Map');
goog.require('lf.index.MemoryIndexStore');
goog.require('lf.testing.MockSchema');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'MemoryIndexStore');


function testMemoryIndexStore() {
  var indexStore = new lf.index.MemoryIndexStore();
  var schema = new lf.testing.MockSchema();

  asyncTestCase.waitForAsync('testMemoryIndexStore');

  indexStore.init(schema).then(function() {
    var expected =
        ['tableA.pkId', 'tableA.idxName', 'tableB.pkId', 'tableB.idxName'];
    expected.forEach(function(name, i) {
      var index = indexStore.get(name);
      if (i % 2 == 0) {
        assertTrue(index instanceof lf.index.AATree);
      } else {
        assertTrue(index instanceof lf.index.Map);
      }
    });

    asyncTestCase.continueTesting();
  });
}


/**
 * Tests the case of calling getTableIndices() for a table that has no indices.
 */
function testGetTableIndices_NoIndices() {
  asyncTestCase.waitForAsync('testGetTableIndices');

  var indexStore = new lf.index.MemoryIndexStore();
  var schema = new lf.testing.MockSchema();

  indexStore.init(schema).then(function() {
    var tableWithNoIndexName = 'tableC';
    // There should be at least one row id index.
    assertEquals(1, indexStore.getTableIndices(tableWithNoIndexName).length);
    assertNotNull(indexStore.getRowIdIndex(tableWithNoIndexName));
    asyncTestCase.continueTesting();
  });
}
