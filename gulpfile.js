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
var nopt = /** @type {!Function} */ (require('nopt'));

var builder = /** @type {{
    buildLib: !Function,
    buildTest: !Function,
    buildAllTests: !Function}} */ (
        require(pathMod.resolve(
            pathMod.join(__dirname, 'tools/builder.js'))));
var runner = /** @type {{
    runJsUnitTests: function(?string, string):!IThenable,
    runSpacTests: function():!IThenable }} */ (
        require(pathMod.resolve(
            pathMod.join(__dirname, 'tools/run_test.js'))));
var runTestServer = require(pathMod.resolve(
    pathMod.join(__dirname, 'tools/run_test_server.js'))).runTestServer;


var log = console['log'];


gulp.task('default', function() {
  log('Usage: ');
  log('  gulp build --target=<target>: build library or tests');
  log('  gulp test --target=<target> --browser=<broswer>: run Lovefield tests');
  log('  gulp debug: start a debug server at port 4000');
});


gulp.task('build', function() {
  var knownOpts = {
    'mode': [String, null],
    'target': [String, null]
  };
  var options = nopt(knownOpts);

  if (options.target == 'all' || options.target == null) {
    // TODO(dpapad): Build also the lib here.
    return builder.buildAllTests();
  } else if (options.target == 'lib') {
    return builder.buildLib(options);
  } else {
    return builder.buildTest(options);
  }
});


gulp.task('debug', function() {
  // The test server cannot callback. It is terminated by Ctrl-C.
  runTestServer();
});


/**
 * TODO(dpapad):
 *  1) Accept command line param to run a specific browser, run all browsers by
 *     default.
 *  2) Gather the output of the tests and display something useful (summary).
 */
gulp.task('test', function(callback) {
  var knownOpts = {
    'browser': [String, null],
    'target': [String, null]
  };
  var options = nopt(knownOpts);
  options.browser = options.browser || 'chrome';

  var whenTestsDone = null;
  if (options.target == null) {
    // Run both SPAC and JSUnit tests, one after the other.
    whenTestsDone = runner.runSpacTests().then(
        function() {
          return runner.runJsUnitTests(null, options.browser);
        });
  } else if (options.target == 'spac') {
    // Run only SPAC.
    whenTestsDone = runner.runSpacTests();
  } else {
    // Run only JSUnit tests.
    whenTestsDone = runner.runJsUnitTests(options.target, options.browser);
  }
  whenTestsDone.then(function() {
    callback();
  });
});
