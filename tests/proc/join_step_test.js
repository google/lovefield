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
goog.require('goog.Promise');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('lf.Type');
goog.require('lf.proc.JoinStep');
goog.require('lf.proc.NoOpStep');
goog.require('lf.proc.Relation');
goog.require('lf.schema');
goog.require('lf.structs.set');
goog.require('lf.testing.MockEnv');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'JoinStepTest');


/** @type {!lf.testing.MockEnv} */
var env;


/** @type {!lf.schema.Table} */
var ta;


/** @type {!lf.schema.Table} */
var tb;


/** @type {!Array<!lf.Row>} */
var tableARows;


/** @type {!Array<!lf.Row>} */
var tableBRows;


function setUp() {
  asyncTestCase.waitForAsync('setUp');

  env = new lf.testing.MockEnv(getSchema());
  env.init().then(function() {
    ta = env.schema.table('TableA');
    tb = env.schema.table('TableB');
    return insertSampleData();
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * The schema to be used for tests in this file.
 * @return {!lf.schema.Database}
 */
function getSchema() {
  var schemaBuilder = lf.schema.create('testschema', 1);
  schemaBuilder.createTable('TableA').
      addColumn('id', lf.Type.NUMBER).
      addColumn('name', lf.Type.STRING).
      addIndex('idx_id', ['id']);

  schemaBuilder.createTable('TableB').
      addColumn('id', lf.Type.NUMBER).
      addColumn('name', lf.Type.STRING).
      addIndex('idx_id', ['id']);
  return schemaBuilder.getSchema();
}


/**
 * Inserts 3 sample rows to the database, for each table.
 * @return {!IThenable}
 */
function insertSampleData() {
  var generateRowsForTable = function(table) {
    var sampleDataCount = 3;
    var rows = new Array(sampleDataCount);
    for (var i = 0; i < sampleDataCount; i++) {
      rows[i] = table.createRow({
        'id': i,
        'name': 'dummyName' + i.toString()
      });
    }
    return rows;
  };

  tableARows = generateRowsForTable(ta);
  tableBRows = generateRowsForTable(tb);

  var tx = env.db.createTransaction();
  return tx.exec([
    env.db.insert().into(ta).values(tableARows),
    env.db.insert().into(tb).values(tableBRows)
  ]);
}


/**
 * Performs index join on the given relation and asserts that the results are
 * correct.
 * @param {!lf.proc.Relation} tableARelation
 * @param {!lf.proc.Relation} tableBRelation
 * @param {!lf.pred.JoinPredicate} joinPredicate The join predicate to used for
 *     joining. The left column of the join predicate will be used for
 *     performing the join. Callers are responsible to ensure that the relation
 *     corresponding to the indexed column (could be either of tableARelation or
 *     tableBRelation) includes ALL rows of this table, otherwise index join is
 *     invalid and this test would fail.
 * @return {!IThenable}
 */
function checkIndexJoin(tableARelation, tableBRelation, joinPredicate) {
  var noOpStepA = new lf.proc.NoOpStep([tableARelation]);
  var noOpStepB = new lf.proc.NoOpStep([tableBRelation]);
  var joinStep = new lf.proc.JoinStep(env.global, joinPredicate, false);
  joinStep.addChild(noOpStepA);
  joinStep.addChild(noOpStepB);

  // Detecting the expected IDs that should appear in the result.
  var tableAIds = lf.structs.set.create(tableARelation.entries.map(
      function(entry) {
        return entry.getField(ta['id']);
      }));
  var tableBIds = lf.structs.set.create(tableARelation.entries.map(
      function(entry) {
        return entry.getField(tb['id']);
      }));
  var expectedIds = lf.structs.set.values(
      setIntersection(tableAIds, tableBIds));

  // Choosing the left predicate column as the indexed column.
  joinStep.markAsIndexJoin(joinPredicate.leftColumn);
  assertTrue(joinStep.toString().indexOf('index_nested_loop') != -1);
  return joinStep.exec().then(function(relations) {
    assertEquals(1, relations.length);
    assertTableATableBJoin(relations[0], expectedIds);
  });
}


/**
 * @param {!lf.structs.Set} set1
 * @param {!lf.structs.Set} set2
 * @return {!lf.structs.Set} The intersection of set1 and set2
 */
function setIntersection(set1, set2) {
  var intersection = lf.structs.set.create();
  set1.forEach(function(value) {
    if (set2.has(value)) {
      intersection.add(value);
    }
  });
  return intersection;
}


/**
 * Tests index join for the case where the entire tableA and tabelB contents are
 * joined.
 */
function testIndexJoin_EntireTables() {
  asyncTestCase.waitForAsync('testIndexJoin_EntireTables');
  var tableARelation = lf.proc.Relation.fromRows(tableARows, [ta.getName()]);
  var tableBRelation = lf.proc.Relation.fromRows(tableBRows, [tb.getName()]);

  goog.Promise.all([
    // First calculate index join using the index of TableA's index.
    checkIndexJoin(tableARelation, tableBRelation, ta['id'].eq(tb['id'])),
    // Then calculate index join using the index of TableB's index.
    checkIndexJoin(tableARelation, tableBRelation, tb['id'].eq(ta['id']))
  ]).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests index join for the case where a subset of TableA is joined with the
 * entire TableB (using TableB's index for the join).
 */
function testIndexJoin_PartialTable() {
  asyncTestCase.waitForAsync('testIndexJoin_PartialTable');
  var tableARelation = lf.proc.Relation.fromRows(
      tableARows.slice(2), [ta.getName()]);
  var tableBRelation = lf.proc.Relation.fromRows(tableBRows, [tb.getName()]);
  checkIndexJoin(tableARelation, tableBRelation, tb['id'].eq(ta['id'])).then(
      function() {
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests index join for the case where an empty relation is joined with the
 * entire TableB (using TableB's index for the join).
 */
function testIndexJoin_EmptyTable() {
  asyncTestCase.waitForAsync('testIndexJoin_EmptyTable');
  var tableARelation = lf.proc.Relation.fromRows([], [ta.getName()]);
  var tableBRelation = lf.proc.Relation.fromRows(tableBRows, [tb.getName()]);
  checkIndexJoin(tableARelation, tableBRelation, tb['id'].eq(ta['id'])).then(
      function() {
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Asserts that the results of joining rows belonging to TableA and TableB is as
 * expected.
 * @param {!lf.proc.Relation} relation The joined relation.
 * @param {!Array<number>} expectedIds The IDs that are expected to appear in
 *     the results in the given order.
 */
function assertTableATableBJoin(relation, expectedIds) {
  assertEquals(expectedIds.length, relation.entries.length);
  relation.entries.forEach(function(entry, i) {
    assertEquals(2, Object.keys(entry.row.payload()).length);
    var expectedId = expectedIds[i];
    assertEquals(expectedId, entry.getField(ta['id']));
    assertEquals('dummyName' + expectedId, entry.getField(ta['name']));
    assertEquals(expectedId, entry.getField(tb['id']));
    assertEquals('dummyName' + expectedId, entry.getField(tb['name']));
  });
}
