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
goog.require('lf.schema');
goog.require('lf.schema.DataStoreType');

goog.forwardDeclare('lf.schema.ConnectOption');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('delete');


/** @type {!lf.Database} */
var db;


/** @type {!lf.schema.Table} */
var t1;


/** @type {!lf.schema.Table} */
var t2;


function setUpPage() {
  var options = /** @type {!lf.schema.ConnectOption} */ ({
    storeType: lf.schema.DataStoreType.MEMORY
  });

  asyncTestCase.waitForAsync('setUpPage');

  var builder = lf.schema.create('delete', 1);
  builder.createTable('t1').
      addColumn('f1', lf.Type.INTEGER).
      addColumn('f2', lf.Type.INTEGER);
  builder.createTable('t2').
      addColumn('r1', lf.Type.NUMBER).
      addColumn('r2', lf.Type.NUMBER);
  builder.connect(options).then(function(database) {
    db = database;
    t1 = db.getSchema().table('t1');
    t2 = db.getSchema().table('t2');
    asyncTestCase.continueTesting();
  });
}


/**
 * @param {string} expected
 * @param {!Array<!Object>} rows
 * @param {!Array<string>} fields
 * @param {string=} opt_tablePrefix
 */
function checkFlatten(expected, rows, fields, opt_tablePrefix) {
  var actual = rows.map(function(obj) {
    var objToCheck = goog.isDefAndNotNull(opt_tablePrefix) ?
        obj[opt_tablePrefix] : obj;
    assertEquals(fields.length, Object.keys(objToCheck).length);
    return fields.map(function(name) {
      return objToCheck[name].toString();
    }).join(' ');
  }).join(' ');
  assertEquals(expected, actual);
}


function testSelect1_1() {
  asyncTestCase.waitForAsync('testSelect1_1');

  var table1Row = t1.createRow({'f1': 11, 'f2': 22});
  var table2Row = t2.createRow({'r1': 1.1, 'r2': 2.2});

  db.createTransaction().exec([
    db.insert().into(t1).values([table1Row]),
    db.insert().into(t2).values([table2Row])
  ]).then(function() {
    // 1-1.1 not applicable
    // 1-1.2 not applicable
    // 1-1.3 not applicable

    // 1-1.4
    return db.select(t1['f1']).from(t1).exec();
  }).then(function(results) {
    checkFlatten('11', results, ['f1']);

    // 1-1.5
    return db.select(t1['f2']).from(t1).exec();
  }).then(function(results) {
    checkFlatten('22', results, ['f2']);

    // 1-1.6, 1-1.7
    return db.select(t1['f1'], t1['f2']).from(t1).exec();
  }).then(function(results) {
    checkFlatten('11 22', results, ['f1', 'f2']);

    // 1-1.8
    return db.select().from(t1).exec();
  }).then(function(results) {
    checkFlatten('11 22', results, ['f1', 'f2']);

    // 1-1.8.1 not applicable
    // 1-1.8.2 not applicable
    // 1-1.8.3 not applicable

    // 1-1.9
    return db.select().from(t1, t2).exec();
  }).then(function(results) {
    checkFlatten('11 22', results, ['f1', 'f2'], 't1');
    checkFlatten('1.1 2.2', results, ['r1', 'r2'], 't2');

    // 1-1.9.1 not applicable
    // 1-1.9.2 not applicable

    // 1-1.10
    return db.select(t1['f1'], t2['r1']).from(t1, t2).exec();
  }).then(function(results) {
    checkFlatten('11', results, ['f1'], 't1');
    checkFlatten('1.1', results, ['r1'], 't2');

    // 1-1.11
    return db.select(t1['f1'], t2['r1']).from(t2, t1).exec();
  }).then(function(results) {
    checkFlatten('11', results, ['f1'], 't1');
    checkFlatten('1.1', results, ['r1'], 't2');

    // 1-1.11.1
    return db.select().from(t2, t1).exec();
  }).then(function(results) {
    checkFlatten('11 22', results, ['f1', 'f2'], 't1');
    checkFlatten('1.1 2.2', results, ['r1', 'r2'], 't2');

    // 1-1.11.2
    return db.select().from(t1.as('a'), t1.as('b')).exec();
  }).then(function(results) {
    checkFlatten('11 22', results, ['f1', 'f2'], 'a');
    checkFlatten('11 22', results, ['f1', 'f2'], 'b');

    // 1-1.12 not applicable
    // 1-1.13 not applicable

    asyncTestCase.continueTesting();
  }, fail);
}
