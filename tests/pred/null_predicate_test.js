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
goog.require('lf.schema.DataStoreType');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase =
    goog.testing.AsyncTestCase.createAndInstall('NullPredicateTest');


/** @type {!lf.Database} */
var db;


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
 * Creates two sample rows. One with a specified 'datetime' and one
 * with a null 'datetime'.
 * @return {!Array<!hr.db.row.DummyTable>}
 */
function generateSampleDummyData() {
  var tableSchema = db.getSchema().getDummyTable();

  var row1 = tableSchema.createRow({
    string: 'string1',
    number: 100,
    integer: 100,
    string2: 'string21',
    boolean: false,
    datetime: new Date()
  });

  var row2 = tableSchema.createRow({
    string: 'string2',
    number: 200,
    integer: 200,
    string2: 'string22',
    boolean: false,
    datetime: null
  });

  return [row1, row2];
}


/** @return {!Array<!hr.db.row.Region>} */
function generateSampleRegionData() {
  var tableSchema = db.getSchema().getRegion();
  var rows = new Array(3);
  for (var i = 0; i < rows.length; i++) {
    rows[i] = tableSchema.createRow({
      id: 'regionId' + i.toString(),
      name: 'regionName' + i.toString()
    });
  }
  return rows;
}


/**
 * Inserts sample records in the database.
 * @return {!IThenable}
 */
function populateDatabase() {
  var tx = db.createTransaction();
  return tx.exec([
    db.insert().
        into(db.getSchema().getDummyTable()).
        values(generateSampleDummyData()),
    db.insert().
        into(db.getSchema().getRegion()).
        values(generateSampleRegionData()),
  ]);
}


/**
 * Tests the case where an isNull() predicate is used on a non-indexed field.
 */
function test_IsNull_NonIndexed() {
  asyncTestCase.waitForAsync('test_IsNull_NonIndexed');

  var tableSchema = db.getSchema().getDummyTable();
  // Ensure that the 'datetime' field is not indexed.
  assertEquals(0, tableSchema.datetime.getIndices().length);
  var sampleData = generateSampleDummyData();

  /**
   * Select records to the database.
   * @return {!IThenable}
   */
  var selectFn = function() {
    return db.
        select().
        from(tableSchema).
        where(tableSchema.datetime.isNull()).
        exec();
  };

  selectFn().then(
      function(result) {
        assertEquals(1, result.length);

        // Expecting the second sample row to have been retrieved.
        var retrievedEmployee = result[0];
        assertEquals(sampleData[1].getString(), retrievedEmployee.string);

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case where an isNotNull() predicate is used on a non-indexed field.
 */
function test_IsNotNull_NonIndexed() {
  asyncTestCase.waitForAsync('test_IsNotNull_NonIndexed');

  var tableSchema = db.getSchema().getDummyTable();
  // Ensure that the 'datetime' field is not indexed.
  assertEquals(0, tableSchema.datetime.getIndices().length);
  var sampleData = generateSampleDummyData();

  /**
   * Select records to the database.
   * @return {!IThenable}
   */
  var selectFn = function() {
    return db.
        select().
        from(tableSchema).
        where(tableSchema.datetime.isNotNull()).
        exec();
  };

  selectFn().then(
      function(result) {
        assertEquals(1, result.length);

        // Expecting the first sample row to have been retrieved.
        var retrievedEmployee = result[0];
        assertEquals(sampleData[0].getString(), retrievedEmployee.string);

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case where an isNull() predicate is used on an indexed field.
 */
function test_IsNull_Indexed() {
  asyncTestCase.waitForAsync('test_IsNull_Indexed');

  var tableSchema = db.getSchema().getRegion();
  // Ensure that the 'id' field is indexed.
  assertTrue(tableSchema.id.getIndices().length >= 1);

  /**
   * Select records to the database.
   * @return {!IThenable}
   */
  var selectFn = function() {
    return db.
        select().
        from(tableSchema).
        where(tableSchema.id.isNull()).
        exec();
  };

  selectFn().then(
      function(result) {
        assertEquals(0, result.length);
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case where an isNotNull() predicate is used on a indexed field.
 */
function test_IsNotNull_Indexed() {
  asyncTestCase.waitForAsync('test_IsNotNull_Indexed');

  var tableSchema = db.getSchema().getRegion();
  // Ensure that the 'id' field is indexed.
  assertTrue(tableSchema.id.getIndices().length >= 1);
  var sampleData = generateSampleRegionData();

  /**
   * Select records to the database.
   * @return {!IThenable}
   */
  var selectFn = function() {
    return db.
        select().
        from(tableSchema).
        where(tableSchema.id.isNotNull()).
        exec();
  };

  selectFn().then(
      function(result) {
        assertEquals(sampleData.length, result.length);
        asyncTestCase.continueTesting();
      }, fail);
}
