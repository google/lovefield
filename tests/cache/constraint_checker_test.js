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
goog.require('lf.ConstraintAction');
goog.require('lf.ConstraintTiming');
goog.require('lf.Global');
goog.require('lf.Type');
goog.require('lf.cache.ConstraintChecker');
goog.require('lf.schema');
goog.require('lf.testing.MockEnv');
goog.require('lf.testing.schemas');
goog.require('lf.testing.util');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'ConstraintCheckerTest');


/** @type {!lf.testing.MockEnv} */
var env;


/** @type {!lf.cache.ConstraintChecker} */
var checker;


/** @const {!Array<!lf.ConstraintTiming>} */
var TIMINGS = [lf.ConstraintTiming.IMMEDIATE, lf.ConstraintTiming.DEFERRABLE];


/**
 * @param {!lf.schema.Database} schema
 * @return {!IThenable}
 */
function setUpEnvForSchema(schema) {
  env = new lf.testing.MockEnv(schema);
  return env.init().then(function() {
    checker = new lf.cache.ConstraintChecker(lf.Global.get());
  });
}


function testFindExistingRowIdInPkIndex() {
  asyncTestCase.waitForAsync('testFindExistingRowIdInPkIndex');

  var getSchema = function() {
    var schemaBuilder = lf.schema.create('testschema', 1);
    schemaBuilder.createTable('TableA').
        addColumn('id', lf.Type.STRING).
        addPrimaryKey(['id']);
    return schemaBuilder.getSchema();
  };

  setUpEnvForSchema(getSchema()).then(function() {
    var table = env.schema.table('TableA');
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
    asyncTestCase.continueTesting();
  }, fail);
}


function testCheckNotNullable() {
  asyncTestCase.waitForAsync('testCheckNotNullable');

  var getSchema = function() {
    var schemaBuilder = lf.schema.create('testschema', 1);
    schemaBuilder.createTable('TableA').
        addColumn('id', lf.Type.STRING).
        addColumn('email', lf.Type.STRING).
        addPrimaryKey(['id']);
    return schemaBuilder.getSchema();
  };

  setUpEnvForSchema(getSchema()).then(function() {
    var table = env.schema.table('TableA');

    // Attempting to insert rows that violate the NOT_NULLABLE constraint.
    var invalidRows = [1, 2, 3].map(function(primaryKey) {
      return table.createRow({'id': primaryKey.toString(), 'email': null});
    });

    lf.testing.util.assertThrowsError(
        202,  // Attempted to insert NULL value to non-nullable field {0}
        function() {
          checker.checkNotNullable(table, invalidRows);
        });

    // Attempting to insert rows that don't violate the constraint.
    var validRows = [1, 2, 3].map(function(primaryKey) {
      return table.createRow(
          {'id': primaryKey.toString(), 'email': 'emailAddress'});
    });
    assertNotThrows(function() {
      checker.checkNotNullable(table, validRows);
    });
    asyncTestCase.continueTesting();
  }, fail);
}


function testCheckForeignKeysForInsert_Immediate() {
  checkForeignKeysForInsert(
      lf.ConstraintTiming.IMMEDIATE,
      'testCheckForeignKeysForInsert_Immediate');
}


function testCheckForeignKeysForInsert_Deferrable() {
  checkForeignKeysForInsert(
      lf.ConstraintTiming.DEFERRABLE,
      'testCheckForeignKeysForInsert_Deferrable');
}


/**
 * Asserts that ConstraintChecker#checkForeignKeysForInsert() throws an error if
 * the referred keys do not exist, for constraints that are of the given
 * constraint timing.
 * @param {!lf.ConstraintTiming} constraintTiming
 * @param {string} testName
 */
function checkForeignKeysForInsert(constraintTiming, testName) {
  asyncTestCase.waitForAsync(testName);

  var schema = lf.testing.schemas.getOneForeignKey(constraintTiming);
  setUpEnvForSchema(schema).then(function() {
    var childTable = env.schema.table('Child');
    var childRow = childTable.createRow({id: 'dummyId'});

    var checkFn = function(timing) {
      checker.checkForeignKeysForInsert(childTable, [childRow], timing);
    };
    assertChecks(constraintTiming, checkFn);
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that ConstraintChecker#checkForeignKeysForDelete() throws an error if
 * referring keys do exist, for constraints that are IMMEDIATE.
 */
function testCheckForeignKeysForDelete_Immediate() {
  checkForeignKeysForDelete(
      lf.ConstraintTiming.IMMEDIATE,
      'testCheckForeignKeysForDelete_Immediate');
}


/**
 * Tests that ConstraintChecker#checkForeignKeysForDelete() throws an error if
 * referring keys do exist, for constraints that are DEFERRABLE.
 */
function testCheckForeignKeysForDelete_Deferrable() {
  checkForeignKeysForDelete(
      lf.ConstraintTiming.DEFERRABLE,
      'testCheckForeignKeysForDelete_Deferrable');
}


/**
 * @param {!lf.ConstraintTiming} constraintTiming
 * @param {string} testName
 */
function checkForeignKeysForDelete(constraintTiming, testName) {
  asyncTestCase.waitForAsync(testName);

  var schema = lf.testing.schemas.getOneForeignKey(constraintTiming);
  var parentTable = null;
  var parentRow = null;
  var childRow = null;
  setUpEnvForSchema(schema).then(function() {
    parentTable = env.schema.table('Parent');
    var childTable = env.schema.table('Child');
    parentRow = parentTable.createRow({id: 'dummyId'});
    childRow = childTable.createRow({id: 'dummyId'});

    var tx = env.db.createTransaction();
    return tx.exec([
      env.db.insert().into(parentTable).values([parentRow]),
      env.db.insert().into(childTable).values([childRow])
    ]);
  }).then(function() {
    var checkFn = function(timing) {
      checker.checkForeignKeysForDelete(
          /** @type {!lf.schema.Table} */ (parentTable), [parentRow], timing);
    };
    assertChecks(constraintTiming, checkFn);
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that ConstraintChecker#checkForeignKeysForUpdate() throws an error if
 * referring keys do exist for a column that is being updated, for constraints
 * that are IMMEDIATE.
 */
function testCheckForeignKeysForUpdate_Immediate() {
  checkForeignKeysForUpdate(
      lf.ConstraintTiming.IMMEDIATE,
      'testCheckForeignKeysForUpdate_Immediate');
}


/**
 * Tests that ConstraintChecker#checkForeignKeysForUpdate() throws an error if
 * invalid referred keys are introduced for a column that is being updated, for
 * constraints that are DEFERRABLE.
 */
function testCheckForeignKeysForUpdate_Deferrable() {
  checkForeignKeysForUpdate(
      lf.ConstraintTiming.DEFERRABLE,
      'testCheckForeignKeysForUpdate_Deferrable');
}


/**
 * @param {!lf.ConstraintTiming} constraintTiming
 * @param {string} testName
 */
function checkForeignKeysForUpdate(constraintTiming, testName) {
  asyncTestCase.waitForAsync(testName);

  var schema = lf.testing.schemas.getOneForeignKey(constraintTiming);
  var parentTable = null;
  var parentRow = null;
  var childRow = null;
  setUpEnvForSchema(schema).then(function() {
    parentTable = env.schema.table('Parent');
    var childTable = env.schema.table('Child');
    parentRow = parentTable.createRow({id: 'dummyId'});
    childRow = childTable.createRow({id: 'dummyId'});

    var tx = env.db.createTransaction();
    return tx.exec([
      env.db.insert().into(parentTable).values([parentRow]),
      env.db.insert().into(childTable).values([childRow])
    ]);
  }).then(function() {
    var parentRowAfter = parentTable.createRow({id: 'otherId'});
    var modification = [parentRow, parentRowAfter];

    var checkFn = function(timing) {
      checker.checkForeignKeysForUpdate(
          /** @type {!lf.schema.Table} */ (parentTable),
          [modification], timing);
    };
    assertChecks(constraintTiming, checkFn);
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that ConstraintChecker#detectCascadeDeletion() correctly detects
 * referring rows of the rows that are about to be deleted.
 */
function testDetectCascadeDeletion_TableChain() {
  asyncTestCase.waitForAsync('testDetectCascadeDeletion_TableChain');

  var schema = lf.testing.schemas.getTableChain(lf.ConstraintAction.CASCADE);
  var tableA;
  var tableARow;
  var tableB;
  var tableBRow;
  var tableC;
  var tableCRow;

  setUpEnvForSchema(schema).then(function() {
    tableA = env.schema.table('TableA');
    tableB = env.schema.table('TableB');
    tableC = env.schema.table('TableC');
    tableARow = tableA.createRow({id: 'tableADummyId'});
    tableBRow = tableB.createRow({
      id: 'tableBDummyId',
      foreignKey: tableARow.payload()['id']
    });
    tableCRow = tableC.createRow({
      id: 'tableCDummyId',
      foreignKey: tableBRow.payload()['id']
    });

    return env.db.insert().into(tableA).values([tableARow]).exec();
  }).then(function() {
    // Checking the case where no referring rows exist.
    var cascadedDeletion = checker.detectCascadeDeletion(tableA, [tableARow]);
    assertEquals(0, cascadedDeletion.tableOrder.length);
    assertEquals(0, cascadedDeletion.rowIdsPerTable.size);

    // Inserting row referring to TableA's row.
    return env.db.insert().into(tableB).values([tableBRow]).exec();
  }).then(function() {
    var cascadedDeletion = checker.detectCascadeDeletion(tableA, [tableARow]);
    // Ensure that TableB's row has been detected for deletion.
    assertEquals(1, cascadedDeletion.tableOrder.length);
    assertArrayEquals([tableB.getName()], cascadedDeletion.tableOrder);
    assertEquals(1, cascadedDeletion.rowIdsPerTable.size);
    assertArrayEquals(
        [tableBRow.id()],
        cascadedDeletion.rowIdsPerTable.get(tableB.getName()));

    // Inserting row referring to TableB's row.
    return env.db.insert().into(tableC).values([tableCRow]).exec();
  }).then(function() {
    var cascadedDeletion = checker.detectCascadeDeletion(tableA, [tableARow]);
    // Ensure that both TableC's and TableB's row have been detected for
    // deletion.
    assertEquals(2, cascadedDeletion.tableOrder.length);
    assertArrayEquals(
        [tableC.getName(), tableB.getName()], cascadedDeletion.tableOrder);
    assertEquals(2, cascadedDeletion.rowIdsPerTable.size);
    assertArrayEquals(
        [tableBRow.id()],
        cascadedDeletion.rowIdsPerTable.get(tableB.getName()));
    assertArrayEquals(
        [tableCRow.id()],
        cascadedDeletion.rowIdsPerTable.get(tableC.getName()));

    asyncTestCase.continueTesting();
  });
}


function testDetectCascadeDeletion_TwoForeignKeys() {
  asyncTestCase.waitForAsync('testDetectCascadeDeletion_TwoForeignKeys');

  var schema = lf.testing.schemas.getTwoForeignKeys(
      lf.ConstraintAction.CASCADE);
  var tableA;
  var tableARow;
  var tableB1;
  var tableB1Row;
  var tableB2;
  var tableB2Row;

  setUpEnvForSchema(schema).then(function() {
    tableA = env.schema.table('TableA');
    tableB1 = env.schema.table('TableB1');
    tableB2 = env.schema.table('TableB2');
    tableARow = tableA.createRow({
      id1: 'tableADummyId1',
      id2: 'tableADummyId2'
    });
    tableB1Row = tableB1.createRow({
      id: 'tableB1DummyId',
      foreignKey: tableARow.payload()['id1']
    });
    tableB2Row = tableB2.createRow({
      id: 'tableB2DummyId',
      foreignKey: tableARow.payload()['id2']
    });

    var tx = env.db.createTransaction();
    return tx.exec([
      env.db.insert().into(tableA).values([tableARow]),
      env.db.insert().into(tableB1).values([tableB1Row]),
      env.db.insert().into(tableB2).values([tableB2Row])
    ]);
  }).then(function() {
    var cascadedDeletion = checker.detectCascadeDeletion(tableA, [tableARow]);
    // Ensure that both TableB1's and TableB2's row have been detected for
    // deletion.
    assertEquals(2, cascadedDeletion.tableOrder.length);
    assertArrayEquals(
        [tableB1.getName(), tableB2.getName()], cascadedDeletion.tableOrder);
    assertEquals(2, cascadedDeletion.rowIdsPerTable.size);
    assertArrayEquals(
        [tableB1Row.id()],
        cascadedDeletion.rowIdsPerTable.get(tableB1.getName()));
    assertArrayEquals(
        [tableB2Row.id()],
        cascadedDeletion.rowIdsPerTable.get(tableB2.getName()));

    asyncTestCase.continueTesting();
  });
}


/**
 * Asserts that the given constraint checking function, throws a constraint
 * violation error for the given constraint timing, and that it throw no error
 * for other constraint timings.
 * @param {!lf.ConstraintTiming} constraintTiming
 * @param {!Function} checkFn
 */
function assertChecks(constraintTiming, checkFn) {
  TIMINGS.forEach(function(timing) {
    if (timing == constraintTiming) {
      // Foreign key constraint violation on constraint {0}.
      lf.testing.util.assertThrowsError(203, checkFn.bind(null, timing));
    } else {
      assertNotThrows(checkFn.bind(null, timing));
    }
  });
}
