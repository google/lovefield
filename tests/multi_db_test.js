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
goog.require('goog.userAgent.product');
goog.require('hr.db');
goog.require('order.db');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('MultiDBTest');


/** @type {!lf.Database} */
var hrDb;


/** @type {!lf.Database} */
var orderDb;


/** @const {string} */
var CONTENT1 = 'something';


/** @const {string} */
var CONTENT2 = 'nothing';


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  var volatile = goog.userAgent.product.SAFARI;
  goog.Promise.all([
    hr.db.getInstance(undefined, volatile),
    order.db.getInstance(undefined, volatile)
  ]).then(function(dbs) {
    hrDb = dbs[0];
    orderDb = dbs[1];

    return deleteAll();
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}

function deleteAll() {
  var hrTables = hrDb.getSchema().getTables();
  var orderTables = orderDb.getSchema().getTables();
  var promises = hrTables.map(function(table) {
    return hrDb.delete().from(table).exec();
  });
  promises.concat(orderTables.map(function(table) {
    return orderDb.delete().from(table).exec();
  }));
  return goog.Promise.all(promises);
}

function tearDown() {
  asyncTestCase.waitForAsync();
  deleteAll().then(function() {
    asyncTestCase.continueTesting();
  });
}


/**
 * Generates sample records for hrDb.
 * @return {!Array.<!hr.db.row.Region>}
 */
function generateSampleRowsHR() {
  var r = hrDb.getSchema().getRegion();
  return [
    r.createRow({id: '1', name: 'North America' }),
    r.createRow({id: '2', name: 'Central America' }),
    r.createRow({id: '3', name: 'South America' }),
    r.createRow({id: '4', name: 'Western Europe' }),
    r.createRow({id: '5', name: 'Southern Europe' })
  ];
}


/**
 * Generates sample records to be used for testing.
 * @return {!Array.<!hr.db.row.Region>}
 */
function generateSampleRowsOrder() {
  var r = orderDb.getSchema().getRegion();
  return [
    r.createRow({id: 'NAM', name: 'North America' }),
    r.createRow({id: 'CAM', name: 'Central America' }),
    r.createRow({id: 'SAM', name: 'South America' }),
    r.createRow({id: 'WEU', name: 'Western Europe' }),
    r.createRow({id: 'SEU', name: 'Southern Europe' })
  ];
}


function testCRUD() {
  asyncTestCase.waitForAsync('testCRUD');

  var hrRows = generateSampleRowsHR();
  var orderRows = generateSampleRowsOrder();
  var hrRegion = hrDb.getSchema().getRegion();
  var orderRegion = orderDb.getSchema().getRegion();

  /**
   * Inserts sample rows into according databases.
   * @return {!IThenable}
   */
  var insertFn = function() {
    return goog.Promise.all([
      hrDb.insert().into(hrRegion).values(hrRows).exec(),
      orderDb.insert().into(orderRegion).values(orderRows).exec()
    ]);
  };


  /**
   * Select all rows from different databases.
   * @return {!IThenable}
   */
  var selectAllFn = function() {
    return goog.Promise.all([
      hrDb.select().from(hrRegion).exec(),
      orderDb.select().from(orderRegion).exec()
    ]);
  };


  /**
   * Update different rows in different databases.
   * @return {!IThenable}
   */
  var updateFn = function() {
    return goog.Promise.all([
      hrDb.update(hrRegion).set(hrRegion.name, CONTENT1).exec(),
      orderDb.update(orderRegion).set(orderRegion.name, CONTENT2).exec()
    ]);
  };


  /**
   * Delete some rows in different databases.
   * @return {!IThenable}
   */
  var deleteFn = function() {
    return goog.Promise.all([
      hrDb.delete().from(hrRegion).where(hrRegion.id.in(['1', '3'])).exec(),
      orderDb.delete().from(orderRegion).exec()
    ]);
  };

  insertFn().then(function() {
    return selectAllFn();
  }).then(function(results) {
    assertEquals(hrRows.length, results[0].length);
    assertEquals(orderRows.length, results[1].length);
    return updateFn();
  }).then(function() {
    return selectAllFn();
  }).then(function(results) {
    assertEquals(hrRows.length, results[0].length);
    assertEquals(orderRows.length, results[1].length);
    results[0].forEach(function(row) {
      assertEquals(row['name'], CONTENT1);
    });
    results[1].forEach(function(row) {
      assertEquals(row['name'], CONTENT2);
    });
    return deleteFn();
  }).then(function() {
    return selectAllFn();
  }).then(function(results) {
    assertEquals(hrRows.length - 2, results[0].length);
    assertEquals(0, results[1].length);
    asyncTestCase.continueTesting();
  }, fail);
}
