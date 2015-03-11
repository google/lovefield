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
goog.require('lf.bind');
goog.require('lf.fn');
goog.require('lf.op');
goog.require('lf.query.DeleteBuilder');
goog.require('lf.query.InsertBuilder');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.hrSchemaSampleData');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('toSql');


/** @type {!lf.Database} */
var db;


/** @type {!lf.schema.Table} */
var j;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(function(
      database) {
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
  assertEquals('DELETE FROM Job WHERE Job.id = ?0;', query.toSql());

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

function testUpdateToSql() {
  var query = db.update(j).set(j.minSalary, 10000);
  assertEquals('UPDATE Job SET Job.minSalary = 10000;', query.toSql());

  query = db.update(j).set(j.minSalary, 10000).where(j.id.eq('1'));
  assertEquals(
      'UPDATE Job SET Job.minSalary = 10000 WHERE Job.id = \'1\';',
      query.toSql());

  query = db.update(j).
      set(j.minSalary, lf.bind(1)).
      set(j.maxSalary, lf.bind(2)).
      where(j.id.eq(lf.bind(0)));
  assertEquals(
      'UPDATE Job SET Job.minSalary = ?1, Job.maxSalary = ?2 ' +
      'WHERE Job.id = ?0;',
      query.toSql());
}

function testSelectToSql_Simple() {
  var query = db.select().from(j);
  assertEquals('SELECT * FROM Job;', query.toSql());

  query = db.select(j.title.as('T'), j.minSalary, j.maxSalary).
      from(j).
      orderBy(j.id).
      orderBy(j.maxSalary, lf.Order.DESC).
      groupBy(j.minSalary, j.maxSalary).
      limit(20).
      skip(50);
  assertEquals(
      'SELECT Job.title AS T, Job.minSalary, Job.maxSalary' +
      ' FROM Job' +
      ' ORDER BY Job.id ASC, Job.maxSalary DESC' +
      ' GROUP BY Job.minSalary, Job.maxSalary' +
      ' LIMIT 20' +
      ' SKIP 50;',
      query.toSql());

  query = db.select(j.title).from(j).where(j.minSalary.gt(10000));
  assertEquals(
      'SELECT Job.title FROM Job WHERE Job.minSalary > 10000;',
      query.toSql());

  query = db.select(lf.fn.avg(j.minSalary)).from(j);
  assertEquals('SELECT AVG(Job.minSalary) FROM Job;', query.toSql());

  query = db.select(lf.fn.count(lf.fn.distinct(j.minSalary))).from(j);
  assertEquals(
      'SELECT COUNT(DISTINCT(Job.minSalary)) FROM Job;',
      query.toSql());

  query = db.select(lf.fn.max(j.minSalary)).from(j);
  assertEquals('SELECT MAX(Job.minSalary) FROM Job;', query.toSql());

  query = db.select(lf.fn.min(j.minSalary)).from(j);
  assertEquals('SELECT MIN(Job.minSalary) FROM Job;', query.toSql());

  query = db.select(lf.fn.stddev(j.minSalary)).from(j);
  assertEquals('SELECT STDDEV(Job.minSalary) FROM Job;', query.toSql());

  query = db.select(lf.fn.sum(j.minSalary)).from(j);
  assertEquals('SELECT SUM(Job.minSalary) FROM Job;', query.toSql());
}

function testSelectToSql_Join() {
  var e = db.getSchema().getEmployee();
  var d = db.getSchema().getDepartment();

  var query = db.select(e.firstName, e.lastName, j.title).
      from(e, j).
      where(e.jobId.eq(j.id)).
      orderBy(e.id).
      limit(20).
      skip(10);
  assertEquals(
      'SELECT Employee.firstName, Employee.lastName, Job.title' +
      ' FROM Employee, Job' +
      ' WHERE Employee.jobId = Job.id' +
      ' ORDER BY Employee.id ASC' +
      ' LIMIT 20' +
      ' SKIP 10;',
      query.toSql());

  var j1 = j.as('j1');
  var j2 = j.as('j2');

  query = db.select().
      from(j1, j2).
      where(j1.minSalary.eq(j2.maxSalary)).
      orderBy(j1.id, lf.Order.DESC).
      orderBy(j2.id, lf.Order.DESC);
  assertEquals(
      'SELECT *' +
      ' FROM Job AS j1, Job AS j2' +
      ' WHERE j1.minSalary = j2.maxSalary' +
      ' ORDER BY j1.id DESC, j2.id DESC;',
      query.toSql());

  query = db.select(e.firstName, e.lastName, d.name, j.title).
      from(e).
      innerJoin(j, j.id.eq(e.jobId)).
      innerJoin(d, d.id.eq(e.departmentId));
  assertEquals(
      'SELECT Employee.firstName, Employee.lastName,' +
      ' Department.name, Job.title' +
      ' FROM Employee, Job, Department' +
      ' WHERE (Department.id = Employee.departmentId) AND' +
      ' (Job.id = Employee.jobId);',
      query.toSql());
}
