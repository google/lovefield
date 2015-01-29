/**
 * @license
 * Copyright 2014 Google Inc. All Rights Reserved.
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
var gulp = /** @type {{task: function(string, Function)}} */ (require('gulp'));
var pathMod = require('path');
var builder = require(pathMod.resolve(
    pathMod.join(__dirname, 'tools/builder.js'))).builder;
var runTest = require(pathMod.resolve(
    pathMod.join(__dirname, 'tools/run_test.js'))).runTest;
var runTestServer = require(pathMod.resolve(
    pathMod.join(__dirname, 'tools/run_test_server.js'))).runTestServer;


var log = console['log'];


gulp.task('default', function() {
  log('Usage: ');
  log('  gulp build: build Lovefield dist package');
  log('  gulp test <target>: run Lovefield tests');
  log('  gulp debug: start a debug server at port 4000');
});

gulp.task('build', function(callback) {
  builder(callback);
});

gulp.task('test', function(callback) {
  runTest(callback);
});

gulp.task('debug', function() {
  // The test server cannot callback. It is terminated by Ctrl-C.
  runTestServer();
});
