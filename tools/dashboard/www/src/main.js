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
var app = {
  // Application Constructor
  initialize: function() {
    this.bindEvents();
  },

  // Bind Event Listeners
  // Bind any events that are required on startup. Common events are:
  // 'load', 'deviceready', 'offline', and 'online'.
  bindEvents: function() {
    document.addEventListener('deviceready', this.onDeviceReady, false);
  },

  onDeviceReady: function() {
    var app = angular.module('lovefield-dashboard', []);
    app.service('LovefieldService', LovefieldService);
    app.service('SyncService', SyncService);
    app.controller(
        'DashboardController',
        ['$scope', 'SyncService', 'LovefieldService', DashboardController]);
  }
};

// TODO(dpapad): Figure out why deviceready event is not firing, also figure out
// how to make it work for both Web and Android without calling onDeviceReady
// explicitly.
//app.initialize();
app.onDeviceReady();
