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
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.Order');
goog.require('lf.schema.DataStoreType');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase =
    goog.testing.AsyncTestCase.createAndInstall('DateIndexTest');


/** @type {!lf.Database} */
var db;


/** @type {!lf.schema.Table} */
var holiday;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(
      function(database) {
        db = database;
        holiday = db.getSchema().getHoliday();
        asyncTestCase.continueTesting();
      });
}


/**
 * Generates sample records to be used for testing.
 * @return {!Array<!hr.db.row.Holiday>}
 */
function generateSampleRows() {
  return [
    holiday.createRow({
      name: '2014 New Year\'s Day',
      begin: new Date(2013, 11, 31),
      end: new Date(2014, 0, 1, 23, 59, 59)
    }),
    holiday.createRow({
      name: '2014 MLK Day',
      begin: new Date(2014, 0, 20),
      end: new Date(2014, 0, 20, 23, 59, 59)
    }),
    holiday.createRow({
      name: '2014 President\'s Day',
      begin: new Date(2014, 1, 17),
      end: new Date(2014, 1, 17, 23, 59, 59)
    }),
    holiday.createRow({
      name: '2014 Memorial Day',
      begin: new Date(2014, 4, 26),
      end: new Date(2014, 4, 26, 23, 59, 59)
    }),
    holiday.createRow({
      name: '2014 Independence Day',
      begin: new Date(2014, 6, 3),
      end: new Date(2014, 6, 4, 23, 59, 59)
    }),
    holiday.createRow({
      name: '2014 Labor Day',
      begin: new Date(2014, 8, 1),
      end: new Date(2014, 8, 1, 23, 59, 59)
    }),
    holiday.createRow({
      name: '2014 Thanksgiving',
      begin: new Date(2014, 10, 27),
      end: new Date(2014, 10, 28, 23, 59, 59)
    }),
    holiday.createRow({
      name: '2014 Christmas',
      begin: new Date(2014, 11, 24),
      end: new Date(2014, 11, 26, 23, 59, 59)
    })
  ];
}


function testDateIndex() {
  asyncTestCase.waitForAsync('testDateIndex');

  var rows = generateSampleRows();
  var expected = rows.map(function(row) {
    return row.getName();
  }).slice(1).reverse();

  db.insert().into(holiday).values(rows).exec().then(function() {
    var query = db.select().
        from(holiday).
        where(holiday.begin.gt(new Date(2014, 0, 1))).
        orderBy(holiday.begin, lf.Order.DESC);
    assertTrue(query.explain().indexOf('index_range_scan') != -1);
    return query.exec();
  }).then(function(results) {
    assertArrayEquals(expected, results.map(function(row) {
      return row['name'];
    }));
    asyncTestCase.continueTesting();
  });
}
