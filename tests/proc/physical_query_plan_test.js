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
goog.require('lf.Global');
goog.require('lf.TransactionType');
goog.require('lf.cache.Journal');
goog.require('lf.index.KeyRange');
goog.require('lf.proc.IndexRangeScanStep');
goog.require('lf.proc.Relation');
goog.require('lf.proc.TableAccessByRowIdStep');
goog.require('lf.proc.TableAccessFullStep');
goog.require('lf.testing.MockEnv');
goog.require('lf.testing.MockSchema');
goog.require('lf.testing.proc.DummyStep');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'PhysicalQueryPlanTest');


/** @type {!lf.schema.Database} */
var schema;


/** @type {!lf.BackStore} */
var backStore;


/** @type {!lf.index.IndexStore} */
var indexStore;


function setUp() {
  asyncTestCase.waitForAsync('setUp');

  var env = new lf.testing.MockEnv();
  env.init().then(function() {
    schema = env.schema;
    backStore = env.store;
    indexStore = env.indexStore;

    return addSampleData();
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


function testTableAccessFullStep() {
  checkTableAccessFullStep('testTableAccessFullStep', schema.getTables()[0]);
}


function testTableAccessFullStep_Alias() {
  checkTableAccessFullStep(
      'testTableAccessFullStep_Alias',
      schema.getTables()[0].as('SomeTableAlias'));
}


/**
 * Checks that a TableAccessFullStep that refers to the given table produces
 * the expected results.
 * @param {string} description
 * @param {!lf.schema.Table} table
 */
function checkTableAccessFullStep(description, table) {
  asyncTestCase.waitForAsync(description);

  var step = new lf.proc.TableAccessFullStep(table);
  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  step.exec(journal).then(
      function(relation) {
        assertFalse(relation.isPrefixApplied());
        assertArrayEquals([table.getEffectiveName()], relation.getTables());
        assertTrue(relation.entries.length > 0);
        asyncTestCase.continueTesting();
      }, fail);
}


function testTableAccessByRowId() {
  checkTableAccessByRowId('testTableAccessByRowId', schema.getTables()[0]);
}


function testTableAccessByRowId_Alias() {
  checkTableAccessByRowId(
      'testTableAccessByRowId_Alias',
      schema.getTables()[0].as('SomeTableAlias'));
}


/**
 * Checks that a TableAccessByRowIdStep that refers to the given table produces
 * the expected results.
 * @param {string} description
 * @param {!lf.schema.Table} table
 */
function checkTableAccessByRowId(description, table) {
  asyncTestCase.waitForAsync(description);

  var step = new lf.proc.TableAccessByRowIdStep(table);

  // Creating a "dummy" child step that will return only two row IDs.
  var rows = [
    new lf.testing.MockSchema.Row(0, {id: 1, name: 'a'}),
    new lf.testing.MockSchema.Row(1, {id: 2, name: 'b'})
  ];
  step.addChild(new lf.testing.proc.DummyStep(
      lf.proc.Relation.fromRows(rows, [table.getName()])));

  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  step.exec(journal).then(
      function(relation) {
        assertFalse(relation.isPrefixApplied());
        assertArrayEquals([table.getEffectiveName()], relation.getTables());

        assertEquals(rows.length, relation.entries.length);
        relation.entries.forEach(function(entry, index) {
          var rowId = rows[index].id();
          assertEquals(rowId, entry.row.id());
          assertEquals('dummyName' + rowId, entry.row.payload().name);
        });

        asyncTestCase.continueTesting();
      }, fail);
}


function testTableAccessByRowId_Empty() {
  asyncTestCase.waitForAsync('testTableAccessByRowId_Empty');

  var table = schema.getTables()[1];
  var step = new lf.proc.TableAccessByRowIdStep(table);

  // Creating a "dummy" child step that will not return any row IDs.
  step.addChild(new lf.testing.proc.DummyStep(lf.proc.Relation.createEmpty()));

  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  step.exec(journal).then(
      function(relation) {
        assertEquals(0, relation.entries.length);
        asyncTestCase.continueTesting();
      }, fail);
}


function testIndexRangeScan() {
  asyncTestCase.waitForAsync('testIndexRangeScan');

  var table = schema.getTables()[0];
  var index = table.getIndices()[0];
  var keyRange = new lf.index.KeyRange(5, 8, false, false);
  var step = new lf.proc.IndexRangeScanStep(index, [keyRange]);

  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  step.exec(journal).then(
      function(relation) {
        assertEquals(keyRange.to - keyRange.from + 1, relation.entries.length);
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Generates sample data and adds them to the database.
 * @return {!IThenable} A signal that sample data have been added.
 */
function addSampleData() {
  var sampleDataCount = 10;
  var rows = new Array(sampleDataCount);
  for (var i = 0; i < sampleDataCount; i++) {
    rows[i] = new lf.testing.MockSchema.Row(i, {
      'id': i.toString(),
      'name': 'dummyName' + i.toString()
    });
  }

  var table = schema.getTables()[0];
  var tx = backStore.createTx(
      lf.TransactionType.READ_WRITE,
      new lf.cache.Journal(lf.Global.get(), [table]));
  var store = tx.getTable(table.getName(), table.deserializeRow);
  store.put(rows);

  // Updating journals, which will automatically update indices.
  tx.getJournal().insert(table, rows);

  return tx.commit();
}
