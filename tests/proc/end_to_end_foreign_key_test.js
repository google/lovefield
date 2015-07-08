/**
 * @license
 * Copyright 2015 The Lovefield Project Authors. All Rights Reserved.
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
goog.require('lf.ConstraintTiming');
goog.require('lf.Type');
goog.require('lf.schema');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.util');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'EndToEndForeignKeyTest');


/** @type {!lf.Database} */
var db;


/** @type {!lf.Global} */
var global;


/** @type {!Array<!lf.Row>} */
var sampleRows;


/** @type {!lf.schema.Table} */
var parentTable;


/** @type {!lf.schema.Table} */
var childTable;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  var builder = getSchemaBuilder();
  builder.connect({
    storeType: lf.schema.DataStoreType.MEMORY
  }).then(function(database) {
    db = database;
    global = builder.getGlobal();
    sampleRows = getSampleRows();
    parentTable = db.getSchema().table('Parent');
    childTable = db.getSchema().table('Child');

    asyncTestCase.continueTesting();
  });
}


/** @return {!lf.schema.Builder} */
function getSchemaBuilder() {
  var schemaBuilder = lf.schema.create('fk_schema', 1);
  schemaBuilder.createTable('Parent').
      addColumn('id', lf.Type.STRING).
      addColumn('name', lf.Type.STRING).
      addPrimaryKey(['id']);
  schemaBuilder.createTable('Child').
      addColumn('id', lf.Type.STRING).
      addColumn('parentId', lf.Type.STRING).
      addPrimaryKey(['id']).
      addNullable(['parentId']).
      addForeignKey('fk_parentId', {
        local: 'parentId',
        ref: 'Parent.id',
        timing: lf.ConstraintTiming.DEFERRABLE
      });
  return schemaBuilder;
}


/**
 * Tests that a query that does not violate DEFERRABLE constraints completes
 * successfully when an implicit transaction is used.
 */
function testDeferrable_ImplicitTx_Success() {
  asyncTestCase.waitForAsync('testDeferrable_ImplicitTx_Error');

  var parentRow = sampleRows[0];

  db.insert().into(parentTable).values([parentRow]).exec().then(
      function() {
        return lf.testing.util.selectAll(global, parentTable);
      }).then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(parentRow.payload()['id'], results[0].payload()['id']);
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests that a DEFERRABLE constraint violation results in the appropriate error
 * when an implicit transaction is used.
 */
function testDeferrable_ImplicitTx_Error() {
  asyncTestCase.waitForAsync('testDeferrable_ImplicitTx_Error');

  var childRow = sampleRows[1];

  lf.testing.util.assertThrowsErrorAsync(
      203,
      function() {
        return db.insert().into(childTable).values([childRow]).exec();
      }).then(
      function() {
        asyncTestCase.continueTesting();
      });
}


/**
 * Tests that a child column value of null, does not trigger a foreign key
 * constraint violation, instead it is ignored.
 */
function testDeferrable_ImplicitTx_IgnoreNull() {
  asyncTestCase.waitForAsync('testDeferrable_ImplicitTx_IgnoreNull');

  var childRow = childTable.createRow({
    id: 'childId',
    parentId: null,
    name: 'childName'
  });

  db.insert().into(childTable).values([childRow]).exec().then(
      function() {
        return lf.testing.util.selectAll(global, childTable);
      }).then(
      function(results) {
        assertEquals(1, results.length);
        assertNull(results[0].payload()['parentId']);
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests that a DEFERRABLE constraint violation during insertion, results in the
 * appropriate error when an explicit transaction is used.
 */
function testDeferrable_ExplicitTx_Insert_Error() {
  asyncTestCase.waitForAsync('testDeferrable_ExplicitTx_Insert_Error');

  var childTable = db.getSchema().table('Child');
  var childRow = getSampleRows()[1];

  var tx = db.createTransaction();
  tx.begin([childTable]).then(function() {
    var q1 = db.insert().into(childTable).values([childRow]);
    return tx.attach(q1);
  }).then(function() {
    return lf.testing.util.assertThrowsErrorAsync(
        203,
        function() {
          return tx.commit();
        });
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that a DEFERRABLE constraint violation during deletion, results in the
 * appropriate error when an explicit transaction is used.
 */
function testDeferrable_ExplicitTx_Delete_Error() {
  asyncTestCase.waitForAsync('testDeferrable_ExplicitTx_Delete_Error');

  var parentRow = sampleRows[0];
  var childRow = sampleRows[1];

  var tx1 = db.createTransaction();
  var tx2 = null;
  tx1.exec([
    db.insert().into(parentTable).values([parentRow]),
    db.insert().into(childTable).values([childRow])
  ]).then(function() {
    tx2 = db.createTransaction();
    return tx2.begin([parentTable, childTable]);
  }).then(function() {
    // Deleting parent even though the child row refers to it.
    return tx2.attach(db.delete().from(parentTable));
  }).then(function() {
    return lf.testing.util.assertThrowsErrorAsync(
        203,
        function() {
          return tx2.commit();
        });
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that a DEFERRABLE constraint violation during updating, results in the
 * appropriate error when an explicit transaction is used.
 */
function testDeferrable_ExplicitTx_Update_Error() {
  asyncTestCase.waitForAsync('testDeferrable_ExplicitTx_Delete_Error');

  var parentRow = sampleRows[0];
  var childRow = sampleRows[1];

  var tx1 = db.createTransaction();
  var tx2 = null;
  tx1.exec([
    db.insert().into(parentTable).values([parentRow]),
    db.insert().into(childTable).values([childRow])
  ]).then(function() {
    tx2 = db.createTransaction();
    return tx2.begin([parentTable, childTable]);
  }).then(function() {
    // Updating child to point to a non existing parentId.
    var q = db.update(childTable).set(childTable['parentId'], 'otherParentId');
    return tx2.attach(q);
  }).then(function() {
    return lf.testing.util.assertThrowsErrorAsync(
        203,
        function() {
          return tx2.commit();
        });
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that a DEFERRABLE constraint violation does NOT result in an error, if
 * the constraint is met by the time the transaction is committed.
 */
function testDeferrable_ExplicitTx_Success() {
  asyncTestCase.waitForAsync('testDeferrable_ExplicitTx_Success');

  var parentRow = sampleRows[0];
  var childRow = sampleRows[1];

  var tx = db.createTransaction();
  tx.begin([parentTable, childTable]).then(function() {
    // Inserting child first, even though parent does not exist yet.
    var q1 = db.insert().into(childTable).values([childRow]);
    return tx.attach(q1);
  }).then(function() {
    // Inserting parent after child has been inserted.
    var q2 = db.insert().into(parentTable).values([parentRow]);
    return tx.attach(q2);
  }).then(function() {
    return tx.commit();
  }).then(function() {
    return lf.testing.util.selectAll(global, parentTable);
  }).then(function(results) {
    assertEquals(1, results.length);
    assertEquals(parentRow.payload()['id'], results[0].payload()['id']);
    return lf.testing.util.selectAll(global, childTable);
  }).then(function(results) {
    assertEquals(1, results.length);
    assertEquals(childRow.payload()['id'], results[0].payload()['id']);
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * @return {!Array<!lf.Row>} The parent and child rows.
 */
function getSampleRows() {
  var parentTable = db.getSchema().table('Parent');
  var parentRow = parentTable.createRow({
    id: 'parentId',
    name: 'parentName'
  });

  var childTable = db.getSchema().table('Child');
  var childRow = childTable.createRow({
    id: 'childId',
    parentId: 'parentId',
    name: 'childName'
  });

  return [parentRow, childRow];
}
