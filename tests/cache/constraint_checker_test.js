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
goog.require('lf.cache.ConstraintChecker');
goog.require('lf.testing.MockEnv');
goog.require('lf.testing.MockSchema');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'ConstraintCheckerTest');


/** @type {!lf.testing.MockEnv} */
var env;


/** @type {!lf.cache.ConstraintChecker} */
var checker;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  env = new lf.testing.MockEnv();
  env.init().then(function() {
    checker = new lf.cache.ConstraintChecker();
    asyncTestCase.continueTesting();
  });

}


/**
 * Tests that checkUniqueKeysInsert() throws an exception if a primary key
 * violation occurs.
 */
function testCheckUniqueKeysInsert_PrimaryKey() {
  var table = env.schema.getTables()[0];
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  var pkIndex = env.indexStore.get(pkIndexSchema.getNormalizedName());

  var primaryKey = '100';
  var row = table.createRow({'id': primaryKey, 'name': 'DummyName'});

  var checkerFn = function() {
    checker.checkUniqueKeysInsert(table, [row]);
  };

  // pkIndex is empty, no exception should be thrown.
  assertFalse(pkIndex.containsKey(primaryKey));
  assertNotThrows(checkerFn);

  pkIndex.add(primaryKey, row.id());
  assertTrue(pkIndex.containsKey(primaryKey));
  assertThrowsException(checkerFn, lf.Exception.Type.CONSTRAINT);

  var row2 = table.createRow({'id': 'otherPrimaryKey', 'name': 'DummyName'});
  assertNotThrows(function() {
    checker.checkUniqueKeysInsert(table, [row2]);
  });
}


/**
 * Tests that checkUniqueKeysInsert() throws an exception if a unique key
 * violation exists, other than the primary key field.
 */
function testCheckUniqueKeysInsert_NonPrimaryKey() {
  var table = env.schema.getTables()[4];
  var uniqueIndexSchema = table.getConstraint().getUnique()[0];
  var uniqueIndex = env.indexStore.get(uniqueIndexSchema.getNormalizedName());

  var uniqueKey = 'emailAddress';
  var row = table.createRow({'id': 'pk1', 'email': uniqueKey});

  var checkerFn = function() {
    checker.checkUniqueKeysInsert(table, [row]);
  };

  // uniqueIndex is empty, no exception should be thrown.
  assertFalse(uniqueIndex.containsKey(uniqueKey));
  assertNotThrows(checkerFn);

  uniqueIndex.add(uniqueKey, row.id());
  assertTrue(uniqueIndex.containsKey(uniqueKey));
  assertThrowsException(checkerFn, lf.Exception.Type.CONSTRAINT);

  var row2 = table.createRow({'id': 'pk2', 'email': 'otherEmailAddress'});
  assertNotThrows(function() {
    checker.checkUniqueKeysInsert(table, [row2]);
  });
}


function testFindExistingRowIdInPkIndex() {
  var table = env.schema.getTables()[0];
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  var pkIndex = env.indexStore.get(pkIndexSchema.getNormalizedName());

  var row1 = table.createRow({'id': 'pk1', 'name': 'DummyName'});
  var row2 = table.createRow({'id': 'pk2', 'name': 'DummyName'});
  var pk1 = row1.payload()['id'];
  var pk2 = row2.payload()['id'];
  pkIndex.add(pk1, row1.id());
  pkIndex.add(pk2, row2.id());
  assertTrue(pkIndex.containsKey(pk1));
  assertTrue(pkIndex.containsKey(pk2));

  var row3 = table.createRow({'id': pk1, 'name': 'DummyName'});
  var row4 = table.createRow({'id': pk2, 'name': 'DummyName'});
  var row5 = table.createRow({'id': 'otherPk', 'name': 'DummyName'});

  assertEquals(
      row1.id(), checker.findExistingRowIdInPkIndex(table, row3));
  assertEquals(
      row2.id(), checker.findExistingRowIdInPkIndex(table, row4));
  assertNull(checker.findExistingRowIdInPkIndex(table, row5));
}


function testCheckUniqueKeysUnique_PrimaryKey() {
  var table = env.schema.getTables()[0];

  // Creating 3 rows, two of which have the same primary key.
  var row1 = table.createRow({'id': 'pk1', 'name': 'DummyName'});
  var row2 = table.createRow({'id': 'pk2', 'name': 'DummyName'});
  var row3 = table.createRow({'id': 'pk2', 'name': 'DummyName'});

  assertThrowsException(
      function() {
        checker.checkUniqueKeysUnique(table, [row1, row2, row3]);
      }, lf.Exception.Type.CONSTRAINT);

  // Creating 3 rows, which have different primary keys.
  var row4 = table.createRow({'id': 'pk4', 'name': 'DummyName'});
  var row5 = table.createRow({'id': 'pk5', 'name': 'DummyName'});
  var row6 = table.createRow({'id': 'pk6', 'name': 'DummyName'});

  assertNotThrows(
      function() {
        checker.checkUniqueKeysUnique(table, [row4, row5, row6]);
      });
}


function testCheckUniqueKeysUnique_NonPrimaryKey() {
  var table = env.schema.getTables()[4];

  // Creating 3 rows, two of which have the 'email' key.
  var row1 = table.createRow({'id': 'pk1', 'email': 'dummyEmail1'});
  var row2 = table.createRow({'id': 'pk2', 'email': 'dummyEmail2'});
  var row3 = table.createRow({'id': 'pk3', 'email': 'dummyEmail2'});

  assertThrowsException(
      function() {
        checker.checkUniqueKeysUnique(table, [row1, row2, row3]);
      }, lf.Exception.Type.CONSTRAINT);

  // Creating 3 rows, which have different 'email' keys.
  var row4 = table.createRow({'id': 'pk4', 'email': 'email1'});
  var row5 = table.createRow({'id': 'pk5', 'email': 'email2'});
  var row6 = table.createRow({'id': 'pk6', 'email': 'email3'});

  assertNotThrows(
      function() {
        checker.checkUniqueKeysUnique(table, [row4, row5, row6]);
      });
}


function testCheckUniqueKeysUpdate_PrimaryKey() {
  var table = env.schema.getTables()[0];
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  var pkIndex = env.indexStore.get(pkIndexSchema.getNormalizedName());

  // Adding three rows with unique primary keys to the index.
  var rows = [1, 2, 3].map(function(primaryKey) {
    return table.createRow({'id': primaryKey.toString(), 'name': 'DummyName'});
  });
  rows.forEach(function(row) {
    pkIndex.add(row.payload()['id'], row.id());
  });

  // Attempting to update a single row to have the same primary key as an other
  // row.
  var row0Updated = new lf.testing.MockSchema.Row(
      rows[0].id(), {'id': rows[2].payload()['id'], 'name': 'OtherDummyName'});
  assertThrowsException(
      function() {
        checker.checkUniqueKeysUpdate(table, [row0Updated]);
      }, lf.Exception.Type.CONSTRAINT);

  // Attempting to update a multiple rows to all have the same primary key.
  // Should throw an exception, even though the new primary key is not occupied
  // currently.
  row0Updated = new lf.testing.MockSchema.Row(
      rows[0].id(), {'id': 'otherPk', 'name': 'OtherDummyName'});
  var row1Updated = new lf.testing.MockSchema.Row(
      rows[1].id(), {'id': 'otherPk', 'name': 'OtherDummyName'});
  assertThrowsException(
      function() {
        checker.checkUniqueKeysUpdate(table, [row0Updated, row1Updated]);
      }, lf.Exception.Type.CONSTRAINT);

  // Attempting to update a row without affecting its primary key.
  var row2Updated = new lf.testing.MockSchema.Row(
      rows[2].id(), {'id': rows[2].payload()['id'], 'name': 'OtherDummyName'});
  assertNotThrows(function() {
    checker.checkUniqueKeysUpdate(table, [row2Updated]);
  });

  // Attempting to update a single row by assigning a new unused primary key.
  row2Updated = new lf.testing.MockSchema.Row(
      rows[2].id(), {'id': 'newUnusedPk', 'name': 'OtherDummyName'});
  assertNotThrows(function() {
    checker.checkUniqueKeysUpdate(table, [row2Updated]);
  });
}


function testCheckUniqueKeysUpdate_NonPrimaryKey() {
  var table = env.schema.getTables()[4];
  var indexSchema = table.getConstraint().getUnique()[0];
  var index = env.indexStore.get(indexSchema.getNormalizedName());

  // Adding three rows with unique 'email' keys to the index.
  var rows = [1, 2, 3].map(function(primaryKey) {
    return table.createRow({
      'id': primaryKey.toString(),
      'email': 'email' + primaryKey.toString()
    });
  });
  rows.forEach(function(row) {
    index.add(row.payload()['email'], row.id());
  });

  // Attempting to update a single row to have the same 'email' key as an other
  // row.
  var row0Updated = new lf.testing.MockSchema.Row(
      rows[0].id(), {
        'id': rows[0].payload()['id'],
        'email': rows[2].payload()['email']
      });
  assertThrowsException(
      function() {
        checker.checkUniqueKeysUpdate(table, [row0Updated]);
      }, lf.Exception.Type.CONSTRAINT);

  // Attempting to update a multiple rows to all have the same 'email' key.
  // Should throw an exception, even though the new 'email' key is not occupied
  // currently.
  row0Updated = new lf.testing.MockSchema.Row(
      rows[0].id(),
      {'id': rows[0].payload()['id'], 'email': 'otherDummyEmail'});
  var row1Updated = new lf.testing.MockSchema.Row(
      rows[1].id(),
      {'id': rows[1].payload()['id'], 'email': 'otherDummyEmail'});
  assertThrowsException(
      function() {
        checker.checkUniqueKeysUpdate(table, [row0Updated, row1Updated]);
      }, lf.Exception.Type.CONSTRAINT);

  // Attempting to update a single row by assigning a new unused 'email' key.
  var row2Updated = new lf.testing.MockSchema.Row(
      rows[2].id(), {
        'id': rows[2].payload()['id'],
        'email': 'unusedEmail'
      });
  assertNotThrows(function() {
    checker.checkUniqueKeysUpdate(table, [row2Updated]);
  });
}


function testCheckNotNullable() {
  var table = env.schema.getTables()[4];

  // Attempting to insert rows that violate the constraint.
  var invalidRows = [1, 2, 3].map(function(primaryKey) {
    return table.createRow({'id': primaryKey.toString(), 'email': null});
  });

  assertThrowsException(
      function() {
        checker.checkNotNullable(table, invalidRows);
      }, lf.Exception.Type.CONSTRAINT);

  // Attempting to insert rows that don't violate the constraint.
  var validRows = [1, 2, 3].map(function(primaryKey) {
    return table.createRow(
        {'id': primaryKey.toString(), 'email': 'emailAddress'});
  });
  assertNotThrows(function() {
    checker.checkNotNullable(table, validRows);
  });
}


/**
 * Asserts that calling the given function throws the given exception.
 * @param {!function()} fn The function to call.
 * @param {string} exceptionName The expected name of the exception.
 *
 * TODO(dpapad): Put this method in a shared location, it is being used by other
 * tests too.
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
