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

goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing');
goog.require('lf.testing.util');


/** @type {!lf.Database} */
var db;


/** @type {!hr.db.schema.Employee} */
var employee;


function setUp() {
  return hr.db.connect({
    'storeType': lf.schema.DataStoreType.MEMORY
  }).then(function(database) {
    db = database;
    employee = db.getSchema().getEmployee();
  });
}


function tearDown() {
  db.close();
}


/**
 * Tests that when simulateErrors has been called BaseBuilder#exec() rejects.
 * @return {!IThenable}
 */
function testBuilderExec() {
  var propertyReplacer = new goog.testing.PropertyReplacer();
  lf.testing.simulateErrors(propertyReplacer);

  var selectFn = function() {
    return db.select().from(employee).exec();
  };

  return lf.testing.util.assertPromiseReject(999, selectFn()).then(
      function() {
        propertyReplacer.reset();
        return selectFn();
      }).then(
      function(results) {
        assertEquals(0, results.length);
      });
}


/**
 * Tests that when simulateErrors has been called Transaction#exec() rejects.
 * @return {!IThenable}
 */
function testTransactionExec() {
  var propertyReplacer = new goog.testing.PropertyReplacer();
  lf.testing.simulateErrors(propertyReplacer);

  var selectFn = function() {
    var tx = db.createTransaction();
    return tx.exec([db.select().from(employee)]);
  };

  return lf.testing.util.assertPromiseReject(999, selectFn()).then(
      function() {
        propertyReplacer.reset();
        return selectFn();
      }).then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(0, results[0].length);
      });
}


/**
 * Tests that when simulateErrors has been called Transaction#attach() rejects.
 * @return {!IThenable}
 */
function testTransactionAttach() {
  var propertyReplacer = new goog.testing.PropertyReplacer();
  lf.testing.simulateErrors(propertyReplacer);

  var tx = db.createTransaction();
  var selectFn = function() {
    return tx.attach(db.select().from(employee));
  };

  return tx.begin([employee]).then(
      function() {
        return lf.testing.util.assertPromiseReject(999, selectFn());
      }).then(
      function() {
        propertyReplacer.reset();
        return selectFn();
      }).then(
      function(results) {
        assertEquals(0, results.length);
      });
}
