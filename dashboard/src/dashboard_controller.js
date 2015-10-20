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
 * @param {!SyncService} syncService
 * @param {!LovefieldService} lovefieldService
 * @constructor
 */
var DashboardController = function($scope, syncService, lovefieldService) {
  this.scope_ = $scope;
  this.lovefieldService_ = lovefieldService;

  this.testSuites = [];
  this.logger = console['log'].bind(console);

  this.lovefieldService_.getDbConnection().then(function() {
    // Draw initially with data from the database.
    this.redraw_();

    // Get notified when new data has been synced.
    this.lovefieldService_.whenLastSyncDateChanged(function() {
      this.logger('New data found, redrawing...');
      this.redraw_();
    }.bind(this));

    // Spawn server sync.
    this.logger('Syncing with server...');
    syncService.init();

  }.bind(this));

  this.viewMap_ = buildViewMap();
};


/**
 * Re-draws the entire dashboard.
 * @private
 */
DashboardController.prototype.redraw_ = function() {
  this.lovefieldService_.getTestSuiteList().then(function(results) {
    this.testSuites = results;
    this.scope_.$apply();

    this.drawGeoMean_();

    // Draw all views (test suites).
    this.testSuites.forEach(function(testSuite) {
      this.drawView_(this.viewMap_.get(testSuite));
    }, this);
  }.bind(this));
};


/**
 * Draws the graphs for a given view (test suite).
 * @param {!Object} view
 * @private
 */
DashboardController.prototype.drawView_ = function(view) {
  var sectionEl = document.getElementById(view.name);

  view.graphs.forEach(function(graph, index) {
    var containerEl = sectionEl.getElementsByClassName(
        'graph-container')[index];
    this.drawGraph_(view.name, graph, containerEl);
  }, this);
};


/**
 * Draws a given graph.
 * @param {string} testSuiteName
 * @param {!Object} graph
 * @param {!HTMLElement} containerEl
 * @return {!IThenable}
 * @private
 */
DashboardController.prototype.drawGraph_ = function(
    testSuiteName, graph, containerEl) {
  DashboardController.clearSvg_(containerEl);
  var promises = graph.curves.map(
      function(curveName) {
        return this.lovefieldService_.getTestCaseDataByName(
            testSuiteName, curveName);
      }, this);

  var focusInfoConfig = [
    {
      label: 'execTime',
      fn: function(d) { return d['execTime'] + 'ms'; }
    },
    {
      label: 'date',
      fn: function(d) {
        return d['date'].toLocaleDateString();
      }
    }
  ];

  return Promise.all(promises).then(function(results) {
    var graphPlotter = new GraphPlotter(containerEl, focusInfoConfig);
    var getXValue = function(d) { return d['date']; };
    var getYValue = function(d) { return d['execTime']; };
    results.forEach(function(result, index) {
      var curve = new Curve(
          graph.curves[index], result, getXValue, getYValue);
      graphPlotter.addCurve(curve);
    });

    graphPlotter.draw();
  });
};


/**
 * Draws the geometric mean graph.
 * @private
 */
DashboardController.prototype.drawGeoMean_ = function() {
  var containerEl = document.getElementById('geometric-mean');
  DashboardController.clearSvg_(containerEl);

  var focusInfoConfig = [
    {
      label: 'date',
      fn: function(d) {
        return d['date'].toLocaleDateString();
      }
    },
    {
      label: 'geomean',
      fn: function(d) {
        return d['GEOMEAN(execTime)'].toFixed(2);
      }
    }
  ];
  var graphPlotter = new GraphPlotter(containerEl, focusInfoConfig);

  this.lovefieldService_.getGeoMeanData().then(function(results) {
    if (results.length == 0) {
      // No data exist in the database yet, do nothing.
      return;
    }
    var curve = new Curve(
        'Daily Geometric Mean', results,
        function(d) { return d['date']; },
        function(d) { return d['GEOMEAN(execTime)']; });
    graphPlotter.addCurve(curve);
    graphPlotter.draw();
  }.bind(this));
};


/**
 * Removes the first SVG found in the given container from the document.
 * @param {!HTMLElement} containerEl
 * @private
 */
DashboardController.clearSvg_ = function(containerEl) {
  var previousSvg = containerEl.getElementsByTagName('svg')[0];
  if (previousSvg) {
    previousSvg.remove();
  }
};
