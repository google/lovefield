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
 * Runs JSUnit tests.
 * @param {?string} testPrefix Only tests that match the prefix will be
 *     returned. If null, all tests will run.
 * @param {string} browser The browser to run the unit tests on. Must be one of
 *     'chrome' or 'firefox'.
 * @return {!IThenable}
 */
function runJsUnitTests(testPrefix, browser) {
  /**
   * @return {!Array<string>} A list of all matching testing URLs.
   */
  var getTestUrls = function() {
    var relativeTestUrls = glob.sync('tests/**/*_test.js').map(
        function(filename) {
          var prefixLength = 'tests/'.length;
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
  };


  /** @return {!WebDriver} */
  var getWebDriver = function() {
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
  };

  var testUrls = getTestUrls();
  log('Found', testUrls.length, 'JsUnit tests. Running...');
  var driver = getWebDriver();

  return new Promise(function(resolve, reject) {
    var startupWaitInterval = 8 * 1000;
    console.log(
        'Waiting', startupWaitInterval,
        'ms for the browser to get ready.');
    setTimeout(function() {
      /** @type {{runMany: !Function}} */ (
          JsUnitTestRunner).runMany(driver, testUrls).then(
          function() {
            driver.quit();
            resolve();
          }, reject);
    }, startupWaitInterval);
  });
}


/** @type {!Function} */
exports.runSpacTests = runSpacTests;


/** @type {!Function} */
exports.runJsUnitTests = runJsUnitTests;
