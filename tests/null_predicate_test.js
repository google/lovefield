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
goog.require('goog.Promise');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.testing.hrSchemaSampleData');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase =
    goog.testing.AsyncTestCase.createAndInstall('NullPredicateTest');


/** @type {!lf.Database} */
var db;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.getInstance().then(
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


/**
 * Deletes the contents of all tables.
 * @return {!IThenable}
 */
function clearDb() {
  var tables = db.getSchema().getTables();
  var deletePromises = tables.map(function(table) {
    return db.delete().from(table).exec();
  });

  return goog.Promise.all(deletePromises);
}


/**
 * Creates two sample Employee rows. One with a specified 'hireDate' and one
 * with a null 'hireDate'.
 * @return {!Array.<!hr.db.row.Employee>}
 */
function generateSampleEmployeeData() {
  var employeeRow1 =
      lf.testing.hrSchemaSampleData.generateSampleEmployeeData(db);
  employeeRow1.setId('empId1');
  var employeeRow2 =
      lf.testing.hrSchemaSampleData.generateSampleEmployeeData(db);
  employeeRow2.setId('empId2');
  employeeRow2.setHireDate(null);

  return [employeeRow1, employeeRow2];
}


/**
 * Inserts sample records in the database.
 * @return {!IThenable}
 */
function populateDatabase() {
  return db.
      insert().
      into(db.getSchema().getEmployee()).
      values(generateSampleEmployeeData()).
      exec();
}


/**
 * Tests the case where an isNull() predicate is used on a non-indexed field.
 */
function test_IsNull_NonIndexed() {
  asyncTestCase.waitForAsync('test_IsNull_NonIndexed');

  var employee = db.getSchema().getEmployee();
  // Ensure that the 'hireDate' field is not indexed.
  assertEquals(0, employee.hireDate.getIndices().length);
  var sampleData = generateSampleEmployeeData();

  /**
   * Select records to the database.
   * @return {!IThenable}
   */
  var selectFn = function() {
    return db.
        select().
        from(employee).
        where(employee.hireDate.isNull()).
        exec();
  };

  selectFn().then(
      function(result) {
        assertEquals(1, result.length);

        // Expecting the second sample row to have been retrieved.
        var retrievedEmployee = result[0];
        assertEquals(sampleData[1].getId(), retrievedEmployee.id);

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case where an isNotNull() predicate is used on a non-indexed field.
 */
function test_IsNotNull_NonIndexed() {
  asyncTestCase.waitForAsync('test_IsNotNull_NonIndexed');

  var employee = db.getSchema().getEmployee();
  // Ensure that the 'hireDate' field is not indexed.
  assertEquals(0, employee.hireDate.getIndices().length);
  var sampleData = generateSampleEmployeeData();

  /**
   * Select records to the database.
   * @return {!IThenable}
   */
  var selectFn = function() {
    return db.
        select().
        from(employee).
        where(employee.hireDate.isNotNull()).
        exec();
  };

  selectFn().then(
      function(result) {
        assertEquals(1, result.length);

        // Expecting the first sample row to have been retrieved.
        var retrievedEmployee = result[0];
        assertEquals(sampleData[0].getId(), retrievedEmployee.id);

        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case where an isNull() predicate is used on a indexed field.
 */
function test_IsNull_Indexed() {
  asyncTestCase.waitForAsync('test_IsNull_Indexed');

  var employee = db.getSchema().getEmployee();
  // Ensure that the 'id' field is indexed.
  assertTrue(employee.id.getIndices().length >= 1);

  /**
   * Select records to the database.
   * @return {!IThenable}
   */
  var selectFn = function() {
    return db.
        select().
        from(employee).
        where(employee.id.isNull()).
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

  var employee = db.getSchema().getEmployee();
  // Ensure that the 'id' field is indexed.
  assertTrue(employee.id.getIndices().length >= 1);
  var sampleData = generateSampleEmployeeData();

  /**
   * Select records to the database.
   * @return {!IThenable}
   */
  var selectFn = function() {
    return db.
        select().
        from(employee).
        where(employee.id.isNotNull()).
        exec();
  };

  selectFn().then(
      function(result) {
        assertEquals(sampleData.length, result.length);
        asyncTestCase.continueTesting();
      }, fail);
}
