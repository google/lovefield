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
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('lf.Global');
goog.require('lf.Order');
goog.require('lf.index.SingleKeyRange');
goog.require('lf.proc.IndexRangeScanStep');
goog.require('lf.proc.MultiIndexRangeScanStep');
goog.require('lf.testing.MockEnv');
goog.require('lf.testing.getSchemaBuilder');
goog.require('lf.testing.proc.MockKeyRangeCalculator');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'PhysicalQueryPlanTest');


/** @type {!lf.schema.Database} */
var schema;


function setUp() {
  asyncTestCase.waitForAsync('setUp');

  var env = new lf.testing.MockEnv(lf.testing.getSchemaBuilder().getSchema());
  env.init().then(function() {
    schema = env.schema;

    return env.addSampleData();
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


function testIndexRangeScan_Ascending() {
  checkIndexRangeScan(lf.Order.ASC, 'testIndexRangeScan_Ascending');
}


function testIndexRangeScan_Descending() {
  checkIndexRangeScan(lf.Order.DESC, 'testIndexRangeScan_Descending');
}


/**
 * Checks that an IndexRangeScanStep returns results in the expected order.
 * @param {!lf.Order} order The expected order.
 * @param {string} description A description of this test.
 */
function checkIndexRangeScan(order, description) {
  asyncTestCase.waitForAsync(description);

  var table = schema.table('tableA');
  var index = order == lf.Order.ASC ?
      table.getIndices()[0] : table.getIndices()[1];
  var keyRange = order == lf.Order.ASC ?
      new lf.index.SingleKeyRange(5, 8, false, false) :
      new lf.index.SingleKeyRange(
          'dummyName' + 5, 'dummyName' + 8, false, false);
  var step = new lf.proc.IndexRangeScanStep(
      lf.Global.get(), index,
      new lf.testing.proc.MockKeyRangeCalculator([keyRange]), false);

  step.exec().then(
      function(relations) {
        var relation = relations[0];
        assertEquals(4, relation.entries.length);
        relation.entries.forEach(function(entry, j) {
          if (j == 0) {
            return;
          }

          // Row ID is equal to the payload's ID field for the data used in this
          // test.
          var comparator = order == lf.Order.ASC ? 1 : -1;
          assertTrue(comparator *
              (entry.row.id() - relation.entries[j - 1].row.id()) > 0);
        });

        asyncTestCase.continueTesting();
      }, fail);
}


function testMultiIndexRangeScan_Empty() {
  asyncTestCase.waitForAsync('testMultiIndexRangeScan_Empty');

  var idKeyRange = new lf.index.SingleKeyRange(20, 21, false, false);
  var nameKeyRange = new lf.index.SingleKeyRange(
      'dummyName' + 200, 'dummyName' + 205, false, false);
  assertMultiIndexRangeScanResult(
      idKeyRange, nameKeyRange, []).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


function testMultiIndexRangeScan() {
  asyncTestCase.waitForAsync('testMultiIndexRangeScan');

  var idKeyRange = new lf.index.SingleKeyRange(5, 8, false, false);
  var nameKeyRange = new lf.index.SingleKeyRange(
      'dummyName' + 3, 'dummyName' + 5, false, false);
  // Expecting the idKeyRange to find rows with rowIDs 5, 6, 7, 8.
  // Expecting the nameKeyRange to find rows with rowIDs 3, 4, 5.
  var expectedRowIds = [3, 4, 5, 6, 7, 8];

  assertMultiIndexRangeScanResult(
      idKeyRange, nameKeyRange, expectedRowIds).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Asserts that MultiIndexRangeScanStep#exec() correctly combines the results of
 * its children IndexRangeScanStep instances.
 * @param {!lf.index.SingleKeyRange} idKeyRange
 * @param {!lf.index.SingleKeyRange} nameKeyRange
 * @param {!Array<number>} expectedRowIds
 * @return {!IThenable}
 */
function assertMultiIndexRangeScanResult(
    idKeyRange, nameKeyRange, expectedRowIds) {
  var table = schema.table('tableA');
  var idIndex = table['id'].getIndex();
  var idRangeScanStep = new lf.proc.IndexRangeScanStep(
      lf.Global.get(), idIndex,
      new lf.testing.proc.MockKeyRangeCalculator([idKeyRange]), false);

  var nameIndex = table['name'].getIndex();
  var nameRangeScanStep = new lf.proc.IndexRangeScanStep(
      lf.Global.get(), nameIndex,
      new lf.testing.proc.MockKeyRangeCalculator([nameKeyRange]), false);

  var step = new lf.proc.MultiIndexRangeScanStep();
  step.addChild(idRangeScanStep);
  step.addChild(nameRangeScanStep);

  return step.exec().then(
      function(relations) {
        assertEquals(1, relations.length);
        var relation = relations[0];
        var actualRowIds = relation.entries.map(function(entry) {
          return entry.row.id();
        });
        assertSameElements(expectedRowIds, actualRowIds);
      });
}
