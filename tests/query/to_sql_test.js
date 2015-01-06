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
goog.require('lf.bind');
goog.require('lf.op');
goog.require('lf.query.DeleteBuilder');
goog.require('lf.query.InsertBuilder');
goog.require('lf.testing.hrSchemaSampleData');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('toSql');


/** @type {!lf.Database} */
var db;


/** @type {!lf.schema.Table} */
var j;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.getInstance(
      /* opt_onUpgrade*/ undefined,
      /* opt_volatile */ true).then(function(database) {
    db = database;
    j = db.getSchema().getJob();
    asyncTestCase.continueTesting();
  }, fail);
}


function testInsertToSql() {
  var query = new lf.query.InsertBuilder(hr.db.getGlobal());
  var job = lf.testing.hrSchemaSampleData.generateSampleJobData(db);
  query.into(j);
  query.values([job]);
  assertEquals(
      'INSERT INTO Job(id, title, minSalary, maxSalary) VALUES (' +
      '\'jobId\', \'Software Engineer\', 100000, 500000);',
      query.toSql());

  var query2 = new lf.query.InsertBuilder(hr.db.getGlobal(), true);
  query2.into(db.getSchema().getJob());
  query2.values([job]);
  assertEquals(
      'INSERT OR REPLACE INTO Job(id, title, minSalary, maxSalary) VALUES (' +
      '\'jobId\', \'Software Engineer\', 100000, 500000);',
      query2.toSql());
}


function testDeleteToSql_DeleteAll() {
  var query = new lf.query.DeleteBuilder(hr.db.getGlobal());
  query.from(j);
  assertEquals('DELETE FROM Job;', query.toSql());
}


function testDeleteToSql_Where() {
  var query = db.delete().from(j).where(j.id.eq('1'));
  assertEquals('DELETE FROM Job WHERE Job.id = \'1\';', query.toSql());

  query = db.delete().from(j).where(j.id.eq(lf.bind(0)));
  assertEquals('DELETE FROM Job WHERE Job.id = ?;', query.toSql());

  query = db.delete().from(j).where(j.minSalary.lt(10000));
  assertEquals('DELETE FROM Job WHERE Job.minSalary < 10000;', query.toSql());

  query = db.delete().from(j).where(j.minSalary.lte(10000));
  assertEquals('DELETE FROM Job WHERE Job.minSalary <= 10000;', query.toSql());

  query = db.delete().from(j).where(j.minSalary.gt(10000));
  assertEquals('DELETE FROM Job WHERE Job.minSalary > 10000;', query.toSql());

  query = db.delete().from(j).where(j.minSalary.gte(10000));
  assertEquals('DELETE FROM Job WHERE Job.minSalary >= 10000;', query.toSql());

  query = db.delete().from(j).where(j.minSalary.in([10000, 20000]));
  assertEquals(
      'DELETE FROM Job WHERE Job.minSalary IN (10000, 20000);', query.toSql());

  query = db.delete().from(j).where(j.minSalary.between(10000, 20000));
  assertEquals(
      'DELETE FROM Job WHERE Job.minSalary BETWEEN 10000 AND 20000;',
      query.toSql());

  // The LIKE conversion is incompatible with SQL, which is known.
  query = db.delete().from(j).where(j.id.match(/ab+c/));
  assertEquals('DELETE FROM Job WHERE Job.id LIKE \'/ab+c/\';', query.toSql());

  query = db.delete().from(j).where(lf.op.and(
      j.id.eq('1'), j.minSalary.gt(10000), j.maxSalary.lt(30000)));
  assertEquals(
      'DELETE FROM Job WHERE (Job.id = \'1\') AND (Job.minSalary > 10000) ' +
      'AND (Job.maxSalary < 30000);',
      query.toSql());

  query = db.delete().from(j).where(lf.op.or(
      j.id.eq('1'), lf.op.and(j.minSalary.gt(10000), j.maxSalary.lt(30000))));
  assertEquals(
      'DELETE FROM Job WHERE (Job.id = \'1\') OR ((Job.minSalary > 10000) ' +
      'AND (Job.maxSalary < 30000));',
      query.toSql());
}
