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
goog.require('lf.ConstraintAction');
goog.require('lf.Type');
goog.require('lf.schema');
goog.require('lf.schema.DataStoreType');


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
var tableA;


/** @type {!lf.schema.Table} */
var tableB;


/** @type {!lf.schema.Table} */
var tableB1;


/** @type {!lf.schema.Table} */
var tableB2;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  var builder = getSchemaBuilder();
  builder.connect({
    storeType: lf.schema.DataStoreType.MEMORY
  }).then(function(database) {
    db = database;
    global = builder.getGlobal();
    tableA = db.getSchema().table('TableA');
    tableB = db.getSchema().table('TableB');
    tableB1 = db.getSchema().table('TableB1');
    tableB2 = db.getSchema().table('TableB2');
    sampleRows = getSampleRows();

    asyncTestCase.continueTesting();
  });
}


/** @return {!lf.schema.Builder} */
function getSchemaBuilder() {
  var schemaBuilder = lf.schema.create('fk_schema', 1);
  schemaBuilder.createTable('TableA').
      addColumn('id', lf.Type.STRING).
      addColumn('name', lf.Type.STRING).
      addPrimaryKey(['id']);
  schemaBuilder.createTable('TableB').
      addColumn('id', lf.Type.STRING).
      addColumn('foreignId', lf.Type.STRING).
      addPrimaryKey(['id']).
      addForeignKey('fk_foreignId', {
        local: 'foreignId',
        ref: 'TableA.id',
        action: lf.ConstraintAction.CASCADE
      });
  schemaBuilder.createTable('TableB1').
      addColumn('id', lf.Type.STRING).
      addColumn('foreignId', lf.Type.STRING).
      addPrimaryKey(['id']).
      addForeignKey('fk_foreignId', {
        local: 'foreignId',
        ref: 'TableB.id',
        action: lf.ConstraintAction.CASCADE
      });
  schemaBuilder.createTable('TableB2').
      addColumn('id', lf.Type.STRING).
      addColumn('foreignId', lf.Type.STRING).
      addPrimaryKey(['id']).
      addForeignKey('fk_foreignId', {
        local: 'foreignId',
        ref: 'TableB.id',
        action: lf.ConstraintAction.RESTRICT
      });
  return schemaBuilder;
}


/**
 * @return {!Array<!lf.Row>} The parent, child and grandchild rows.
 */
function getSampleRows() {
  var tableARow = tableA.createRow({
    id: 'tableAId',
    name: 'tableAName'
  });
  var tableBRow = tableB.createRow({
    id: 'tableBId',
    foreignId: 'tableAId',
    name: 'tableBName'
  });
  var tableB1Row = tableB1.createRow({
    id: 'tableB1Id',
    foreignId: 'tableBId',
    name: 'tableB1Name'
  });
  var tableB2Row = tableB2.createRow({
    id: 'tableB2Id',
    foreignId: 'tableBId',
    name: 'tableB2Name'
  });

  return [tableARow, tableBRow, tableB1Row, tableB2Row];
}


/**
 * Tests the case where a deletion on TableA, cascades to TableB and TableB1.
 */
function testDelete_CascadeOnly_Success() {
  asyncTestCase.waitForAsync('testDelete_CascadeOnly');

  var tx = db.createTransaction();
  tx.exec([
    db.insert().into(tableA).values([sampleRows[0]]),
    db.insert().into(tableB).values([sampleRows[1]]),
    db.insert().into(tableB1).values([sampleRows[2]]),
  ]).then(function() {
    return db.delete().from(tableA).exec();
  }).then(function() {
    var tx = db.createTransaction();
    return tx.exec([
      db.select().from(tableA),
      db.select().from(tableB),
      db.select().from(tableB1),
      db.select().from(tableB2)
    ]);
  }).then(function(results) {
    assertEquals(0, results[0].length);
    assertEquals(0, results[1].length);
    assertEquals(0, results[2].length);

    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Test the case where a deletion on TableA, cascades to TableB and TableB1, but
 * because TableB2 refers to TableB with a RESTRICT constraint, the entire
 * operation is rejected.
 * @suppress {invalidCasts}
 */
function testDelete_CascadeAndRestrict_Fail() {
  asyncTestCase.waitForAsync('testDelete_BothCascadeAndRestrict');

  var tx = db.createTransaction();
  tx.exec([
    db.insert().into(tableA).values([sampleRows[0]]),
    db.insert().into(tableB).values([sampleRows[1]]),
    db.insert().into(tableB1).values([sampleRows[2]]),
    db.insert().into(tableB2).values([sampleRows[3]]),
  ]).then(function() {
    return db.delete().from(tableA).exec();
  }).then(fail, function(e) {
    // 203: Foreign key constraint violation on constraint {0}.
    assertEquals(203, e.code);

    var tx = db.createTransaction();
    return tx.exec([
      db.select().from(tableA),
      db.select().from(tableB),
      db.select().from(tableB1),
      db.select().from(tableB2)
    ]);
  }).then(function(results) {
    var res = /** @type {!Array<!Object>} */ (results);
    // Ensure that nothing was deleted.
    assertEquals(1, res[0].length);
    assertEquals(1, res[1].length);
    assertEquals(1, res[2].length);
    assertEquals(1, res[3].length);

    asyncTestCase.continueTesting();
  });
}
