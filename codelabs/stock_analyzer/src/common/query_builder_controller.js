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
 * @param {!angular.Scope} $scope
 * @param {!FetcherService} fetcherService
 * @param {!LovefieldService} lovefieldService
 * @constructor
 */
var QueryBuilderController = function(
    $scope, fetcherService, lovefieldService) {
  this.scope_ = $scope;
  this.lovefieldService_ = lovefieldService;

  this.dropDownList = [];

  this.searchModes = [
    'Stocks',
    'Sectors'
  ];

  this.timeWindows = [
    '5 days',
    '1 month',
    '3 months',
    '6 months',
    'YTD',
    '1 year'
  ];

  fetcherService.init().then(function() {
    this.lovefieldService_.getStockList().then(
        this.populateUi_.bind(this));
  }.bind(this));
};


/**
 * Executes whenever the user changes between stocks/sectors search modes.
 */
QueryBuilderController.prototype.onSearchModeChanged = function() {
  // Clearing the graph.
  var containerEl = document.getElementById('chart-container');
  containerEl.innerHTML = '';
  // Clearing the drop-down selection.
  this.scope_.itemSelection = null;

  var queryPromise = this.scope_.searchMode == 'Sectors' ?
      this.lovefieldService_.getSectorList() :
      this.lovefieldService_.getStockList();
  queryPromise.then(this.populateUi_.bind(this));
};



/**
 * @return {!Array<!Date>} An array of length 2, where position zero holds the
 *     start of the selected time window and position 1 holds the end.
 * @private
 */
QueryBuilderController.prototype.getTimeWindowDates_ = function() {
  var start = new Date();
  var end = new Date();

  switch (this.scope_.timeSelection) {
    case this.timeWindows[0]:  // '5 days'
      start.setDate(end.getDate() - 5);
      break;
    case this.timeWindows[1]:  // '1 month'
      start.setMonth(end.getMonth() - 1);
      break;
    case this.timeWindows[2]:  // '3 months'
      start.setMonth(end.getMonth() - 3);
      break;
    case this.timeWindows[3]:  // '6 months'
      start.setMonth(end.getMonth() - 6);
      break;
    case this.timeWindows[4]:  // 'YTD'
      start = new Date(end.getFullYear(), 0);
      break;
    default:
      start.setFullYear(end.getFullYear() - 1);
      break;
  }

  return [start, end];
};


/**
 * Populates the drop down list with the given query results, pre-selects an
 * item in the drop-down list and plots its data.
 * @param {!Array<!Object>} queryResults
 * @private
 */
QueryBuilderController.prototype.populateUi_ = function(queryResults) {
  this.dropDownList = queryResults.map(
      function(obj) {
        return obj[Object.keys(obj)[0]];
      });

  // Selecting 'GOOG' as the default stock, and 'Technology' as the default
  // industry sector.
  var defaultSelection = this.scope_.searchMode == 'Sectors' ?
      'Technology' : 'GOOG';
  if (this.dropDownList.indexOf(defaultSelection) != -1) {
    this.scope_.itemSelection = defaultSelection;
    this.search();
  }

  this.scope_.$apply();
};


/**
 * Registers DB observers.
 * @private
 */
QueryBuilderController.prototype.startObserving_ = function() {
  // Codelab TODO: Implement this method at codelab step7.
};


/**
 * Searches for data between the specified dates and plots them in a graph.
 */
QueryBuilderController.prototype.search = function() {
  if (this.scope_.itemSelection == null) {
    // No stock/sector has been selected.
    return;
  }

  var timeWindow = this.getTimeWindowDates_();
  if (this.scope_.searchMode == 'Sectors') {
    this.lovefieldService_.getSectorClosingPrices(
        timeWindow[0], timeWindow[1], this.scope_.itemSelection).
        then(this.updateSectorGraph_.bind(this));
  } else {
    // Case where searhMode == 'Stocks'
    this.lovefieldService_.getStockClosingPrices(
        timeWindow[0], timeWindow[1], this.scope_.itemSelection).
        then(this.updateStockGraph_.bind(this));
  }
};


/**
 * Updates the Stock graph with new data.
 * @param {!Array<!Object>} data
 * @private
 */
QueryBuilderController.prototype.updateStockGraph_ = function(data) {
  if (this.scope_.searchMode == 'Stocks') {
    this.getStockGraphPlotter_().draw(data);
  }
};


/**
 * Updates the Sector graph with new data.
 * @param {!Array<!Object>} data
 * @private
 */
QueryBuilderController.prototype.updateSectorGraph_ = function(data) {
  if (this.scope_.searchMode == 'Sectors') {
    this.getSectorGraphPlotter_().draw(data);
  }
};


/**
 * @return {!GraphPlotter} A graph plotter configured to plot industry sector
 *     historical data.
 * @private
 */
QueryBuilderController.prototype.getSectorGraphPlotter_ = function() {
  var focusInfoConfig = [
    {
      label: 'AVG(Close)',
      fn: function(d) {
        return d['HistoricalData']['AVG(Close)'].toFixed(2) + '$';
      }
    },
    {
      label: 'Date',
      fn: function(d) { return d['HistoricalData']['Date'].toDateString(); }
    }
  ];

  return new GraphPlotter(
      function(d) { return d['HistoricalData']['Date']; },
      function(d) { return d['HistoricalData']['AVG(Close)']; },
      focusInfoConfig);
};


/**
 * @return {!GraphPlotter} A graph plotter configured to plot stock historical
 *     data.
 * @private
 */
QueryBuilderController.prototype.getStockGraphPlotter_ = function() {
  var focusInfoConfig = [
    {label: 'Open', fn: function(d) { return d['Open'].toFixed(2) + '$'; }},
    {label: 'Close', fn: function(d) { return d['Close'].toFixed(2) + '$'; }},
    {label: 'High', fn: function(d) { return d['High'].toFixed(2) + '$'; }},
    {label: 'Low', fn: function(d) { return d['Low'].toFixed(2) + '$'; }},
    {label: 'Volume', fn: function(d) { return d['Volume']; }},
    {label: 'Date', fn: function(d) { return d['Date'].toDateString(); }}
  ];

  return new GraphPlotter(
      function(d) { return d['Date']; },
      function(d) { return d['Close']; },
      focusInfoConfig);
};
