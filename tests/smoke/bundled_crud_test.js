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
goog.require('hr.bdb');
goog.require('lf.Capability');
goog.require('lf.backstore.Page');
goog.require('lf.testing.SmokeTester');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase =
    goog.testing.AsyncTestCase.createAndInstall('CRUDTestBundled');


/** @type {!lf.testing.SmokeTester} */
var tester;


/** @type {!lf.Capability} */
var capability;


/** @type {!lf.Database} */
var db;


function setUpPage() {
  capability = lf.Capability.get();
}


function setUp() {
  if (!capability.indexedDb) {
    return;
  }

  asyncTestCase.waitForAsync('setUp');
  hr.bdb.connect().then(function(database) {
    db = database;
    tester = new lf.testing.SmokeTester(hr.bdb.getGlobal(), database);
    return tester.clearDb();
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


function tearDown() {
  if (!capability.indexedDb) {
    return;
  }

  db.close();
}



function testCRUD() {
  if (!capability.indexedDb) {
    return;
  }

  asyncTestCase.waitForAsync('testCRUD');
  tester.testCRUD().then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


function testOverlappingScope_MultipleInserts() {
  if (!capability.indexedDb) {
    return;
  }

  asyncTestCase.waitForAsync('testOverlappingScope_MultipleInserts');
  tester.testOverlappingScope_MultipleInserts().then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


function testTransaction() {
  if (!capability.indexedDb) {
    return;
  }

  asyncTestCase.waitForAsync('testTransaction');
  tester.testTransaction().then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


function testSerialization() {
  if (!capability.indexedDb) {
    return;
  }

  var dummy = db.getSchema().table('DummyTable');
  var row = dummy.createRow({
    arraybuffer: null,
    boolean: false,
    integer: 1,
    number: 2,
    string: 'A',
    string2: 'B'
  });

  var expected = {
    arraybuffer: null,
    boolean: false,
    datetime: null,
    integer: 1,
    number: 2,
    string: 'A',
    string2: 'B',
    proto: null
  };
  assertObjectEquals(expected, row.toDbPayload());
  assertObjectEquals(expected, dummy.deserializeRow(row.serialize()).payload());

  var page = new lf.backstore.Page(1);
  page.setRows([row]);
  var page2 = lf.backstore.Page.deserialize(page.serialize()).getPayload();
  assertObjectEquals(expected, page2[row.id()]['value']);
}
