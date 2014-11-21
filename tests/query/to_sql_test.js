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
goog.require('lf.query.InsertBuilder');
goog.require('lf.testing.hrSchemaSampleData');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('toSql');


/** @type {!hr.db.Database} */
var db;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.getInstance(
      /* opt_onUpgrade*/ undefined,
      /* opt_volatile */ true).then(function(database) {
    db = database;
    asyncTestCase.continueTesting();
  }, fail);
}


function testInsertToSql() {
  var query = new lf.query.InsertBuilder();
  var job = lf.testing.hrSchemaSampleData.generateSampleJobData(db);
  query.into(db.getSchema().getJob());
  query.values([job]);
  assertEquals(
      'INSERT INTO Job(id, title, minSalary, maxSalary) VALUES (' +
      '\'jobId\', \'Software Engineer\', 100000, 500000);',
      query.toSql());

  var query2 = new lf.query.InsertBuilder(true);
  query2.into(db.getSchema().getJob());
  query2.values([job]);
  assertEquals(
      'INSERT OR REPLACE INTO Job(id, title, minSalary, maxSalary) VALUES (' +
      '\'jobId\', \'Software Engineer\', 100000, 500000);',
      query2.toSql());
}
