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
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'SimulateErrorTest');


/** @type {!lf.Database} */
var db;


/** @type {!hr.db.schema.Employee} */
var employee;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.connect({
    'storeType': lf.schema.DataStoreType.MEMORY
  }).then(function(database) {
    db = database;
    employee = db.getSchema().getEmployee();
    asyncTestCase.continueTesting();
  });
}


function tearDown() {
  db.close();
}


/**
 * Tests that when simulateErrors has been called BaseBuilder#exec() rejects.
 */
function testBuilderExec() {
  asyncTestCase.waitForAsync('testBuilderExec');
  var propertyReplacer = new goog.testing.PropertyReplacer();
  lf.testing.simulateErrors(propertyReplacer);

  /** @type {!IThenable<!Array>} */ (
      db.select().from(employee).exec().then(
      fail,
      function(error) {
        assertEquals(999, error.code);
        propertyReplacer.reset();
        return db.select().from(employee).exec();
      })).then(
      function(results) {
        assertEquals(0, results.length);
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests that when simulateErrors has been called Transaction#exec() rejects.
 */
function testTransactionExec() {
  asyncTestCase.waitForAsync('testTransactionExec');
  var propertyReplacer = new goog.testing.PropertyReplacer();
  lf.testing.simulateErrors(propertyReplacer);

  var tx1 = db.createTransaction();
  /** @type {!IThenable<!Array>} */ (
      tx1.exec([db.select().from(employee)]).then(
      fail,
      function(error) {
        assertEquals(999, error.code);
        propertyReplacer.reset();

        var tx2 = db.createTransaction();
        return tx2.exec([db.select().from(employee)]);
      })).then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(0, results[0].length);
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Tests that when simulateErrors has been called Transaction#attach() rejects.
 */
function testTransactionAttach() {
  asyncTestCase.waitForAsync('testTransactionAttach');
  var propertyReplacer = new goog.testing.PropertyReplacer();
  lf.testing.simulateErrors(propertyReplacer);

  var tx1 = db.createTransaction();
  /** @type {!IThenable<!Array>} */ (
      tx1.begin([employee]).then(function() {
        return tx1.attach(db.select().from(employee));
      }).then(
      fail,
      function(error) {
        assertEquals(999, error.code);
        propertyReplacer.reset();
        return tx1.attach(db.select().from(employee));
      })).then(
      function(results) {
        assertEquals(0, results.length);
        asyncTestCase.continueTesting();
      }, fail);
}
