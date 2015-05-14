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
goog.require('lf.fn');
goog.require('lf.schema');
goog.require('lf.schema.DataStoreType');

goog.forwardDeclare('lf.schema.ConnectOption');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('delete');


/** @type {!lf.Database} */
var db;


/** @type {!lf.schema.Table} */
var t1;


function setUpPage() {
  var options = /** @type {!lf.schema.ConnectOption} */ ({
    storeType: lf.schema.DataStoreType.MEMORY
  });

  asyncTestCase.waitForAsync('setUpPage');

  var builder = lf.schema.create('delete', 1);
  builder.createTable('t1').
      addColumn('f1', lf.Type.INTEGER).
      addColumn('f2', lf.Type.INTEGER);
  builder.connect(options).then(function(database) {
    db = database;
    t1 = db.getSchema().table('t1');
    asyncTestCase.continueTesting();
  });
}


/**
 * @param {string} expected
 * @param {!Array<!Object>} rows
 * @param {!Array<string>} fields
 */
function checkFlatten(expected, rows, fields) {
  var actual = rows.map(function(obj) {
    assertEquals(fields.length, Object.keys(obj).length);
    return fields.map(function(name) {
      return obj[name].toString();
    }).join(' ');
  }).join(' ');
  assertEquals(expected, actual);
}


function testDelete3() {
  asyncTestCase.waitForAsync('testDelete3');

  // 3.1
  var rows = [];
  for (var i = 1; i <= 4; ++i) {
    rows.push(t1.createRow({'f1': i, 'f2': Math.pow(2, i)}));
  }

  // 3.1.1
  db.insert().into(t1).values(rows).exec().then(function() {
    return db.select().from(t1).orderBy(t1['f1']).exec();
  }).then(function(results) {
    checkFlatten('1 2 2 4 3 8 4 16', results, ['f1', 'f2']);

    // 3.1.2
    return db.delete().from(t1).where(t1['f1'].eq(3)).exec();
  }).then(function() {

    // 3.1.3
    return db.select().from(t1).orderBy(t1['f1']).exec();
  }).then(function(results) {
    checkFlatten('1 2 2 4 4 16', results, ['f1', 'f2']);

    // 3.1.4 - not exactly the same
    return db.delete().from(t1).where(t1['f1'].eq(3)).exec();
  }).then(function() {

    // 3.1.5
    return db.select().from(t1).orderBy(t1['f1']).exec();
  }).then(function(results) {
    checkFlatten('1 2 2 4 4 16', results, ['f1', 'f2']);

    // 3.1.6
    return db.delete().from(t1).where(t1['f1'].eq(2)).exec();
  }).then(function() {

    // 3.1.7
    return db.select().from(t1).orderBy(t1['f1']).exec();
  }).then(function(results) {
    checkFlatten('1 2 4 16', results, ['f1', 'f2']);
    asyncTestCase.continueTesting();
  }, fail);
}


function testDelete5() {
  asyncTestCase.waitForAsync('testDelete5');

  // 5.1.1
  db.delete().from(t1).exec().then(function() {

    // 5.1.2
    return db.select(lf.fn.count()).from(t1).exec();
  }).then(function(results) {
    assertEquals(0, results[0]['COUNT(*)']);

    // 5.2.1
    var rows = [];
    for (var i = 1; i <= 200; i++) {
      rows.push(t1.createRow({'f1': i, 'f2': i * i}));
    }
    return db.insert().into(t1).values(rows).exec();
  }).then(function() {
    return db.select(lf.fn.count()).from(t1).exec();
  }).then(function(results) {
    assertEquals(200, results[0]['COUNT(*)']);

    // 5.2.2
    return db.delete().from(t1).exec();
  }).then(function() {
    return db.select(lf.fn.count()).from(t1).exec();
  }).then(function(results) {
    assertEquals(0, results[0]['COUNT(*)']);

    // 5.2.3
    var rows = [];
    for (var i = 1; i <= 200; i++) {
      rows.push(t1.createRow({'f1': i, 'f2': i * i}));
    }
    return db.insert().into(t1).values(rows).exec();
  }).then(function() {
    return db.select(lf.fn.count()).from(t1).exec();
  }).then(function(results) {
    assertEquals(200, results[0]['COUNT(*)']);

    // 5.2.4
    return db.delete().from(t1).exec();
  }).then(function() {

    // 5.2.5
    return db.select(lf.fn.count()).from(t1).exec();
  }).then(function(results) {
    assertEquals(0, results[0]['COUNT(*)']);

    // 5.2.6
    var rows = [];
    for (var i = 1; i <= 200; i++) {
      rows.push(t1.createRow({'f1': i, 'f2': i * i}));
    }
    return db.insert().into(t1).values(rows).exec();
  }).then(function() {
    return db.select(lf.fn.count()).from(t1).exec();
  }).then(function(results) {
    assertEquals(200, results[0]['COUNT(*)']);

    // 5.3
    var promises = [];
    for (var i = 1; i <= 200; i += 4) {
      promises.push(db.delete().from(t1).where(t1['f1'].eq(i)).exec());
    }
    return goog.Promise.all(promises);
  }).then(function() {
    return db.select(lf.fn.count()).from(t1).exec();
  }).then(function(results) {
    assertEquals(150, results[0]['COUNT(*)']);

    // 5.4.1
    return db.delete().from(t1).where(t1['f1'].gt(50)).exec();
  }).then(function() {

    // 5.4.2
    return db.select(lf.fn.count()).from(t1).exec();
  }).then(function(results) {
    assertEquals(37, results[0]['COUNT(*)']);

    // 5.5
    var promises = [];
    for (var i = 1; i <= 70; i += 3) {
      promises.push(db.delete().from(t1).where(t1['f1'].eq(i)).exec());
    }
    return goog.Promise.all(promises);
  }).then(function() {
    return db.select(t1['f1']).from(t1).orderBy(t1['f1']).exec();
  }).then(function(results) {
    checkFlatten(
        '2 3 6 8 11 12 14 15 18 20 23 24 26 27 30 ' +
        '32 35 36 38 39 42 44 47 48 50',
        results,
        ['f1']);

    // 5.6
    var promises = [];
    for (var i = 1; i < 40; ++i) {
      promises.push(db.delete().from(t1).where(t1['f1'].eq(i)).exec());
    }
    return goog.Promise.all(promises);
  }).then(function() {
    return db.select(t1['f1']).from(t1).orderBy(t1['f1']).exec();
  }).then(function(results) {
    checkFlatten('42 44 47 48 50', results, ['f1']);

    // 5.7
    return db.delete().from(t1).where(t1['f1'].neq(48)).exec();
  }).then(function() {
    return db.select(t1['f1']).from(t1).orderBy(t1['f1']).exec();
  }).then(function(results) {
    checkFlatten('48', results, ['f1']);

    asyncTestCase.continueTesting();
  }, fail);
}


// TODO(arthurhsu): implement 6, 7, 9
