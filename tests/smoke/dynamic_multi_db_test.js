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
goog.require('lf.Capability');
goog.require('lf.Type');
goog.require('lf.schema');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.SmokeTester');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('MultiDBTest');


/** @type {!lf.testing.SmokeTester} */
var hrTester;


/** @type {!lf.testing.SmokeTester} */
var orderTester;


/** @type {!lf.Capability} */
var capability;


/** @return {!Array<!lf.schema.Builder>} */
function createSchemaBuilders() {
  var dsHr = lf.schema.create('hr' + goog.now(), 1);
  dsHr.createTable('Region').
      addColumn('id', lf.Type.STRING).
      addColumn('name', lf.Type.STRING).
      addPrimaryKey(['id']);

  var dsOrder = lf.schema.create('order' + goog.now(), 1);
  dsOrder.createTable('Region').
      addColumn('id', lf.Type.STRING).
      addColumn('name', lf.Type.STRING).
      addPrimaryKey(['id']);

  return [dsHr, dsOrder];
}


function setUpPage() {
  capability = lf.Capability.get();
}


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  var options = {
    storeType: !capability.indexedDb ? lf.schema.DataStoreType.MEMORY :
        lf.schema.DataStoreType.INDEXED_DB
  };
  var builders = createSchemaBuilders();
  goog.Promise.all([
    builders[0].connect(options),
    builders[1].connect(options)
  ]).then(function(dbs) {
    hrTester = new lf.testing.SmokeTester(builders[0].getGlobal(), dbs[0]);
    orderTester = new lf.testing.SmokeTester(builders[1].getGlobal(), dbs[1]);

    return goog.Promise.all([hrTester.clearDb(), orderTester.clearDb()]);
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


function testCRUD() {
  asyncTestCase.waitForAsync('testCRUD');

  goog.Promise.all([hrTester.testCRUD(), orderTester.testCRUD()]).then(
      function() {
        asyncTestCase.continueTesting();
      }, fail);
}
