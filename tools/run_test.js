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
var safariMod;
var ieMod = /** @type {{Options: !Function}} */ (
    require('selenium-webdriver/ie'));

var fork = /** @type {!Function} */ (require('child_process').fork);
var glob = /** @type {{sync: !Function}} */ (require('glob'));
var chalk = /** @type {{green: !Function, red: !Function}} */ (
    require('chalk'));
var pathMod = require('path');

var JsUnitTestRunner = /** @type {{runMany: !Function}} */ (
    require('./jsunit_test_runner.js').JsUnitTestRunner);
var webdriver = /** @type {!WebDriver} */ (require('selenium-webdriver'));



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
      log('SPAC tests:', code ? chalk.red('FAILED') : chalk.green('PASSED'));
      resolve();
    });
  });
}


/**
 * Runs tests in a browser context.
 * @param {?string|?Array<string>} testPrefix Only tests that match the prefix
 *     will be returned. If null, all tests will run.
 * @param {string} browser The browser to run the unit tests on.
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
    driver.getSession().then(function() {
      JsUnitTestRunner.runMany(browser, driver, testUrls).then(
          function(results) {
            var res = function() { resolve(results); };
            driver.quit().then(res, res);
          }, reject);
    }, reject);
  });
}


/**
 * Runs JSUnit tests.
 * @param {?string|?Array<string>} testPrefix Only tests that match the prefix
 *     will be returned. If null, all tests will run.
 * @param {string} browser The browser to run the unit tests on.
 * @return {!IThenable}
 */
function runJsUnitTests(testPrefix, browser) {
  return runBrowserTests(testPrefix, browser, 'tests');
}


/**
 * Runs performance regression tests and prints the results in the output.
 * @param {string} browser
 * @return {!IThenable}
 */
function runJsPerfTests(browser) {
  return runBrowserTests('perf', browser, 'perf').then(
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
 * @param {?string|?Array<string>} testPrefix Only tests that match the prefix
 *     will be returned. If null, all tests will run.
 * @return {!Array<string>} A list of all matching testing URLs.
 */
function getTestUrls(testFolder, testPrefix) {
  var prefixes = testPrefix ?
      (typeof(testPrefix) == 'string' ? [testPrefix] : testPrefix) :
      [];
  var positivePatterns = [];
  var negativePatterns = [];
  prefixes.forEach(function(pattern) {
    if (pattern.substring(0, 1) != '-') {
      positivePatterns.push(pattern);
    } else {
      negativePatterns.push(pattern.slice(1));
    }
  });

  var hasPattern = function(fileName, patterns) {
    return patterns.some(function(pattern) {
      return fileName.indexOf(pattern) != -1;
    });
  };

  var relativeTestUrls = glob.sync(testFolder + '/**/*_test.js').map(
      function(fileName) {
        var prefixLength = testFolder.length + 1;
        return fileName.substr(prefixLength);
      }).filter(
      function(fileName) {
        var hasPositivePattern = positivePatterns.length == 0 ||
            hasPattern(fileName, positivePatterns);
        var hasNegativePattern = hasPattern(fileName, negativePatterns);
        return testPrefix == null ? true :
            (hasPositivePattern && !hasNegativePattern);
      }).map(
      function(fileName) {
        return fileName.replace(/\.js$/, '.html');
      });

  return relativeTestUrls.map(
      function(url) {
        return 'http://localhost:8000/html/' + url;
      });
}


/**
 * TODO(arthurhsu): Safari will timeout when called. Need investigation.
 * @param {string} browser
 * @return {!WebDriver}
 */
function getRemoteWebDriver(browser) {
  var builder = /** @type {!WebDriverBuilder} */ (new webdriver.Builder());
  builder.usingServer('http://' +
      process.env['SAUCE_USERNAME'] + ':' + process.env['SAUCE_ACCESS_KEY'] +
      '@ondemand.saucelabs.com:80/wd/hub');
  builder.disableEnvironmentOverrides();

  var caps = {
    'name': browser + ' ' + (process.env['TRAVIS_JOB_NUMBER'] || 'pilot'),
    'username': process.env['SAUCE_USERNAME'],
    'accessKey': process.env['SAUCE_ACCESS_KEY'],
    'tunnelIdentifier': process.env['TRAVIS_JOB_NUMBER'],
    'maxDuration': 3600,
    'loggingPrefs': {
      'browser': 'ALL'
    }
  };
  switch (browser) {
    case 'chrome':
      caps['browserName'] = 'chrome';
      caps['platform'] = 'linux';
      break;

    case 'firefox':
      caps['browserName'] = 'firefox';
      caps['platform'] = 'linux';
      break;

    case 'safari':
      caps['browserName'] = 'safari';
      caps['platform'] = 'OS X 10.11';
      caps['version'] = '9.0';
      break;

    case 'ie':
      caps['browserName'] = 'internet explorer';
      caps['platform'] = 'Windows 7';
      caps['version'] = '11.0';
      break;

    default:
      throw new Error('Unsupported browser');
      break;
  }

  return builder.withCapabilities(caps).build();
}


/**
 * @param {string} browser
 * @return {!WebDriver}
 */
function getWebDriver(browser) {
  if (process.env['SAUCE_USERNAME']) {
    return getRemoteWebDriver(browser);
  }

  var caps = /** @type {!WebDriverCapabilities} */ (
      new webdriver.Capabilities());
  caps.set('browserName', browser);
  caps.set('loggingPrefs', { 'browser': 'ALL' });

  var builder = /** @type {!WebDriverBuilder} */ (new webdriver.Builder());
  builder.disableEnvironmentOverrides();

  if (browser == 'chrome') {
    var chromeOptions = /** @type {!ChromeOptions} */ (
        new chromeMod.Options());
    chromeOptions.addArguments([
      '--user-data-dir=/tmp/selenium_chrome_' + new Date().getTime(),
      '--no-first-run'
    ]);

    return builder.withCapabilities(caps).
        setChromeOptions(chromeOptions).
        build();
  } else if (browser == 'firefox') {
    var firefoxOptions = /** @type {!FirefoxOptions} */ (
        new firefoxMod.Options());
    firefoxOptions.setProfile(new firefoxMod.Profile());
    return builder.withCapabilities(caps).
        setFirefoxOptions(firefoxOptions).
        build();
  } else if (browser == 'safari') {
    if (!safariMod) {
      safariMod = /** @type {{Options: !Function}} */ (
          require('selenium-webdriver/safari'));
    }
    var safariOptions = /** @type {!SafariOptions} */ (new safariMod.Options());
    safariOptions.setCleanSession();
    return builder.withCapabilities(caps).
        setSafariOptions(safariOptions).
        build();
  } else if (browser == 'ie') {
    var ieOptions = /** @type {!IeOptions} */ (new ieMod.Options());
    ieOptions.ensureCleanSession();
    return builder.withCapabilities(caps).
        setIeOptions(ieOptions).
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
