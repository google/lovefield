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



/**
 * A singleton service used by the rest of the application to make calls to the
 * Lovefield API.
 * @constructor
 */
var LovefieldService = function() {
  this.db_ = null;
  this.tc_ = null;
  this.pd_ = null;
  this.getDbConnection_ = null;

  this.getTestCaseDataQuery_ = null;
  this.getTestCaseIdQuery_ = null;
  this.latestSchemaVersion_ = 2;
};


/**
 * Initializes member variables that can't be initialized before getting a
 * connection to the database.
 * @private
 */
LovefieldService.prototype.onConnected_ = function() {
  this.tc_ = this.db_.getSchema().table('TestCase');
  this.pd_ = this.db_.getSchema().table('PerfData');

  this.getTestCaseDataQuery_ = this.db_.
      select().
      from(this.pd_).
      where(this.pd_.testCaseId.eq(lf.bind(0))).
      orderBy(this.pd_.date, lf.Order.DESC).
      limit(14);

  this.getTestCaseIdQuery_ = this.db_.
      select(this.tc_.id).
      from(this.tc_).
      where(lf.op.and(
          this.tc_.testSuiteName.eq(lf.bind(0)),
          this.tc_.testCaseName.eq(lf.bind(1))));
};


/**
 * Instantiates the DB connection (re-entrant).
 * @return {!IThenable<!lf.Database>}
 */
LovefieldService.prototype.getDbConnection = function() {
  if (this.getDbConnection_ != null) {
    return this.getDbConnection_;
  }

  var isSafari = function() {
    return navigator.userAgent.indexOf('Safari') != -1 &&
        navigator.userAgent.indexOf('Chrome') == -1;
  };

  var connectOptions = {
    storeType: isSafari() ?
        lf.schema.DataStoreType.MEMORY : lf.schema.DataStoreType.INDEXED_DB,
    onUpgrade: this.onUpgradeDb_.bind(this),
    enableInspector: true
  };

  this.getDbConnection_ = this.buildSchema_().connect(connectOptions).then(
      function(db) {
        this.db_ = db;
        window.db = db;

        this.onConnected_();
        return db;
      }.bind(this));

  return this.getDbConnection_;
};


/**
 * Builds the database schema.
 * @return {!lf.schema.Builder}
 * @private
 */
LovefieldService.prototype.buildSchema_ = function() {
  var schemaBuilder = lf.schema.create('dashboard', this.latestSchemaVersion_);
  schemaBuilder.createTable('TestCase').
      addColumn('id', lf.Type.INTEGER).
      addColumn('testSuiteName', lf.Type.STRING).
      addColumn('testCaseName', lf.Type.STRING).
      addPrimaryKey(['id']).
      addUnique('uq_suitCase', ['testSuiteName', 'testCaseName']);

  schemaBuilder.createTable('PerfData').
      addColumn('testCaseId', lf.Type.INTEGER).
      addColumn('date', lf.Type.DATE_TIME).
      addColumn('execTime', lf.Type.NUMBER).
      addUnique('uq_caseIdDate', ['testCaseId', 'date']).
      addForeignKey('fk_testCaseId', {
        local: 'testCaseId',
        ref: 'TestCase.id',
        action: lf.ConstraintAction.RESTRICT,
        timing: lf.ConstraintTiming.IMMEDIATE
      });

  return schemaBuilder;
};


/**
 * @param {!lf.raw.BackStore} rawDb
 * @return {!IThenable}
 * @private
 */
LovefieldService.prototype.onUpgradeDb_ = function(rawDb) {
  if (rawDb.getVersion() < this.latestSchemaVersion_) {
    // Empty the DB tables if the version has changed.
    return new Promise(function(resolve, reject) {
      var tx = rawDb.getRawTransaction();
      tx.oncomplete = resolve;
      tx.onabort = reject;
      tx.objectStore('PerfData').clear();
      tx.objectStore('TestCase').clear();
    });
  }

  return Promise.resolve();
};


/**
 * Inserts data in the two tables, HistoricalData and StockInfo.
 * @param {!Array<!Object>} testCaseRaw
 * @param {!Array<!Object>} perfDataRaw
 * @return {!IThenable} A promise that is resolved after both tables have been
 *     populated.
 */
LovefieldService.prototype.insertData = function(
    testCaseRaw, perfDataRaw) {
  var testCaseRows = testCaseRaw.map(
      function(obj) { return this.tc_.createRow(obj); }, this);
  var perfDataRows = perfDataRaw.map(
      function(obj) { return this.pd_.createRow(obj); }, this);

  var q1 = this.db_.
      insert().
      into(this.tc_).
      values(testCaseRows);
  var q2 = this.db_.
      insert().
      into(this.pd_).
      values(perfDataRows);

  // Updating both tables within a single transaction.
  var tx = this.db_.createTransaction();
  return tx.exec([q1, q2]);
};


/**
 * @param {string} testSuite
 * @param {string} testCase
 * @return {!IThenable<?number>} The unique numerical ID that corresponds to the
 *     given pair of testSuite, or null if such a pair is not found.
 */
LovefieldService.prototype.getTestCaseId = function(testSuite, testCase) {
  return this.getTestCaseIdQuery_.bind([testSuite, testCase]).exec().then(
      function(results) {
        return results.length == 0 ? null : results[0].id;
      });
};


/**
 * @param {string} testSuite
 * @param {string} testCase
 * @return {!IThenable<!Array<!Object>>} The performance data (maximum last 14
 *     measurements) for the given testSuite, testCase pair.
 */
LovefieldService.prototype.getTestCaseDataByName = function(
    testSuite, testCase) {
  return this.getTestCaseId(testSuite, testCase).then(
      function(testCaseId) {
        // TODO(dpapad): Assert testCaseId not null.
        return this.getTestCaseDataQuery_.bind([testCaseId]).exec();
      }.bind(this));
};


/**
 * @return {!IThenable<!Array<string>>} A list of all testSuites.
 */
LovefieldService.prototype.getTestSuiteList = function() {
  var column = lf.fn.distinct(this.tc_.testSuiteName);
  return this.db_.select(column).
      from(this.tc_).
      orderBy(this.tc_.testSuiteName, lf.Order.ASC).
      exec().then(function(results) {
        return results.map(function(obj) {
          return obj[column.getName()];
        });
      });
};


/**
 * @return {!IThenable<!Array<!Object>>} Geometric mean data.
 */
LovefieldService.prototype.getGeoMeanData = function() {
  // TODO(dpapad): Limit by 14 days too.
  return this.db_.
      select(this.pd_.date, lf.fn.geomean(this.pd_.execTime)).
      from(this.pd_).
      groupBy(this.pd_.date).
      orderBy(this.pd_.date, lf.Order.DESC).
      exec();
};


/**
 * @return {!IThenable<?Date>} The last date the DB was synced to the server, or
 *     null if sync has never happenned before.
 */
LovefieldService.prototype.getLastSyncDate = function() {
  var column = lf.fn.max(this.pd_.date);
  return this.db_.
      select(column).
      from(this.pd_).
      exec().then(function(results) {
        return results.length > 0 ? results[0][column.getName()] : null;
      });
};


/**
 * Registers a listener that fires whenever new perf data is available.
 * @param {!Function} callbackFn
 */
LovefieldService.prototype.whenLastSyncDateChanged = function(callbackFn) {
  var query = this.db_.select(lf.fn.max(this.pd_.date)).from(this.pd_);
  this.db_.observe(query, callbackFn);
};
