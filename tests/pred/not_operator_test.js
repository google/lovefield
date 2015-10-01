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
goog.require('goog.Promise');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.op');
goog.require('lf.schema.DataStoreType');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase =
    goog.testing.AsyncTestCase.createAndInstall('NotOperatorTest');


/** @type {!lf.Database} */
var db;


/** @type {number} */
var rowCount = 8;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(
      function(database) {
        db = database;

        // Delete any left-overs from previous tests.
        return clearDb();
      }).then(
      function() {
        // Add some sample data to the database.
        return populateDatabase();
      }).then(
      function() {
        asyncTestCase.continueTesting();
      }, fail);
}


function tearDown() {
  db.close();
}


/**
 * Deletes the contents of all tables.
 * @return {!IThenable}
 */
function clearDb() {
  var tables = db.getSchema().tables();
  var deletePromises = tables.map(function(table) {
    return db.delete().from(table).exec();
  });

  return goog.Promise.all(deletePromises);
}


/**
 * @param {number} rowCount The number of rows to generate.
 * @return {!Array<!hr.db.row.DummyTable>}
 */
function generateSampleData(rowCount) {
  var rows = new Array(rowCount);
  var tableSchema = db.getSchema().getDummyTable();
  for (var i = 0; i < rowCount; i++) {
    rows[i] = tableSchema.createRow({
      string: 'string' + i.toString(),
      number: 100 * i,
      integer: 100 * i,
      string2: 'string2' + i.toString(),
      boolean: false
    });
  }

  return rows;
}


/**
 * Inserts sample records in the database.
 * @return {!IThenable}
 */
function populateDatabase() {
  return db.
      insert().
      into(db.getSchema().getDummyTable()).
      values(generateSampleData(rowCount)).
      exec();
}


function test_Not_In() {
  asyncTestCase.waitForAsync('test_Not_In');

  var tableSchema = db.getSchema().getDummyTable();
  var excludeIds = ['string3', 'string5', 'string1'];
  var expectedIds = ['string0', 'string2', 'string4', 'string6', 'string7'];

  /**
   * Select records from the database.
   * @return {!IThenable}
   */
  var selectFn = function() {
    return db.
        select().
        from(tableSchema).
        where(lf.op.not(tableSchema.string.in(excludeIds))).
        exec();
  };

  selectFn().then(
      function(results) {
        var actualIds = results.map(function(result) {
          return result.string;
        });

        assertSameElements(expectedIds, actualIds);
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case where not() is used on an indexed property. This exercises the
 * code path where an IndexRangeScanStep is used during query execution as
 * opposed to a SelectStep.
 */
function test_Not_Eq() {
  asyncTestCase.waitForAsync('test_Not_Eq');

  var tableSchema = db.getSchema().getDummyTable();
  var excludedId = 'string1';

  /**
   * Select records from the database.
   * @return {!IThenable}
   */
  var selectFn = function() {
    return db.
        select().
        from(tableSchema).
        where(lf.op.not(tableSchema.string.eq(excludedId))).
        exec();
  };

  selectFn().then(
      function(results) {
        assertEquals(rowCount - 1, results.length);
        assertFalse(results.some(function(result) {
          return result.string == excludedId;
        }));
        asyncTestCase.continueTesting();
      }, fail);
}


function test_And_Not() {
  asyncTestCase.waitForAsync('test_And_Not');

  var tableSchema = db.getSchema().getDummyTable();
  var excludedId = 'string1';

  /**
   * Select records from the database.
   * @return {!IThenable}
   */
  var selectFn = function() {
    return db.
        select().
        from(tableSchema).
        where(lf.op.and(
            lf.op.not(tableSchema.string.eq(excludedId)),
            tableSchema.string.in([excludedId, 'string2', 'string3']))).
        exec();
  };

  selectFn().then(
      function(results) {
        assertEquals(2, results.length);

        var actualIds = results.map(function(result) {
          return result.string;
        });
        assertSameElements(actualIds, ['string2', 'string3']);
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case where a combined AND predicate is used with the NOT operator.
 */
function test_Not_And() {
  asyncTestCase.waitForAsync('test_Not_And');
  var tableSchema = db.getSchema().getDummyTable();

  /**
   * Select records from the database.
   * @return {!IThenable}
   */
  var selectFn = function() {
    return db.
        select().
        from(tableSchema).
        where(
            lf.op.not(
                lf.op.and(
                    tableSchema.integer.gte(200),
                    tableSchema.integer.lte(600)))).
        exec();
  };

  selectFn().then(
      function(results) {
        var actualValues = results.map(function(result) {
          return result.integer;
        });
        var expectedValues = [0, 100, 700];
        assertSameElements(expectedValues, actualValues);
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case where a combined OR predicate is used with the NOT operator.
 */
function test_Not_Or() {
  asyncTestCase.waitForAsync('test_Not_Or');
  var tableSchema = db.getSchema().getDummyTable();

  /**
   * Select records from the database.
   * @return {!IThenable}
   */
  var selectFn = function() {
    return db.
        select().
        from(tableSchema).
        where(
            lf.op.not(
                lf.op.or(
                    tableSchema.integer.lte(200),
                    tableSchema.integer.gte(600)))).
        exec();
  };

  selectFn().then(
      function(results) {
        var actualValues = results.map(function(result) {
          return result.integer;
        });
        var expectedValues = [500, 400, 300];
        assertSameElements(expectedValues, actualValues);
        asyncTestCase.continueTesting();
      }, fail);
}
