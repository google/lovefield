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
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.bind');
goog.require('lf.query.InsertBuilder');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.hrSchemaSampleData');
goog.require('lf.testing.util');


/** @type {!lf.Database} */
var db;


function setUp() {
  return hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(
      function(database) {
        db = database;
      });
}


function tearDown() {
  db.close();
}


/**
 * Tests that Insert#exec() fails if into() has not been called first.
 * @return {!IThenable}
 */
function testExec_ThrowsMissingInto() {
  var query = new lf.query.InsertBuilder(hr.db.getGlobal());
  var job = lf.testing.hrSchemaSampleData.generateSampleJobData(db);
  query.values([job]);
  // 518: Invalid usage of insert().
  return lf.testing.util.assertPromiseReject(518, query.exec());
}


/**
 * Tests that Insert#exec() fails if values() has not been called first.
 * @return {!IThenable}
 */
function testExec_ThrowsMissingValues() {
  var query = new lf.query.InsertBuilder(hr.db.getGlobal());
  query.into(db.getSchema().getJob());
  // 518: Invalid usage of insert().
  return lf.testing.util.assertPromiseReject(518, query.exec());
}


/**
 * Tests that Insert#exec() fails if allowReplace is true, for a table that has
 * no primary key.
 * @return {!IThenable}
 */
function testExec_ThrowsNoPrimaryKey() {
  var jobHistoryRow = lf.testing.hrSchemaSampleData.
      generateSampleJobHistoryData(db);
  var query = new lf.query.InsertBuilder(
      hr.db.getGlobal(), /* allowReplace */ true);

  query.
      into(db.getSchema().getJobHistory()).
      values([jobHistoryRow]);
  // 519: Attempted to insert or replace in a table with no primary key.
  return lf.testing.util.assertPromiseReject(519, query.exec());
}


/**
 * Tests that Insert#values() fails if values() has already been called.
 */
function testValues_ThrowsAlreadyCalled() {
  var query = new lf.query.InsertBuilder(hr.db.getGlobal());

  var job = lf.testing.hrSchemaSampleData.generateSampleJobData(db);
  var buildQuery = function() {
    query.values([job]).values([job]);
  };

  // 521: values() has already been called.
  lf.testing.util.assertThrowsError(521, buildQuery);
}


/**
 * Tests that Insert#into() fails if into() has already been called.
 */
function testInto_ThrowsAlreadyCalled() {
  var query = new lf.query.InsertBuilder(hr.db.getGlobal());

  var buildQuery = function() {
    var jobTable = db.getSchema().getJob();
    query.into(jobTable).into(jobTable);
  };

  // 520: into() has already been called.
  lf.testing.util.assertThrowsError(520, buildQuery);
}


function testValues_ThrowMissingBinding() {
  var query = new lf.query.InsertBuilder(hr.db.getGlobal());
  var jobTable = db.getSchema().getJob();
  query.into(jobTable).values(lf.bind(0));
  // 518: Invalid usage of insert().
  return lf.testing.util.assertPromiseReject(518, query.exec());
}


function testContext_Clone() {
  var j = db.getSchema().getJob();
  var query = /** @type {!lf.query.InsertBuilder} */ (
      db.insert().into(j).values(lf.bind(0)));
  var context = query.getQuery();
  var context2 = context.clone();
  assertObjectEquals(context.into, context2.into);
  assertObjectEquals(context.values, context2.values);
  assertTrue(context2.clonedFrom == context);
  assertTrue(goog.getUid(context) != goog.getUid(context2));

  var query2 = /** @type {!lf.query.InsertBuilder} */ (
      db.insertOrReplace().into(j).values(lf.bind(0)));
  var context3 = query2.getQuery();
  var context4 = context3.clone();
  assertObjectEquals(context3.into, context4.into);
  assertObjectEquals(context3.values, context4.values);
  assertTrue(context4.clonedFrom == context3);
  assertTrue(goog.getUid(context3) != goog.getUid(context4));
}
