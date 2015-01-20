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
goog.require('lf.Global');
goog.require('lf.Order');
goog.require('lf.Row');
goog.require('lf.cache.Journal');
goog.require('lf.index.KeyRange');
goog.require('lf.testing.MockEnv');
goog.require('lf.testing.MockSchema');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'JournalTest');


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
function testNoWriteOperations() {
  var table = env.schema.getTables()[2];
  var journal = new lf.cache.Journal(lf.Global.get(), [table]);

  var commitFn = function() {
    journal.commit();
  };

  assertNotThrows(commitFn);
}


/**
 * Tests the case where a new row is inserted into the journal.
 */
function testInsert_New() {
  var table = env.schema.getTables()[0];
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  var pkIndex = env.indexStore.get(pkIndexSchema.getNormalizedName());
  var rowIdIndex = env.indexStore.get(table.getRowIdIndexName());

  var primaryKey = '100';
  var row = table.createRow({'id': primaryKey, 'name': 'DummyName'});

  // First testing case where the row does not already exist.
  assertEquals(0, env.cache.getCount());
  assertFalse(pkIndex.containsKey(primaryKey));
  assertFalse(rowIdIndex.containsKey(row.id()));

  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  journal.insert(table, [row]);
  journal.commit();

  assertEquals(1, env.cache.getCount());
  assertTrue(pkIndex.containsKey(primaryKey));
  assertTrue(rowIdIndex.containsKey(row.id()));
}


/**
 * Tests the case where a row that has been inserted via a previous, already
 * committed journal is inserted.
 */
function testInsert_PrimaryKeyViolation1() {
  var table = env.schema.getTables()[0];
  var rowIdIndex = env.indexStore.get(table.getRowIdIndexName());

  var primaryKey = '100';
  var row = table.createRow({'id': primaryKey, 'name': 'DummyName'});

  // Inserting the row into the journal and committing.
  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  journal.insert(table, [row]);
  journal.commit();
  assertTrue(rowIdIndex.containsKey(row.id()));

  // Now re-inserting a row with the same primary key that already exists.
  var otherRow = table.createRow({'id': primaryKey, 'name': 'OtherDummyName'});
  journal = new lf.cache.Journal(lf.Global.get(), [table]);

  assertThrowsException(
      journal.insert.bind(journal, table, [otherRow]),
      lf.Exception.Type.CONSTRAINT);
  journal.rollback();
  assertFalse(rowIdIndex.containsKey(otherRow.id()));
}


/**
 * Tests the case where a row that has been inserted previously within the same
 * uncommitted journal is inserted.
 */
function testInsert_PrimaryKeyViolation2() {
  var table = env.schema.getTables()[0];
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  var pkIndex = env.indexStore.get(pkIndexSchema.getNormalizedName());

  var primaryKey = '100';
  var row1 = table.createRow({'id': primaryKey, 'name': 'DummyName'});

  // Inserting row without committing. Indices and cache are updated immediately
  // regardless of committing or not.
  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  journal.insert(table, [row1]);
  assertEquals(1, env.cache.getCount());
  assertTrue(pkIndex.containsKey(primaryKey));

  // Inserting a row with the same primary key.
  var row2 = table.createRow({'id': primaryKey, 'name': 'OtherDummyName'});
  assertThrowsException(
      journal.insert.bind(journal, table, [row2]),
      lf.Exception.Type.CONSTRAINT);
  journal.rollback();

  // Expecting the entire journal to have been rolled back.
  assertEquals(0, env.cache.getCount());
  assertFalse(pkIndex.containsKey(primaryKey));
}


/**
 * Tests the case where some of the rows being inserted, have the same primary
 * key. An exception should be thrown even though the primary key does not
 * already exist prior this insertion.
 */
function testInsert_PrimaryKeyViolation3() {
  var table = env.schema.getTables()[0];
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  var pkIndex = env.indexStore.get(pkIndexSchema.getNormalizedName());

  var rows = [];
  for (var i = 0; i < 3; i++) {
    rows.push(table.createRow(
        {'id': 'pk' + i.toString(), 'name': 'DummyName'}));
  }
  for (var j = 0; j < 3; j++) {
    rows.push(table.createRow({'id': 'samePk', 'name': 'DummyName'}));
  }

  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  assertThrowsException(
      journal.insert.bind(journal, table, rows),
      lf.Exception.Type.CONSTRAINT);
  journal.rollback();

  assertEquals(0, env.cache.getCount());
  var rowIdIndex = env.indexStore.get(table.getRowIdIndexName());
  rows.forEach(function(row) {
    assertFalse(pkIndex.containsKey(row.payload()['id']));
    assertFalse(rowIdIndex.containsKey(row.id()));
  });
}


/**
 * Tests the case where a unique key violation occurs because a row with the
 * same unique key already exists via a previous committed journal.
 */
function testInsert_UniqueKeyViolation() {
  var table = env.schema.getTables()[4];
  var emailIndexSchema = table.getConstraint().getUnique()[0];
  var emailIndex = env.indexStore.get(emailIndexSchema.getNormalizedName());
  var rowIdIndex = env.indexStore.get(table.getRowIdIndexName());

  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  var row1 = table.createRow({'id': 'pk1', 'email': 'emailAddress1'});
  journal.insert(table, [row1]);
  journal.commit();
  assertTrue(emailIndex.containsKey(row1.payload()['email']));
  assertTrue(rowIdIndex.containsKey(row1.id()));
  assertEquals(1, env.cache.getCount());

  journal = new lf.cache.Journal(lf.Global.get(), [table]);
  var row2 = table.createRow({'id': 'pk2', 'email': 'emailAddress1'});
  assertThrowsException(
      journal.insert.bind(journal, table, [row2]),
      lf.Exception.Type.CONSTRAINT);
  journal.rollback();

  assertEquals(row1.id(), emailIndex.get(row1.payload()['email'])[0]);
  assertTrue(rowIdIndex.containsKey(row1.id()));
  assertEquals(1, env.cache.getCount());
}


/**
 * Tests that not-nullable constraint checks are happening within
 * Journal#insert.
 */
function testInsert_NotNullableKeyViolation() {
  var table = env.schema.getTables()[4];
  assertEquals(0, env.cache.getCount());

  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  var row1 = table.createRow({'id': 'pk1', 'email': null});
  assertThrowsException(
      journal.insert.bind(journal, table, [row1]),
      lf.Exception.Type.CONSTRAINT);
  journal.rollback();
  assertEquals(0, env.cache.getCount());
}


/**
 * Tests that not-nullable constraint checks are happening within
 * Journal#insertOrReplace.
 */
function testInsertOrReplace_NotNullableKeyViolation() {
  var table = env.schema.getTables()[4];
  assertEquals(0, env.cache.getCount());

  // Attempting to insert a new invalid row.
  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  var row1 = table.createRow({'id': 'pk1', 'email': null});
  assertThrowsException(
      journal.insertOrReplace.bind(journal, table, [row1]),
      lf.Exception.Type.CONSTRAINT);
  journal.rollback();
  assertEquals(0, env.cache.getCount());

  // Attempting to insert a new valid row.
  var row2 = table.createRow({'id': 'pk2', 'email': 'emailAddress'});
  journal = new lf.cache.Journal(lf.Global.get(), [table]);
  journal.insertOrReplace(table, [row2]);
  assertEquals(1, env.cache.getCount());

  // Attempting to replace existing row with an invalid one.
  var row2Updated = table.createRow({'id': 'pk2', 'email': null});
  journal = new lf.cache.Journal(lf.Global.get(), [table]);
  assertThrowsException(
      journal.insertOrReplace.bind(journal, table, [row2Updated]),
      lf.Exception.Type.CONSTRAINT);
  journal.rollback();
}


/**
 * Tests that not-nullable constraint checks are happening within
 * Journal#update.
 */
function testUpdate_NotNullableKeyViolation() {
  var table = env.schema.getTables()[4];
  assertEquals(0, env.cache.getCount());

  var row = table.createRow({'id': 'pk1', 'email': 'emailAddress'});
  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  journal.insert(table, [row]);
  assertEquals(1, env.cache.getCount());

  journal = new lf.cache.Journal(lf.Global.get(), [table]);
  var rowUpdatedInvalid = new lf.testing.MockSchema.Row(
      row.id(), {'id': 'pk1', 'email': null});
  assertThrowsException(
      journal.update.bind(journal, table, [rowUpdatedInvalid]),
      lf.Exception.Type.CONSTRAINT);
  journal.rollback();

  journal = new lf.cache.Journal(lf.Global.get(), [table]);
  var rowUpdatedValid = new lf.testing.MockSchema.Row(
      row.id(), {'id': 'pk1', 'email': 'otherEmailAddress'});
  assertNotThrows(function() {
    journal.update(table, [rowUpdatedValid]);
  });
}


/**
 * Tests that update() succeeds if there is no primary/unique key violation.
 */
function testUpdate_NoPrimaryKeyViolation() {
  var table = env.schema.getTables()[0];
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  var pkIndex = env.indexStore.get(pkIndexSchema.getNormalizedName());
  var rowIdIndex = env.indexStore.get(table.getRowIdIndexName());

  var row = table.createRow({'id': 'pk1', 'name': 'DummyName'});
  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  journal.insert(table, [row]);
  journal.commit();
  assertEquals(1, env.cache.getCount());
  assertTrue(pkIndex.containsKey(row.payload()['id']));
  assertTrue(rowIdIndex.containsKey(row.id()));

  // Attempting to update a column that is not the primary key.
  var rowUpdated1 = new lf.testing.MockSchema.Row(
      row.id(), {'id': row.payload()['id'], 'name': 'OtherDummyName'});

  journal = new lf.cache.Journal(lf.Global.get(), [table]);
  journal.update(table, [rowUpdated1]);
  journal.commit();

  // Attempting to update the primary key column.
  var rowUpdated2 = new lf.testing.MockSchema.Row(
      row.id(), {'id': 'otherPk', 'name': 'OtherDummyName'});
  journal = new lf.cache.Journal(lf.Global.get(), [table]);
  journal.update(table, [rowUpdated2]);
  journal.commit();

  assertFalse(pkIndex.containsKey(row.payload()['id']));
  assertTrue(pkIndex.containsKey(rowUpdated2.payload()['id']));
}


/**
 * Tests the case where a row is updated to have a primary key that already
 * exists from a previously committed journal.
 */
function testUpdate_PrimaryKeyViolation1() {
  var table = env.schema.getTables()[0];
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  var pkIndex = env.indexStore.get(pkIndexSchema.getNormalizedName());

  var row1 = table.createRow({'id': 'pk1', 'name': 'DummyName'});
  var row2 = table.createRow({'id': 'pk2', 'name': 'DummyName'});

  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  journal.insert(table, [row1, row2]);
  journal.commit();
  assertEquals(2, env.cache.getCount());
  assertTrue(pkIndex.containsKey(row1.payload()['id']));
  assertTrue(pkIndex.containsKey(row2.payload()['id']));

  // Attempting to update row2 to have the same primary key as row1.
  var row2Updated = new lf.testing.MockSchema.Row(
      row2.id(), {'id': row1.payload()['id'], 'name': 'OtherDummyName'});

  journal = new lf.cache.Journal(lf.Global.get(), [table]);
  assertThrowsException(
      journal.update.bind(journal, table, [row2Updated]),
      lf.Exception.Type.CONSTRAINT);
  journal.rollback();
}


/**
 * Tests the case where a row is updated to have a primary key that already
 * exists from a row that has been added within the same journal.
 */
function testUpdate_PrimaryKeyViolation2() {
  var table = env.schema.getTables()[0];
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  var pkIndex = env.indexStore.get(pkIndexSchema.getNormalizedName());

  var row1 = table.createRow({'id': 'pk1', 'name': 'DummyName'});
  var row2 = table.createRow({'id': 'pk2', 'name': 'DummyName'});

  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  journal.insert(table, [row1, row2]);
  assertEquals(2, env.cache.getCount());
  assertTrue(pkIndex.containsKey(row1.payload()['id']));
  assertTrue(pkIndex.containsKey(row2.payload()['id']));

  // Attempting to update row2 to have the same primary key as row1.
  var row2Updated = new lf.testing.MockSchema.Row(
      row2.id(), {'id': row1.payload()['id'], 'name': 'OtherDummyName'});
  assertThrowsException(
      journal.update.bind(journal, table, [row2Updated]),
      lf.Exception.Type.CONSTRAINT);
  journal.rollback();
}


/**
 * Tests the case where multiple rows are updated to have the same primary key
 * and that primary key does not already exist.
 */
function testUpdate_PrimaryKeyViolation3() {
  var table = env.schema.getTables()[0];
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  var pkIndex = env.indexStore.get(pkIndexSchema.getNormalizedName());

  var rows = [];
  for (var i = 0; i < 3; i++) {
    rows.push(table.createRow(
        {'id': 'pk' + i.toString(), 'name': 'DummyName'}));
  }

  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  journal.insert(table, rows);
  journal.commit();
  assertEquals(rows.length, env.cache.getCount());
  rows.forEach(function(row) {
    assertTrue(pkIndex.containsKey(row.payload()['id']));
  });

  var rowsUpdated = rows.map(function(row) {
    return new lf.testing.MockSchema.Row(
        row.id(), {'id': 'somePk', 'name': 'DummyName'});
  });

  journal = new lf.cache.Journal(lf.Global.get(), [table]);
  assertThrowsException(
      journal.update.bind(journal, table, rowsUpdated),
      lf.Exception.Type.CONSTRAINT);
  journal.rollback();
}


/**
 * Tests the case where a row that has been deleted previously within the same
 * uncommitted journal is inserted.
 */
function testDeleteInsert_Uncommitted() {
  var table = env.schema.getTables()[0];
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  var pkIndex = env.indexStore.get(pkIndexSchema.getNormalizedName());
  var rowIdIndex = env.indexStore.get(table.getRowIdIndexName());

  var primaryKey = '100';
  var row1 = table.createRow({'id': primaryKey, 'name': 'DummyName'});

  // First adding the row and committing.
  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  journal.insert(table, [row1]);
  journal.commit();

  // Removing the row on a new journal.
  journal = new lf.cache.Journal(lf.Global.get(), [table]);
  journal.remove(table, [row1]);

  // Inserting a row that has the primary key that was just removed within the
  // same journal.
  var row2 = table.createRow({'id': primaryKey, 'name': 'DummyName'});
  journal.insert(table, [row2]);
  journal.commit();

  assertEquals(1, env.cache.getCount());
  assertTrue(pkIndex.containsKey(primaryKey));
  assertTrue(rowIdIndex.containsKey(row2.id()));
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


function testInsertOrReplace() {
  var table = env.schema.getTables()[0];
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  var pkIndex = env.indexStore.get(pkIndexSchema.getNormalizedName());
  var rowIdIndex = env.indexStore.get(table.getRowIdIndexName());

  var primaryKey = '100';
  var row1 = table.createRow({'id': primaryKey, 'name': 'DummyName'});

  // First testing case where the row does not already exist.
  assertEquals(0, env.cache.getCount());
  assertFalse(pkIndex.containsKey(primaryKey));
  assertFalse(rowIdIndex.containsKey(row1.id()));

  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  journal.insertOrReplace(table, [row1]);
  journal.commit();

  assertTrue(pkIndex.containsKey(primaryKey));
  assertTrue(rowIdIndex.containsKey(row1.id()));
  assertEquals(1, env.cache.getCount());

  // Now testing case where the row is being replaced. There should be no
  // exception thrown.
  var row2 = table.createRow({'id': primaryKey, 'name': 'OtherDummyName'});
  journal = new lf.cache.Journal(lf.Global.get(), [table]);
  journal.insertOrReplace(table, [row2]);
  journal.commit();

  assertEquals(1, env.cache.getCount());
  assertTrue(pkIndex.containsKey(primaryKey));
  // Expecting the previous row ID to have been preserved since a row with
  // the same primaryKey was already existing.
  assertTrue(rowIdIndex.containsKey(row1.id()));
}


function testInsertOrReplace_UniqueKeyViolation() {
  var table = env.schema.getTables()[4];
  var emailIndexSchema = table.getConstraint().getUnique()[0];
  var emailIndex = env.indexStore.get(emailIndexSchema.getNormalizedName());

  var row1 = table.createRow({'id': 'pk1', 'email': 'emailAddress1'});
  var row2 = table.createRow({'id': 'pk2', 'email': 'emailAddress2'});

  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  journal.insertOrReplace(table, [row1, row2]);
  journal.commit();
  assertTrue(emailIndex.containsKey(row1.payload()['email']));
  assertTrue(emailIndex.containsKey(row2.payload()['email']));

  // Attempting to insert a new row that has the same 'email' field as an
  // existing row.
  var row3 = table.createRow({'id': 'pk3', 'email': row1.payload()['email']});
  journal = new lf.cache.Journal(lf.Global.get(), [table]);
  assertThrowsException(
      journal.insertOrReplace.bind(journal, table, [row3]),
      lf.Exception.Type.CONSTRAINT);
  journal.rollback();
  assertEquals(row1.id(), emailIndex.get(row3.payload()['email'])[0]);

  // Attempting to insert two new rows, that have the same 'email' field with
  // each other, and also it is not occupied by any existing row.
  var row4 = table.createRow({'id': 'pk4', 'email': 'otherEmailAddress'});
  var row5 = table.createRow({'id': 'pk5', 'email': 'otherEmailAddress'});
  journal = new lf.cache.Journal(lf.Global.get(), [table]);
  assertThrowsException(
      journal.insertOrReplace.bind(journal, table, [row4, row5]),
      lf.Exception.Type.CONSTRAINT);
  journal.rollback();
  assertFalse(emailIndex.containsKey(row4.payload()['email']));
  assertFalse(emailIndex.containsKey(row5.payload()['email']));

  // Attempting to update existing row1 to have the same 'email' as existing
  // row2.
  var row1Updated = new lf.testing.MockSchema.Row(
      row1.id(), {
        'id': row1.payload()['id'],
        'email': row2.payload()['email']
      });
  journal = new lf.cache.Journal(lf.Global.get(), [table]);
  assertThrowsException(
      journal.insertOrReplace.bind(journal, table, [row1Updated]),
      lf.Exception.Type.CONSTRAINT);
  journal.rollback();
  assertEquals(row1.id(), emailIndex.get(row1.payload()['email'])[0]);
  assertEquals(row2.id(), emailIndex.get(row2.payload()['email'])[0]);

  // Finally attempting to update existing row1 to have a new unused 'email'
  // field.
  var row2Updated = new lf.testing.MockSchema.Row(
      row2.id(), {'id': row2.payload()['id'], 'email': 'unusedEmailAddress'});
  journal = new lf.cache.Journal(lf.Global.get(), [table]);
  assertNotThrows(function() {
    journal.insertOrReplace(table, [row2Updated]);
  });
  assertEquals(2, env.cache.getCount());
  assertEquals(row1.id(), emailIndex.get(row1.payload()['email'])[0]);
  assertEquals(row2.id(), emailIndex.get(row2Updated.payload()['email'])[0]);
}


function testCacheMerge() {
  // Selecting a table without any user-defined index (no primary key either).
  var table = env.schema.getTables()[2];
  var rowIdIndex = env.indexStore.get(table.getRowIdIndexName());
  var payload = {'id': 'something'};

  assertEquals(0, env.cache.getCount());
  var row = new lf.Row(1, payload);
  var row2 = new lf.Row(4, payload);
  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  journal.insert(table, [row, row2]);
  assertEquals(2, env.cache.getCount());
  var results = env.cache.get([0, 1, 4]);
  assertNull(results[0]);
  assertObjectEquals(payload, results[1].payload());
  assertObjectEquals(payload, results[2].payload());
  assertTrue(rowIdIndex.containsKey(row.id()));
  assertTrue(rowIdIndex.containsKey(row2.id()));

  journal = new lf.cache.Journal(lf.Global.get(), [table]);
  var payload2 = {'id': 'nothing'};
  var row3 = new lf.Row(0, payload2);
  var row4 = new lf.Row(4, payload2);
  journal.insert(table, [row3]);
  journal.update(table, [row4]);
  journal.remove(table, [row]);
  journal.commit();

  assertTrue(rowIdIndex.containsKey(row3.id()));
  assertTrue(rowIdIndex.containsKey(row4.id()));
  assertFalse(rowIdIndex.containsKey(row.id()));

  assertEquals(2, env.cache.getCount());
  results = env.cache.get([0, 1, 4]);
  assertObjectEquals(payload2, results[0].payload());
  assertNull(results[1]);
  assertObjectEquals(payload2, results[2].payload());
}

function testIndexUpdate() {
  var table = env.schema.getTables()[3];
  var indices = table.getIndices();
  var journal = new lf.cache.Journal(lf.Global.get(), [table]);

  var row1 = new lf.testing.MockSchema.Row(1, {'id': '1', 'name': '1'});
  var row2 = new lf.testing.MockSchema.Row(2, {'id': '2', 'name': '2'});
  var row3 = new lf.testing.MockSchema.Row(3, {'id': '3', 'name': '2'});
  var row4 = new lf.testing.MockSchema.Row(1, {'id': '4', 'name': '1'});
  var row5 = new lf.testing.MockSchema.Row(1, {'id': '4', 'name': '4'});

  var pkId = env.indexStore.get(indices[0].getNormalizedName());
  var idxName = env.indexStore.get(indices[1].getNormalizedName());
  var idxBoth = env.indexStore.get(indices[2].getNormalizedName());
  var rowIdIndex = env.indexStore.get(table.getRowIdIndexName());

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
  assertArrayEquals([row1, row2, row3], journal.getTableRows(table));

  journal.remove(table, [row2]);
  assertArrayEquals([row1, row3], journal.getTableRows(table));

  journal.update(table, [row4]);
  assertArrayEquals([row4, row3], journal.getTableRows(table));
  assertArrayEquals([row4], journal.getTableRows(table, [1]));
  assertArrayEquals([], journal.getTableRows(table, []));
  assertArrayEquals([null], journal.getTableRows(table, [8]));

  journal.insertOrReplace(table, [row5]);
  assertArrayEquals([row5, row3], journal.getTableRows(table));
  assertArrayEquals([row5], journal.getTableRows(table, [1]));

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


function testGetIndexRange() {
  var table = env.schema.getTables()[0];
  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  var indexSchema = table.getIndices()[1];
  var keyRange1 = new lf.index.KeyRange('aaa', 'bbb', false, false);
  var keyRange2 = new lf.index.KeyRange('ccc', 'eee', false, false);

  var row1 = table.createRow({'id': 'dummyId1', 'name': 'aba'});
  var row2 = table.createRow({'id': 'dummyId2', 'name': 'cdc'});
  var row3 = table.createRow({'id': 'dummyId3', 'name': 'abb'});

  // Adding row3 in the index such that it is within the range [aaa,bbb].
  journal.insert(table, [row3]);
  var index = env.indexStore.get(indexSchema.getNormalizedName());
  var rowIds = index.getRange(keyRange1);
  assertSameElements([row3.id()], rowIds);

  // Checking that the Journal returns row3 as a match, given that row3 has not
  // been modified within the journal itself yet.
  rowIds = journal.getIndexRange(
      indexSchema, [keyRange1, keyRange2], lf.Order.ASC);
  assertSameElements([row3.id()], rowIds);

  // Inserting new rows within this journal, where row1 and row2 are within the
  // specified range, and modifying row3 such that it is not within range
  // anymore.
  var row3Updated = new lf.testing.MockSchema.Row(
      row3.id(), {'id': 'dummyId3', 'name': 'bbba'});
  journal.insertOrReplace(table, [row1, row2, row3Updated]);
  rowIds = journal.getIndexRange(
      indexSchema, [keyRange1, keyRange2], lf.Order.ASC);
  assertSameElements([row1.id(), row2.id()], rowIds);
}


/**
 * Tests rolling back a journal.
 */
function testRollback() {
  var table = env.schema.getTables()[0];

  var rowToInsert = table.createRow(
      {'id': 'add', 'name': 'DummyName'});
  var rowToModifyOld = table.createRow(
      {'id': 'modify', 'name': 'DummyName'});
  var rowToModifyNew = new lf.testing.MockSchema.Row(
      rowToModifyOld.id(), {'id': 'modify', 'name': 'UpdatedDummyName'});
  var rowToRemove = table.createRow(
      {'id': 'delete', 'name': 'DummyName'});

  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  var pkIndex = env.indexStore.get(pkIndexSchema.getNormalizedName());
  var rowIdIndex = env.indexStore.get(table.getRowIdIndexName());


  /**
   * Asserts the initial state of the cache and indices.
   */
  var assertInitialState = function() {
    assertEquals(2, env.cache.getCount());

    assertTrue(pkIndex.containsKey(rowToModifyOld.payload()['id']));
    assertTrue(pkIndex.containsKey(rowToRemove.payload()['id']));
    assertFalse(pkIndex.containsKey(rowToInsert.payload()['id']));

    assertTrue(rowIdIndex.containsKey(rowToModifyOld.id()));
    assertTrue(rowIdIndex.containsKey(rowToRemove.id()));
    assertFalse(rowIdIndex.containsKey(rowToInsert.id()));

    var row = env.cache.get([rowToModifyOld.id()])[0];
    assertEquals(
        rowToModifyOld.payload()['name'],
        row.payload()['name']);
  };

  // Setting up the cache and indices to be in the initial state.
  var journal = new lf.cache.Journal(lf.Global.get(), [table]);
  journal.insert(table, [rowToModifyOld]);
  journal.insert(table, [rowToRemove]);
  journal.commit();

  assertInitialState();

  // Modifying indices and cache.
  journal = new lf.cache.Journal(lf.Global.get(), [table]);
  journal.insert(table, [rowToInsert]);
  journal.update(table, [rowToModifyNew]);
  journal.remove(table, [rowToRemove]);

  // Rolling back the journal and asserting that indices and cache are in the
  // initial state again.
  journal.rollback();
  assertInitialState();
}
