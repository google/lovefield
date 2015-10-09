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
var pathMod = require('path');
var chalk =
    /**
     * @type {{
     *   cyan: !Function,
     *   green: !Function,
     *   red: !Function,
     *   yellow: !Function
     * }}
     */ (require('chalk'));
var sequentiallyRun = require(pathMod.resolve(
    pathMod.join(__dirname, '/promise_util.js'))).sequentiallyRun;
var webdriver = /** @type {!WebDriver} */ (require('selenium-webdriver'));

var log = console['log'].bind(console);



/**
 * @constructor
 *
 * @param {string} name
 * @param {!WebDriver} driver
 * @param {string} url The URL of the test to be run.
 */
var JsUnitTestRunner = function(name, driver, url) {
  /** @private {string} */
  this.name_ = name;

  /** @private {!WebDriver} */
  this.driver_ = driver;

  /** @private {string} */
  this.url_ = url;
};


/**
 * @typedef {{
 *   pass: boolean,
 *   results: ?Array
 * }}
 * @private
 */
JsUnitTestRunner.Result_;


/**
 * Runs the tests at the given URL.
 * @return {!IThenable<!JsUnitTestRunner.Result_>} The result.
 */
JsUnitTestRunner.prototype.run = function() {
  var result = {
    pass: false,
    results: null
  };

  this.driver_.get(this.url_);
  return this.whenTestFinished_().then(function() {
    return this.didTestSucceed_();
  }.bind(this)).then(function(didSucceed) {
    result.pass = didSucceed;
    var parts = this.url_.split('/');
    var testName = parts[parts.length - 2] + '/' + parts[parts.length - 1];
    log('[',
        didSucceed ? chalk.green('PASS') : chalk.red('FAIL'),
        ']',
        '[',
        chalk.cyan(this.name_),
        ']',
        testName);
    return didSucceed ? this.extractResult_() : this.extractLog_();
  }.bind(this)).then(function(results) {
    result.results = results;
    return result;
  }.bind(this));
};


/**
 * @typedef {{
 *   getReport: !function(): string,
 *   isFinished: !function(): boolean
 * }}
 * @private
 */
var GTestRunner_;


/**
 * @return {!IThenable<boolean>} Whether the test passed or failed. Should be
 * called only after tests have finished running.
 * @private
 */
JsUnitTestRunner.prototype.didTestSucceed_ = function() {
  return this.driver_.executeScript(
      function() {
        return /** @type {!GTestRunner_} */ (
            window['G_testRunner']).getReport();
      }).then(
      function(report) {
        return report.indexOf('FAILED') == -1;
      });
};


/**
 * @return {!Array} An array holding the results.
 * @private
 */
JsUnitTestRunner.prototype.extractResult_ = function() {
  return this.driver_.executeScript(
      function() {
        // The JsUnit test should have pushed all results to the
        // 'overallResults' array, if interested in exporting any results.
        return window['overallResults'] || null;
      });
};


/**
 * @return {!IThenable}
 * @private
 */
JsUnitTestRunner.prototype.extractLog_ = function() {
  var logger = new webdriver.WebDriver.Logs(this.driver_);
  return logger.get('browser').then(function(entries) {
    log('============ WebDriver [' + this.name_ + '] log ============');
    entries.forEach(function(entry) {
      var title = entry['level']['name'];
      switch (title) {
        case 'SEVERE':
        case 'ERROR':
          title = chalk.red(title);
          break;
        case 'WARNING':
          title = chalk.yellow(title);
          break;
        default:
          break;
      }
      log('[' + title + '] ', entry.message);
    });
    log('===============================================');
  });
};


/**
 * @return {!IThenable} A promise firing when all the tests have finished
 *     running.
 * @private
 */
JsUnitTestRunner.prototype.whenTestFinished_ = function() {
  var didTestFinish = function() {
    return this.driver_.executeScript(
        function() {
          return window['G_testRunner'] && window['G_testRunner'].isFinished();
        });
  }.bind(this);

  return new Promise(function(resolve, reject) {
    var timer;
    var recurse = function() {
      didTestFinish().then(function(finished) {
        if (finished) {
          clearInterval(timer);
          resolve();
        }
      });
    }.bind(this);
    timer = setInterval(recurse, 1000);
  });
};


/**
 * @param {string} name
 * @param {!WebDriver} driver
 * @param {!Array<string>} urls The URL of the tests to run.
 *
 * @return {!IThenable}
 */
JsUnitTestRunner.runMany = function(name, driver, urls) {
  var testFunctions = urls.map(function(url) {
    var runner = new JsUnitTestRunner(name, driver, url);
    return {
      fn: runner.run.bind(runner),
      name: url
    };
  });

  return sequentiallyRun(testFunctions);
};


/** @type {Function} */
exports.JsUnitTestRunner = JsUnitTestRunner;
