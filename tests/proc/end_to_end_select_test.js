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
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.Order');
goog.require('lf.Type');
goog.require('lf.schema');
goog.require('lf.testing.EndToEndSelectTester');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'EndToEndSelectTest');


/** @type {number} */
asyncTestCase.stepTimeout = 10 * 1000;  // 10 seconds


function testEndToEnd_StaticSchema() {
  asyncTestCase.waitForAsync('testEndToEnd_StaticSchema');
  var selectTester = new lf.testing.EndToEndSelectTester(
      hr.db.connect);
  selectTester.run().then(function() {
    asyncTestCase.continueTesting();
  });
}


function testEndToEnd_DynamicSchema() {
  asyncTestCase.waitForAsync('testEndToEnd_DynamicSchema');
  var schemaBuilder = getSchemaBuilder();
  var selectTester = new lf.testing.EndToEndSelectTester(
      schemaBuilder.connect.bind(schemaBuilder));
  selectTester.run().then(function() {
    asyncTestCase.continueTesting();
  });
}


/**
 * @return {!lf.schema.Builder}
 */
function getSchemaBuilder() {
  var schemaBuilder = lf.schema.create('hr' + goog.now(), 1);
  schemaBuilder.createTable('Job').
      addColumn('id', lf.Type.STRING).
      addColumn('title', lf.Type.STRING).
      addColumn('minSalary', lf.Type.NUMBER).
      addColumn('maxSalary', lf.Type.NUMBER).
      addPrimaryKey(['id']).
      addIndex('idx_maxSalary', ['maxSalary'], false, lf.Order.DESC);

  schemaBuilder.createTable('Employee').
      addColumn('id', lf.Type.STRING).
      addColumn('firstName', lf.Type.STRING).
      addColumn('lastName', lf.Type.STRING).
      addColumn('email', lf.Type.STRING).
      addColumn('phoneNumber', lf.Type.STRING).
      addColumn('hireDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('salary', lf.Type.NUMBER).
      addColumn('commissionPercent', lf.Type.NUMBER).
      addColumn('managerId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addColumn('photo', lf.Type.ARRAY_BUFFER).
      addPrimaryKey(['id']).
      addIndex('idx_salary', ['salary'], false, lf.Order.DESC).
      addNullable(['hireDate']);

  schemaBuilder.createTable('Department').
      addColumn('id', lf.Type.STRING).
      addColumn('name', lf.Type.STRING).
      addColumn('managerId', lf.Type.STRING).
      addColumn('locationId', lf.Type.STRING).
      addPrimaryKey(['id']);

  schemaBuilder.createTable('Holiday').
      addColumn('name', lf.Type.STRING).
      addColumn('begin', lf.Type.DATE_TIME).
      addColumn('end', lf.Type.DATE_TIME).
      addIndex('idx_begin', ['begin'], false, lf.Order.ASC).
      addPrimaryKey(['name']);

  return schemaBuilder;
}
