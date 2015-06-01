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



var StockSymbols = [
  'AAPL',
  'GM',
  'GOOG',
  'MSFT',
  'NKE',
  'RL',
  'TM',
  'TSLA',
  'TWTR',
  'UA'
];


var StockInfoData = [
  {
    CompanyName: 'Apple Inc.',
    Sector: 'Technology',
    Stock: 'AAPL'
  },
  {
    CompanyName: 'Google Inc.',
    Sector: 'Technology',
    Stock: 'GOOG'
  },
  {
    CompanyName: 'Microsoft Corporation',
    Sector: 'Technology',
    Stock: 'MSFT'
  },
  {
    CompanyName: 'Nike Inc.',
    Sector: 'Consumer Goods',
    Stock: 'NKE'
  },
  {
    CompanyName: 'Ralph Lauren Corp.',
    Sector: 'Consumer Goods',
    Stock: 'RL'
  },
  {
    CompanyName: 'Tesla Motors Inc.',
    Sector: 'Auto Manufacturers',
    Stock: 'TSLA'
  },
  {
    CompanyName: 'General Motors Company',
    Sector: 'Auto Manufacturers',
    Stock: 'GM'
  },
  {
    CompanyName: 'Toyota Motor Corp.',
    Sector: 'Auto Manufacturers',
    Stock: 'TM'
  },
  {
    CompanyName: 'Twitter Inc.',
    Sector: 'Technology',
    Stock: 'TWTR'
  },
  {
    CompanyName: 'Under Armour Inc.',
    Sector: 'Consumer Goods',
    Stock: 'UA'
  }
];



/**
 * Fetches stock data by querying the Google Finance API (requires network
 * connection).
 * @constructor
 *
 * @param {!angular.$http} $http
 */
var NetworkDataFetcher = function($http) {
  /** @private {!angular.$http} */
  this.http_ = $http;

  /** @private {string} */
  this.template_ = 'https://www.google.com/finance/historical' +
      '?q={q}&authuser=0&output=csv';
};


/** @override */
NetworkDataFetcher.prototype.fetchHistoricalData = function() {
  var promises = StockSymbols.map(this.fetchHistoricalDataForStock_, this);
  return Promise.all(promises).then(
      function(rowsPerStock) {
        var result = [];
        rowsPerStock.forEach(function(rows) {
          result.push.apply(result, rows);
        });
        return result;
      });
};


/** @override */
NetworkDataFetcher.prototype.fetchStockInfo = function() {
  return Promise.resolve(StockInfoData);
};


/**
 * @param {string} stockCode
 * @return {!IThenable<!Array<!Object>>}
 * @private
 */
NetworkDataFetcher.prototype.fetchHistoricalDataForStock_ = function(
    stockCode) {
  var url = this.template_.replace('{q}', stockCode);
  return this.http_.get(url).then(
      function(result) {
        return this.csvToObject_(result.data).map(
            function(obj) {
              obj.Stock = stockCode;
              obj.Date = this.parseDate_(obj.Date);
              return obj;
            }, this);
      }.bind(this));
};


/**
 * @param {string} dateString The date string as returned from the server.
 * @return {!Date} The parsed date.
 * @private
 */
NetworkDataFetcher.prototype.parseDate_ = function(dateString) {
  var tokens = dateString.split('-');
  return new Date(tokens[0] + '/' + tokens[1] + '/20' + tokens[2]);
};


/**
 * @param {string} csvString
 * @return {!Array<!Object>}
 * @private
 */
NetworkDataFetcher.prototype.csvToObject_ = function(csvString) {
  var lines = csvString.split('\n');
  var headerLine = lines[0];
  var fields = headerLine.split(',');

  var objects = [];
  for (var i = 1; i < lines.length; i++) {
    var line = lines[i];

    // The csvString that comes from the server has an empty line at the end,
    // need to ignore it.
    if (line.length == 0) {
      continue;
    }

    var values = line.split(',');
    var obj = {};
    fields.forEach(function(field, index) {
      if (field == 'Date') {
        obj[field] = values[index];
      } else {
        obj[field] = parseFloat(values[index]);
      }
    });
    objects.push(obj);
  }

  return objects;
};



/**
 * Fetches stock data by querying local disk (no network connection required).
 * The data must have been fetched before-hand with the prefetch_data.js nodejs
 * script.
 * @constructor
 *
 * @param {!angular.$http} $http
 */
var LocalDataFetcher = function($http) {
  /** @private {!angular.$http} */
  this.http_ = $http;

  /** @private {string} */
  this.template_ = '../../data/{q}.json';
};


/** @override */
LocalDataFetcher.prototype.fetchHistoricalData = function() {
  var promises = StockSymbols.map(this.fetchHistoricalDataForStock_, this);
  return Promise.all(promises).then(
      function(rowsPerStock) {
        var result = [];
        rowsPerStock.forEach(function(rows) {
          result.push.apply(result, rows);
        });
        return result;
      });
};


/** @override */
LocalDataFetcher.prototype.fetchStockInfo = function() {
  return Promise.resolve(StockInfoData);
};


/**
 * @param {string} stockCode
 * @return {!IThenable<!Array<!Object>>}
 * @private
 */
LocalDataFetcher.prototype.fetchHistoricalDataForStock_ = function(stockCode) {
  var url = this.template_.replace('{q}', stockCode);
  return this.http_.get(url).then(
      function(result) {
        return result.data.map(function(obj) {
          obj.Stock = stockCode;
          obj.Date = new Date(obj.Date);
          return obj;
        });
      });
};
