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
var chromeMod = /** @type {{Options: !Function}} */ (
    require('selenium-webdriver/chrome'));
var firefoxMod = /** @type {{Profile: !Function, Options: !Function}} */ (
    require('selenium-webdriver/firefox'));
var fork = /** @type {!Function} */ (require('child_process').fork);
var glob = /** @type {{sync: !Function}} */ (require('glob'));
var pathMod = require('path');

var JsUnitTestRunner = require('./jsunit_test_runner.js').JsUnitTestRunner;
var webdriver = /** @type {{Capabilities: !Function, Builder: !Function}} */ (
    require('selenium-webdriver'));
var EXCLUDE_TESTS = require('./setup_tests.js').EXCLUDE_TESTS;



// Need to trick the presubmit script to not complain.
var log = console['log'];


/**
 * Runs SPAC tests.
 * @return {!IThenable}
 */
function runSpacTests() {
  log('Starting SPAC tests ...');
  return new Promise(function(resolve, reject) {
    var spacPath = pathMod.join(
        pathMod.resolve(__dirname), '../spac/run_test.js');
    var spacTest = fork(spacPath);
    spacTest.on('close', function(code) {
      log('SPAC tests:', code ? 'FAILED' : 'PASSED');
      resolve();
    });
  });
}


/**
 * Runs tests in a browser context.
 * @param {?string} testPrefix Only tests that match the prefix will be
 *     returned. If null, all tests will run.
 * @param {string} browser The browser to run the unit tests on. Must be one of
 *     'chrome' or 'firefox'.
 * @param {string} testsFolder The tests that contains all the test to be run.
 * @return {!IThenable}
 */
function runBrowserTests(testPrefix, browser, testsFolder) {
  var testUrls = getTestUrls(testsFolder, testPrefix);
  if (testUrls.length == 0) {
    return Promise.reject(
        new Error('Did not find any tests for prefix ' + testPrefix));
  }

  log('Found', testUrls.length, 'tests. Running...');
  var driver = getWebDriver(browser);

  return new Promise(function(resolve, reject) {
    var startupWaitInterval = 8 * 1000;
    log(
        'Waiting', startupWaitInterval,
        'ms for the browser to get ready.');
    setTimeout(function() {
      /** @type {{runMany: !Function}} */ (
          JsUnitTestRunner).runMany(driver, testUrls).then(
          function(results) {
            driver.quit();
            resolve(results);
          }, reject);
    }, startupWaitInterval);
  });
}


/**
 * Runs JSUnit tests.
 * @param {?string} testPrefix Only tests that match the prefix will be
 *     returned. If null, all tests will run.
 * @param {string} browser The browser to run the unit tests on. Must be one of
 *     'chrome' or 'firefox'.
 * @return {!IThenable}
 */
function runJsUnitTests(testPrefix, browser) {
  return runBrowserTests(testPrefix, browser, 'tests');
}


/**
 * Runs performance regression tests and prints the results in the output.
 * @return {!IThenable}
 */
function runJsPerfTests() {
  return runBrowserTests('perf', 'chrome', 'perf').then(
      /**
       * @param {!Array<{results: !Array}>} totalResults
       */
      function(totalResults) {
        var perfData = [];
        totalResults.forEach(function(testResults) {
          perfData.push.apply(perfData, testResults.results);
        });

        return perfData;
      });
}


/**
 * @param {string} testFolder The folder where the tests reside.
 * @param {?string} testPrefix Only tests that match the prefix will be
 *     returned. If null, all tests will run.
 * @return {!Array<string>} A list of all matching testing URLs.
 */
function getTestUrls(testFolder, testPrefix) {
  var relativeTestUrls = glob.sync(testFolder + '/**/*_test.js').filter(
      function(filename) {
        return EXCLUDE_TESTS.indexOf(filename) == -1;
      }).map(
      function(filename) {
        var prefixLength = testFolder.length + 1;
        return filename.substr(prefixLength);
      }).filter(
      function(filename) {
        return testPrefix == null ?
            true : (filename.indexOf(testPrefix) != -1);
      }).map(
      function(filename) {
        return filename.replace(/\.js$/, '.html');
      });

  return relativeTestUrls.map(
      function(url) {
        return 'http://localhost:8000/html/' + url;
      });
}


/**
 * @param {string} browser
 * @return {!WebDriver}
 */
function getWebDriver(browser) {
  var capabilities = /** @type {!WebDriverCapabilities} */ (
      new webdriver.Capabilities());
  capabilities.set('browserName', browser);

  if (browser == 'chrome') {
    var chromeOptions = /** @type {!ChromeOptions} */ (
        new chromeMod.Options());
    chromeOptions.addArguments([
      '--user-data-dir=/tmp/selenium_chrome_' + new Date().getTime(),
      '--no-first-run'
    ]);

    return /** @type {!WebDriverBuilder} */ (new webdriver.Builder()).
        withCapabilities(capabilities).
        setChromeOptions(chromeOptions).
        build();
  } else if (browser == 'firefox') {
    var firefoxOptions = /** @type {!FirefoxOptions} */ (
        new firefoxMod.Options());
    firefoxOptions.setProfile(new firefoxMod.Profile());
    return /** @type {!WebDriverBuilder} */ (new webdriver.Builder()).
        withCapabilities(capabilities).
        setFirefoxOptions(firefoxOptions).
        build();
  } else {
    throw new Error('Unknown browser:', browser);
  }
}


/** @type {!Function} */
exports.runSpacTests = runSpacTests;


/** @type {!Function} */
exports.runJsUnitTests = runJsUnitTests;


/** @type {!Function} */
exports.runJsPerfTests = runJsPerfTests;
