/**
 * @license
 * Copyright 2014 The Lovefield Project Authors. All Rights Reserved.
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
var gulp = /** @type {{
    task: function(string, (!Array|!Function), !Function=),
    src: !Function}} */ (require('gulp'));
var gjslint = /** @type {!Function} */ (require('gulp-gjslint'));
var pathMod = require('path');
var chalk = /** @type {{green: !Function, red: !Function, cyan: !Function}} */ (
    require('chalk'));
var nopt = /** @type {!Function} */ (require('nopt'));

var builder = /** @type {{
    buildLib: !Function,
    buildAllTests: !Function}} */ (
        require(pathMod.resolve(
            pathMod.join(__dirname, 'tools/builder.js'))));
var runner = /** @type {{
    runJsUnitTests: function(?string, string):!IThenable,
    runSpacTests: function():!IThenable,
    runJsPerfTests: function(string=):!IThenable}} */ (
        require(pathMod.resolve(
            pathMod.join(__dirname, 'tools/run_test.js'))));
var testServer = /** @type {{
    runUnitTestServer: function(number):!IThenable,
    runPerfTestServer: function(number):!IThenable,
    stopServer: !Function }} */ (
        require(pathMod.resolve(
            pathMod.join(__dirname, 'tools/run_test_server.js'))));


var log = console['log'];


gulp.task('default', function() {
  log('Usage: ');
  log('  gulp build --target=lib --mode=<opt|debug>:');
  log('      Generate dist/lf.js using Closure compiler.');
  log('  gulp build --target=tests --filter=<pattern>:');
  log('      Compile tests using Closure compiler.');
  log('  gulp debug [--target=<tests|perf>] [--port=<number>]:');
  log('      Start a debug server (default is test at port 8000)');
  log('  gulp lint: Lint against source files');
  log('  gulp test --target=spac: Run SPAC tests');
  log('  gulp test --target=perf [--browser=<target>]:');
  log('      Run perf tests using webdriver (need separate install).');
  log('  gulp test --target=tests [--filter=<pattern> --browser=<target>]:');
  log('      Run unit tests using webdriver (need separate install).');
  log('      Currently, chrome|firefox|ie|safari are valid webdriver targets.');
  log('      Can pass multiple browsers by repeating the --browser flag.');
  log('      Can pass multiple filters by repeating the --filter flag.');
});


gulp.task('lint', function() {
  return gulp.src([
    'perf/**/*.js',
    'spac/**/*.js',
    'src/**/*.js',
    'tests/**/*.js',
    'testing/**/*.js',
  ]).pipe(gjslint()).
      pipe(gjslint['reporter']('console'), {fail: true});
});


gulp.task('build', function() {
  var knownOpts = {
    'filter': [Array, String, null],
    'mode': [String, null],
    'target': [String]
  };
  var options = nopt(knownOpts);

  if (options.target == 'lib') {
    return builder.buildLib(options);
  } else {
    return builder.buildAllTests(options).then(function() {
      log('Everything built');
      process.exit(0);
    });
  }
});


gulp.task('debug', function() {
  var knownOpts = {
    'target': [String, null],
    'port': [Number, null]
  };

  var options = nopt(knownOpts);
  options.target = options.target || 'tests';
  var port = options.port || 8000;

  // The test server cannot callback. It is terminated by Ctrl-C.
  if (options.target == 'perf') {
    testServer.runPerfTestServer(port);
  } else if (options.target != 'spac') {
    testServer.runUnitTestServer(port);
  }
});


gulp.task('test', ['debug'], function() {
  var knownOpts = {
    'browser': [Array, String, null],
    'filter': [Array, String, null],
    'target': [String]
  };
  var options = nopt(knownOpts);
  var browsers = options.browser instanceof Array ?
      options.browser :
      [options.browser || process.env['SELENIUM_BROWSER'] || 'chrome'];
  /** @param {*=} opt_error */
  var finalize = function(opt_error) {
    testServer.stopServer();
    var exitCode = 0;
    if (opt_error) {
      var message = opt_error.message || opt_error.toString();
      log('Error detected:', message);
      exitCode = 1;
    }
    process.exit(exitCode);
  };

  var whenTestsDone = null;
  if (options.target == 'perf') {
    // Run only perf regression tests and dump output in the console.
    whenTestsDone = runner.runJsPerfTests(options.browser).then(
        function(perfData) {
          log(JSON.stringify(perfData, null, 2));
          finalize();
        }, finalize);
  } else if (options.target == 'spac') {
    // Run only SPAC.
    whenTestsDone = runner.runSpacTests();
  } else {
    // Run only JSUnit tests.
    var testBrowser = function(browser) {
      return runner.runJsUnitTests(options.filter, browser).then(
          function(results) {
            var failedCount = results.reduce(function(prev, item) {
              return prev + (item['pass'] ? 0 : 1);
            }, 0);
            log(results.length + ' tests, ' + failedCount + ' failure(s).');
            log('[ ' + chalk.cyan(browser) + ' ] JSUnit tests: ',
                failedCount > 0 ? chalk.red('FAILED') : chalk.green('PASSED'));
            if (failedCount > 0) {
              throw new Error();
            }
          }, finalize);
    };

    var whenBrowsersDone = browsers.map(function(browser) {
      return testBrowser(browser);
    });
    whenTestsDone = Promise.all(whenBrowsersDone).then(
        function() { finalize(); }, finalize);
  }
  return whenTestsDone;
});
