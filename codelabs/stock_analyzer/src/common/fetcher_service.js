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
 * A Serivce used for populating the DB with real-world data.
 * @constructor
 *
 * @param {!angular.$http} $http
 * @param {!LovefieldService} LovefieldService
 */
var FetcherService = function($http, LovefieldService) {
  this.http_ = $http;
  this.dataFetcher_ = new NetworkDataFetcher(this.http_);
  this.lovefieldService_ = LovefieldService;

  this.db_ = null;

  // Populate DB with data.
  this.whenInitialized_ = this.init_().then(
      function() {
        console.log('DB populated with data.');
      }.bind(this));
};


/**
 * Ensures that database is populated with data.
 * @return {!IThenable}
 * @private
 */
FetcherService.prototype.init_ = function() {
  return this.lovefieldService_.getDbConnection().then(
      function(database) {
        // This is necessary for the app to run with no errors while codelab
        // step1 has not been implemented yet.
        if (database == null) {
          return true;
        }

        this.db_ = database;
        window.db = database;

        return this.checkForExistingData_();
      }.bind(this)).then((
      function(dataExist) {
        return dataExist ? Promise.resolve() : this.insertData_();
      }).bind(this));
};


/**
 * Ensures that database is populated with data (re-entrant).
 * @return {!IThenable}
 */
FetcherService.prototype.init = function() {
  return this.whenInitialized_;
};


/**
 * Checks if any data exists already in the DB.
 * @return {boolean}
 * @private
 */
FetcherService.prototype.checkForExistingData_ = function() {
  var historicalData = this.db_.getSchema().table('HistoricalData');
  return this.db_.select().from(historicalData).exec().then(
      function(rows) {
        return rows.length > 0;
      });
};


/**
 * Fetches the data from an external source and inserts it to the DB.
 * @return {!IThenable}
 * @private
 */
FetcherService.prototype.insertData_ = function() {
  return Promise.all([
    this.dataFetcher_.fetchHistoricalData(),
    this.dataFetcher_.fetchStockInfo()
  ]).then(
      function(rawData) {
        var historicalDataRaw = rawData[0];
        var stockInfoRaw = rawData[1];
        return this.lovefieldService_.insertData(
            historicalDataRaw, stockInfoRaw);
      }.bind(this));
};
