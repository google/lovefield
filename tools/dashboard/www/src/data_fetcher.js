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
 * A list of all TestSuites. They are hardcoded since the server currently does
 * not provide a way to retrieve that list at runtime.
 * @type {!Array<string>}
 */
var testSuiteNames = [
  'Full_table_SCUD',
  'Full_table_SCUD_Mem',
  'Loading_Empty_DB',
  'Loading_Populated_DB',
  'PK-based_SCUD',
  'PK-based_SCUD_Mem',
  'SelectBenchmark',
  'SelectBenchmark_Mem',
  'Scenario_Simulations',
  'ForeignKeysBenchmark'
];



/**
 * A class responsible for making network requests to the server.
 * @constructor
 *
 * @param {!angular.$http} $http
 */
var NetworkDataFetcher = function($http) {
  /** @private {!angular.$http} */
  this.http_ = $http;

  /** @private {string} */
  this.template_ = 'https://script.google.com/macros/s/' +
      'AKfycbxhuYjUkUTRNRSzsck-M7ktyzZVGg5sZEjxxoBaAS1LYSOYmnbs/exec?req={q}';

  /**
   * A mapping between TestSuites and TestCases. A TestSuite is composed of
   * multiple TestCases. It is updated every time a network request is made.
   * @private {!Map<string, !Array<string>>}
   */
  this.testCasesPerSuite_ = new Map();
};


/**
 * Fetches all data from the network and does some post-processing.
 * @param {?Date} lastSyncDate
 * @return  {!Array}
 */
NetworkDataFetcher.prototype.fetch = function(lastSyncDate) {
  return this.fetchPerfData_(lastSyncDate).then(function(perfData) {
    return [this.testCasesPerSuite_, perfData];
  }.bind(this));
};


/**
 * @param {?Date} lastSyncDate
 * @return {!IThenable<!Array<!Object>>}
 * @private
 */
NetworkDataFetcher.prototype.fetchPerfData_ = function(lastSyncDate) {
  var promises = testSuiteNames.map(
      function(testSuiteName) {
        return this.fetchPerfDataForTestSuite_(testSuiteName, lastSyncDate);
      }, this);

  return Promise.all(promises).then(
      function(rowsPerTestSuite) {
        var result = [];
        rowsPerTestSuite.forEach(function(rows) {
          result.push.apply(result, rows);
        });
        return result;
      }.bind(this));
};


/**
 * @param {string} testSuite
 * @param {?Date} lastSyncDate
 * @return {!IThenable<!Array<!Object>>}
 * @private
 */
NetworkDataFetcher.prototype.fetchPerfDataForTestSuite_ = function(
    testSuite, lastSyncDate) {
  var requestParams = null;
  if (lastSyncDate == null) {
    requestParams = {
      'name': [testSuite],
      'days': 14
    };
  } else {
    requestParams = {
      'name': [testSuite],
      'since': NetworkDataFetcher.formatDate_(lastSyncDate)
    };
  }

  var url = this.template_.replace('{q}', JSON.stringify(requestParams));
  return this.http_.get(url).then(
      function(result) {
        return this.parsePerfDataForTestSuite_(
            testSuite, result.data[testSuite]);
      }.bind(this));
};


/**
 * @param {string} testSuite
 * @param {!Array} data The data as fetched from the network.
 * @return {!Array<!Object>} An array of perf data.
 * @private
 */
NetworkDataFetcher.prototype.parsePerfDataForTestSuite_ = function(
    testSuite, data) {
  var testCases = data[0].slice(1);
  // TODO(dpapad): Consider generating this later.
  this.testCasesPerSuite_.set(testSuite, testCases);

  var perfData = data.slice(1);

  var parsedData = [];
  testCases.forEach(function(testCase, index) {
    var testCase = testCases[index];
    for (var i = 0; i < perfData.length; i++) {
      var execTime = perfData[i][index + 1];
      var date = NetworkDataFetcher.parseDate_(perfData[i][0]);
      parsedData.push({
        testCaseId: testSuite + '_' + testCase,
        date: date,
        execTime: execTime
      });
    }
  });

  return parsedData;
};


/**
 * @param {string} dateString The date string as returned from the server,
 * expected to be in the form 'YYYYMMDD'.
 * @return {!Date} The parsed date.
 * @private
 */
NetworkDataFetcher.parseDate_ = function(dateString) {
  return new Date(
      dateString.substring(0, 4) + '-' +
      dateString.substring(4, 6) + '-' +
      dateString.substring(6));
};


/**
 * @param {!Date} date
 * @return {string} The date formatted in a string that looks as follows
 *     'YYYYMMDD'.
 * @private
 */
NetworkDataFetcher.formatDate_ = function(date) {
  var isoString = date.toISOString();
  return isoString.substring(0, 4) + isoString.substring(5, 7) +
      isoString.substring(8, 10);
};
