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
goog.require('lf.Exception');
goog.require('lf.Row');
goog.require('lf.cache.Journal');
goog.require('lf.index.KeyRange');
goog.require('lf.testing.MockEnv');
goog.require('lf.testing.MockSchema');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('Journal');


/** @type {!lf.testing.MockEnv} */
var env;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  env = new lf.testing.MockEnv();
  env.init().then(function() {
    asyncTestCase.continueTesting();
  });
}


/**
 * Tests the case where a journal that has no write operations recorded is
 * committed.
 */
function testJournal_NoWriteOperations() {
  var table = env.schema.getTables()[2];
  var journal = new lf.cache.Journal([table]);

  var commitFn = function() {
    journal.commit();
  };

  assertNotThrows(commitFn);
}


/**
 * Tests the case where a new row is inserted into the journal.
 */
function testJournal_Insert_New() {
  var table = env.schema.getTables()[0];
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  var pkIndex = env.indexStore.get(pkIndexSchema.getNormalizedName());
  var rowIdIndex = env.indexStore.getRowIdIndex(table.getName());

  var rowId = 1;
  var primaryKey = '100';
  var row = new lf.testing.MockSchema.Row(
      rowId, {'id': primaryKey, 'name': 'DummyName'});

  // First testing case where the row does not already exist.
  assertEquals(0, env.cache.getCount());
  assertFalse(pkIndex.containsKey(primaryKey));
  assertFalse(rowIdIndex.containsKey(rowId));

  var journal = new lf.cache.Journal([table]);
  journal.insert(table, [row]);
  journal.commit();

  assertEquals(1, env.cache.getCount());
  assertTrue(pkIndex.containsKey(primaryKey));
  assertTrue(rowIdIndex.containsKey(rowId));
}


/**
 * Tests the case where a row that has been inserted via a previous, already
 * committed journal is inserted.
 */
function testJournal_Insert_ExistsCommitted() {
  var table = env.schema.getTables()[0];

  var rowId = 1;
  var primaryKey = '100';
  var row = new lf.testing.MockSchema.Row(
      rowId, {'id': primaryKey, 'name': 'DummyName'});

  // Inserting the row into the journal and committing.
  var journal = new lf.cache.Journal([table]);
  journal.insert(table, [row]);
  journal.commit();

  // Now re-inserting a row with the same primary key that already exists.
  row = new lf.testing.MockSchema.Row(
      rowId, {'id': primaryKey, 'name': 'OtherDummyName'});
  journal = new lf.cache.Journal([table]);

  assertThrowsException(
      journal.insert.bind(journal, table, [row]),
      lf.Exception.Type.CONSTRAINT);
}


/**
 * Tests the case where a row that has been inserted previously within the same
 * uncommitted journal is inserted.
 */
function testJournal_Insert_ExistsUncommitted() {
  var table = env.schema.getTables()[0];
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  var pkIndex = env.indexStore.get(pkIndexSchema.getNormalizedName());

  var primaryKey = '100';
  var row1 = table.createRow({'id': primaryKey, 'name': 'DummyName'});

  // Inserting row without committing. Indices and cache are updated immediately
  // regardless of committing or not.
  var journal = new lf.cache.Journal([table]);
  journal.insert(table, [row1]);
  assertEquals(1, env.cache.getCount());
  assertTrue(pkIndex.containsKey(primaryKey));

  // Inserting a row with the same primary key.
  var row2 = table.createRow({'id': primaryKey, 'name': 'OtherDummyName'});
  assertThrowsException(
      journal.insert.bind(journal, table, [row2]),
      lf.Exception.Type.CONSTRAINT);
}


/**
 * Tests the case where a row that has been deleted previously within the same
 * uncommitted journal is inserted.
 */
function testJournal_DeleteInsert_Uncommitted() {
  var table = env.schema.getTables()[0];
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  var pkIndex = env.indexStore.get(pkIndexSchema.getNormalizedName());

  var primaryKey = '100';
  var row1 = table.createRow({'id': primaryKey, 'name': 'DummyName'});

  // First adding the row and committing.
  var journal = new lf.cache.Journal([table]);
  journal.insert(table, [row1]);
  journal.commit();

  // Removing the row on a new journal.
  journal = new lf.cache.Journal([table]);
  journal.remove(table, [row1]);

  // Inserting a row that has the primary key that was just removed within the
  // same journal.
  var row2 = table.createRow({'id': primaryKey, 'name': 'DummyName'});
  journal.insert(table, [row2]);
  journal.commit();

  assertEquals(1, env.cache.getCount());
  assertTrue(pkIndex.containsKey(primaryKey));
}


/**
 * Asserts that calling the given function throws the given exception.
 * @param {!function()} fn The function to call.
 * @param {string} exceptionName The expected name of the exception.
 */
function assertThrowsException(fn, exceptionName) {
  var exceptionThrown = false;
  try {
    fn();
  } catch (error) {
    exceptionThrown = true;
    assertEquals(exceptionName, error.name);
  }
  assertTrue(exceptionThrown);
}


function testJournal_InsertOrReplace() {
  var table = env.schema.getTables()[0];
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  var pkIndex = env.indexStore.get(pkIndexSchema.getNormalizedName());
  var rowIdIndex = env.indexStore.getRowIdIndex(table.getName());

  var primaryKey = '100';
  var row1 = table.createRow({'id': primaryKey, 'name': 'DummyName'});

  // First testing case where the row does not already exist.
  assertEquals(0, env.cache.getCount());
  assertFalse(pkIndex.containsKey(primaryKey));
  assertFalse(rowIdIndex.containsKey(row1.id()));

  var journal = new lf.cache.Journal([table]);
  journal.insertOrReplace(table, [row1]);
  journal.commit();

  assertTrue(pkIndex.containsKey(primaryKey));
  assertTrue(rowIdIndex.containsKey(row1.id()));
  assertEquals(1, env.cache.getCount());

  // Now testing case where the row is being replaced. There should be no
  // exception thrown.
  var row2 = table.createRow({'id': primaryKey, 'name': 'OtherDummyName'});
  journal = new lf.cache.Journal([table]);
  journal.insertOrReplace(table, [row2]);
  journal.commit();

  assertEquals(1, env.cache.getCount());
  assertTrue(pkIndex.containsKey(primaryKey));
  // Expecting the previous row ID to have been preserved since a row with
  // the same primaryKey was already existing.
  assertTrue(rowIdIndex.containsKey(row1.id()));
}


function testJournal_CacheMerge() {
  // Selecting a table without any index (no primary key either).
  var table = env.schema.getTables()[2];

  assertArrayEquals([null, null], env.cache.get([1, 2]));
  var payload = {'id': 'something'};
  var row = new lf.Row(1, payload);
  var row2 = new lf.Row(4, payload);
  env.cache.set([row, row2]);
  assertEquals(2, env.cache.getCount());
  var results = env.cache.get([0, 1, 4]);
  assertNull(results[0]);
  assertObjectEquals(payload, results[1].payload());
  assertObjectEquals(payload, results[2].payload());

  var journal = new lf.cache.Journal([table]);
  var payload2 = {'id': 'nothing'};
  var row3 = new lf.Row(0, payload2);
  var row4 = new lf.Row(4, payload2);
  journal.insert(table, [row3]);
  journal.update(table, [row4]);
  journal.remove(table, [row]);
  journal.commit();

  assertEquals(2, env.cache.getCount());
  results = env.cache.get([0, 1, 4]);
  assertObjectEquals(payload2, results[0].payload());
  assertNull(results[1]);
  assertObjectEquals(payload2, results[2].payload());
}

function testJournal_IndexUpdate() {
  var table = env.schema.getTables()[3];
  var indices = table.getIndices();
  var journal = new lf.cache.Journal([table]);
  var tableName = table.getName();

  var row1 = new lf.testing.MockSchema.Row(1, {'id': '1', 'name': '1'});
  var row2 = new lf.testing.MockSchema.Row(2, {'id': '2', 'name': '2'});
  var row3 = new lf.testing.MockSchema.Row(3, {'id': '3', 'name': '2'});
  var row4 = new lf.testing.MockSchema.Row(1, {'id': '4', 'name': '1'});
  var row5 = new lf.testing.MockSchema.Row(1, {'id': '4', 'name': '4'});

  var pkId = env.indexStore.get(indices[0].getNormalizedName());
  var idxName = env.indexStore.get(indices[1].getNormalizedName());
  var idxBoth = env.indexStore.get(indices[2].getNormalizedName());
  var rowIdIndex = env.indexStore.getRowIdIndex(tableName);

  assertFalse(rowIdIndex.containsKey(1));
  assertFalse(rowIdIndex.containsKey(2));
  assertFalse(rowIdIndex.containsKey(3));
  assertFalse(pkId.containsKey('1'));
  assertFalse(pkId.containsKey('2'));
  assertFalse(pkId.containsKey('3'));
  assertFalse(pkId.containsKey('4'));
  assertFalse(idxName.containsKey('1'));
  assertFalse(idxName.containsKey('2'));
  assertFalse(idxBoth.containsKey('1_1'));
  assertFalse(idxBoth.containsKey('2_2'));
  assertFalse(idxBoth.containsKey('3_2'));
  assertFalse(idxBoth.containsKey('4_4'));

  journal.insert(table, [row1, row2, row3]);
  assertArrayEquals([row1, row2, row3], journal.getTableRows(tableName));

  journal.remove(table, [row2]);
  assertArrayEquals([row1, row3], journal.getTableRows(tableName));

  journal.update(table, [row4]);
  assertArrayEquals([row4, row3], journal.getTableRows(tableName));
  assertArrayEquals([row4], journal.getTableRows(tableName, [1]));
  assertArrayEquals([], journal.getTableRows(tableName, []));
  assertArrayEquals([null], journal.getTableRows(tableName, [8]));

  journal.insertOrReplace(table, [row5]);
  assertArrayEquals([row5, row3], journal.getTableRows(tableName));
  assertArrayEquals([row5], journal.getTableRows(tableName, [1]));

  journal.commit();

  assertTrue(rowIdIndex.containsKey(1));
  assertFalse(rowIdIndex.containsKey(2));
  assertTrue(rowIdIndex.containsKey(3));
  assertFalse(pkId.containsKey('1'));
  assertFalse(pkId.containsKey('2'));
  assertArrayEquals(
      [3, 1],
      pkId.getRange(new lf.index.KeyRange('3', '4', false, false)));
  assertArrayEquals([], idxName.get('1'));
  assertArrayEquals([3], idxName.get('2'));
  assertArrayEquals([1], idxName.get('4'));
  assertFalse(idxBoth.containsKey('1_1'));
  assertFalse(idxBoth.containsKey('2_2'));
  assertTrue(idxBoth.containsKey('3_2'));
  assertTrue(idxBoth.containsKey('4_4'));
  assertArrayEquals([3], idxBoth.get('3_2'));
  assertArrayEquals([1], idxBoth.get('4_4'));
}


function testJournal_GetIndexRange() {
  var table = env.schema.getTables()[0];
  var journal = new lf.cache.Journal([table]);
  var indexSchema = table.getIndices()[1];
  var keyRange1 = new lf.index.KeyRange('aaa', 'bbb', false, false);
  var keyRange2 = new lf.index.KeyRange('ccc', 'eee', false, false);

  var row1 = new lf.testing.MockSchema.Row(
      1, {'id': 'dummyId1', 'name': 'aba'});
  var row2 = new lf.testing.MockSchema.Row(
      2, {'id': 'dummyId2', 'name': 'cdc'});
  var row3 = new lf.testing.MockSchema.Row(
      3, {'id': 'dummyId3', 'name': 'abb'});

  // Adding row3 in the index such that it is within the range [aaa,bbb].
  journal.insert(table, [row3]);
  var index = env.indexStore.get(indexSchema.getNormalizedName());
  var rowIds = index.getRange(keyRange1);
  assertSameElements([row3.id()], rowIds);

  // Checking that the Journal returns row3 as a match, given that row3 has not
  // been modified within the journal itself yet.
  rowIds = journal.getIndexRange(indexSchema, [keyRange1, keyRange2]);
  assertSameElements([row3.id()], rowIds);

  // Inserting new rows within this journal, where row1 and row2 are within the
  // specified range, and modifying row3 such that it is not within range
  // anymore.
  var row3Updated = new lf.testing.MockSchema.Row(
      3, {'id': 'dummyId3', 'name': 'bbba'});
  journal.insertOrReplace(table, [row1, row2, row3Updated]);
  rowIds = journal.getIndexRange(indexSchema, [keyRange1, keyRange2]);
  assertSameElements([row1.id(), row2.id()], rowIds);
}
