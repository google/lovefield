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
 * A Serivce used for syncing the local DB with server.
 * @constructor
 *
 * @param {!angular.$http} $http
 * @param {!LovefieldService} LovefieldService
 */
var SyncService = function($http, LovefieldService) {
  this.http_ = $http;
  this.dataFetcher_ = new NetworkDataFetcher(this.http_);
  this.lovefieldService_ = LovefieldService;

  /** @private {?IThenable}*/
  this.whenInitialized_ = null;
};


/** @return {!IThenable} */
SyncService.prototype.init = function() {
  if (this.whenInitialized_ != null) {
    return this.whenInitialized_;
  }

  this.whenInitialized_ = this.init_().then(
      function() {
        console.log('DB synced with server.');
      }.bind(this));

  return this.whenInitialized_;
};


/**
 * Starts the syncing process.
 * @return {!IThenable} A promise that is resolved once syncing with the server
 *     has finished.
 * @private
 */
SyncService.prototype.init_ = function() {
  return this.lovefieldService_.getDbConnection().then(
      function(database) {
        return this.lovefieldService_.getLastSyncDate();
      }.bind(this)).then(
      function(lastSyncDate) {
        return this.dataFetcher_.fetch(lastSyncDate);
      }.bind(this)).then(
      function(data) {
        var testCasesPerSuite = data[0];
        var perfDataRaw = data[1];
        return this.processRawData_(testCasesPerSuite, perfDataRaw);
      }.bind(this));
};


/**
 * @typedef {{
 *     testCaseId: string|number, date: !Date, execTime: number
 * }}
 * @private
 */
SyncService.PerfDataRaw_;


/**
 * @param {!Map<string, !Array<string>>} testCasesPerSuite
 * @param {!Array<!SyncService.PerfDataRaw_>} perfDataRaw
 * @return {!IThenable}
 * @private
 */
SyncService.prototype.processRawData_ = function(
    testCasesPerSuite, perfDataRaw) {
  if (perfDataRaw.length == 0) {
    // No new data exist, nothing to do.
    return Promise.resolve();
  }

  var testCaseToId = new Map();
  var maxAssignedId = 0;

  var promises = [];
  testCasesPerSuite.forEach(function(testCases, testSuite) {
    testCases.forEach(function(testCase) {
      var promise = this.lovefieldService_.getTestCaseId(
          testSuite, testCase).then(
          function(testCaseId) {
            if (testCaseId != null) {
              testCaseToId.set(testSuite + '_' + testCase, testCaseId);
              if (maxAssignedId < testCaseId) {
                maxAssignedId = testCaseId;
              }
            }
            return {
              id: testCaseId,
              testSuiteName: testSuite,
              testCaseName: testCase
            };
          });
      promises.push(promise);
    }, this);
  }, this);

  return Promise.all(promises).then(function(results) {
    var newTestCases = results.filter(function(testCase) {
      return testCase.id == null;
    });

    // Assigning IDs to newly detected test cases.
    newTestCases.forEach(function(testCase) {
      maxAssignedId++;
      testCase.id = maxAssignedId;
      testCaseToId.set(
          testCase.testSuiteName + '_' + testCase.testCaseName, testCase.id);
    });

    perfDataRaw.forEach(function(perfData) {
      perfData.testCaseId = testCaseToId.get(perfData.testCaseId);
    });

    return this.lovefieldService_.insertData(newTestCases, perfDataRaw);
  }.bind(this));
};
