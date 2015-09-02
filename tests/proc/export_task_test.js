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
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.hrSchemaSampleData');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'ExportTaskTest');


/** @type {!lf.Database} */
var db;


/** @type {!hr.db.schema.Job} */
var j;


/** @const {number} */
var ROW_COUNT = 2;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(function(
      database) {
        db = database;
        j = db.getSchema().getJob();
        asyncTestCase.continueTesting();
      }, fail);
}


function tearDown() {
  asyncTestCase.waitForAsync('tearDown');
  db.delete().from(j).exec().then(function() {
    asyncTestCase.continueTesting();
  });
}


/**
 * Inserts sample Job rows in the Jobs table.
 * @return {!IThenable}
 */
function insertSampleJobs() {
  var rows = [];
  for (var i = 0; i < ROW_COUNT; ++i) {
    var job = lf.testing.hrSchemaSampleData.generateSampleJobData(db);
    job.setId('jobId' + i.toString());
    rows.push(job);
  }
  return db.insert().into(j).values(rows).exec();
}


function testExport() {
  var EXPECTED = {
    'name': 'hr',
    'version': 1,
    'tables': {
      'Job': [
        {
          'id': 'jobId0',
          'title': 'Software Engineer',
          'minSalary': 100000,
          'maxSalary': 500000
        },
        {
          'id': 'jobId1',
          'title': 'Software Engineer',
          'minSalary': 100000,
          'maxSalary': 500000
        }
      ],
      'JobHistory': [],
      'Employee': [],
      'Department': [],
      'Location': [],
      'Country': [],
      'Region': [],
      'Holiday': [],
      'DummyTable': [],
      'CrossColumnTable': []
    }
  };

  asyncTestCase.waitForAsync('testExport');
  insertSampleJobs().then(function() {
    return db.export();
  }).then(function(results) {
    assertObjectEquals(EXPECTED, results);
    asyncTestCase.continueTesting();
  });
}
