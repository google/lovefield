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
goog.require('goog.Promise');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.proc.ObserverQueryTask');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.hrSchemaSampleData');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'ObserverTaskTest');


/** @type {!lf.Database} */
var db;


/** @type {!hr.db.schema.Job} */
var j;


/** @const {number} */
var ROW_COUNT = 3;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(function(
      database) {
        db = database;
        j = db.getSchema().getJob();
      }).then(function() {
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


/**
 * Tests that registered observers are notified as a result of executing an
 * ObserveTask.
 */
function testExec() {
  asyncTestCase.waitForAsync('testExec');

  var selectQuery = /** @type {!lf.query.SelectBuilder} */ (
      db.select().from(j));

  var observerCallback = function(changes) {
    // Expecting one "change" record for each insertion.
    assertEquals(ROW_COUNT, changes.length);
    changes.forEach(function(change) {
      assertEquals(1, change['addedCount']);
    });

    db.unobserve(selectQuery, observerCallback);
    asyncTestCase.continueTesting();
  };

  insertSampleJobs().then(function() {
    // Start observing.
    db.observe(selectQuery, observerCallback);
    var observerTask = new lf.proc.ObserverQueryTask(
        hr.db.getGlobal(), [selectQuery.getObservableTaskItem()]);
    return observerTask.exec();
  }, fail);
}
