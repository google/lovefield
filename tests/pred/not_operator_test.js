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
goog.require('lf.op');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.hrSchemaSampleData');


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
 * @return {!Array<!hr.db.row.Employee>}
 */
function generateSampleEmployeeData(rowCount) {
  var employees = new Array(rowCount);
  for (var i = 0; i < rowCount; i++) {
    employees[i] =
        lf.testing.hrSchemaSampleData.generateSampleEmployeeData(db);
    employees[i].
        setId('empId' + i.toString()).
        setSalary(100 * i);
  }

  return employees;
}


/**
 * Inserts sample records in the database.
 * @return {!IThenable}
 */
function populateDatabase() {
  return db.
      insert().
      into(db.getSchema().getEmployee()).
      values(generateSampleEmployeeData(rowCount)).
      exec();
}


function test_Not_In() {
  asyncTestCase.waitForAsync('test_Not_In');

  var employee = db.getSchema().getEmployee();
  var excludeIds = ['empId3', 'empId5', 'empId1'];
  var expectedIds = ['empId0', 'empId2', 'empId4', 'empId6', 'empId7'];

  /**
   * Select records from the database.
   * @return {!IThenable}
   */
  var selectFn = function() {
    return db.
        select().
        from(employee).
        where(lf.op.not(employee.id.in(excludeIds))).
        exec();
  };

  selectFn().then(
      function(results) {
        var actualIds = results.map(function(result) {
          return result.id;
        });

        assertArrayEquals(expectedIds, actualIds);
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

  var employee = db.getSchema().getEmployee();
  var excludedId = 'empId1';

  /**
   * Select records from the database.
   * @return {!IThenable}
   */
  var selectFn = function() {
    return db.
        select().
        from(employee).
        where(lf.op.not(employee.id.eq(excludedId))).
        exec();
  };

  selectFn().then(
      function(results) {
        assertEquals(rowCount - 1, results.length);
        assertFalse(results.some(function(result) {
          return result.id == excludedId;
        }));
        asyncTestCase.continueTesting();
      }, fail);
}


function test_And_Not() {
  asyncTestCase.waitForAsync('test_And_Not');

  var employee = db.getSchema().getEmployee();
  var excludedId = 'empId1';

  /**
   * Select records from the database.
   * @return {!IThenable}
   */
  var selectFn = function() {
    return db.
        select().
        from(employee).
        where(lf.op.and(
            lf.op.not(employee.id.eq(excludedId)),
            employee.id.in([excludedId, 'empId2', 'empId3']))).
        exec();
  };

  selectFn().then(
      function(results) {
        assertEquals(2, results.length);

        var actualIds = results.map(function(result) {
          return result.id;
        });
        assertArrayEquals(actualIds, ['empId2', 'empId3']);
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case where a combined AND predicate is used with the NOT operator.
 */
function test_Not_And() {
  asyncTestCase.waitForAsync('test_Not_And');
  var employee = db.getSchema().getEmployee();

  /**
   * Select records from the database.
   * @return {!IThenable}
   */
  var selectFn = function() {
    return db.
        select().
        from(employee).
        where(
            lf.op.not(
                lf.op.and(
                    employee.salary.gte(200),
                    employee.salary.lte(600)))).
        exec();
  };

  selectFn().then(
      function(results) {
        var actualSalaries = results.map(function(result) {
          return result.salary;
        });
        var expectedSalaries = [0, 100, 700];
        assertArrayEquals(expectedSalaries, actualSalaries);
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests the case where a combined OR predicate is used with the NOT operator.
 */
function test_Not_Or() {
  asyncTestCase.waitForAsync('test_Not_Or');
  var employee = db.getSchema().getEmployee();

  /**
   * Select records from the database.
   * @return {!IThenable}
   */
  var selectFn = function() {
    return db.
        select().
        from(employee).
        where(
            lf.op.not(
                lf.op.or(
                    employee.salary.lte(200),
                    employee.salary.gte(600)))).
        exec();
  };

  selectFn().then(
      function(results) {
        var actualSalaries = results.map(function(result) {
          return result.salary;
        });
        var expectedSalaries = [500, 400, 300];
        assertArrayEquals(expectedSalaries, actualSalaries);
        asyncTestCase.continueTesting();
      }, fail);
}
