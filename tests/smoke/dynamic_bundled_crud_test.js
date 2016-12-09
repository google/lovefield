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
goog.require('goog.testing.jsunit');
goog.require('lf.Capability');
goog.require('lf.Type');
goog.require('lf.schema');
goog.require('lf.testing.SmokeTester');


/** @type {!lf.testing.SmokeTester} */
var tester;


/** @type {!lf.Capability} */
var capability;


/** @return {!lf.schema.Builder} */
function createSchemaBuilder() {
  var ds = lf.schema.create('hr' + goog.now(), 1);
  ds.setPragma({
    enableBundledMode: true
  });

  ds.createTable('Region').
      addColumn('id', lf.Type.STRING).
      addColumn('name', lf.Type.STRING).
      addPrimaryKey(['id']);
  return ds;
}


function setUpPage() {
  capability = lf.Capability.get();

  // Need longer timeout for Safari on SauceLabs.
  goog.testing.TestCase.getActiveTestCase().promiseTimeout = 40 * 1000;  // 40s
}


function setUp() {
  if (!capability.indexedDb) {
    return;
  }

  var builder = createSchemaBuilder();
  return builder.connect().then(function(database) {
    tester = new lf.testing.SmokeTester(builder.getGlobal(), database);
    // Delete any left-overs from previous tests.
    return tester.clearDb();
  });
}


function testCRUD() {
  if (!capability.indexedDb) {
    return;
  }

  return tester.testCRUD();
}


function testOverlappingScope_MultipleInserts() {
  if (!capability.indexedDb) {
    return;
  }

  return tester.testOverlappingScope_MultipleInserts();
}


function testTransaction() {
  if (!capability.indexedDb) {
    return;
  }

  return tester.testTransaction();
}
