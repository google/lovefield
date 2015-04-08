/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
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
var sequentiallyRun = require(pathMod.resolve(
    pathMod.join(__dirname, '/promise_util.js'))).sequentiallyRun;



/**
 * @constructor
 *
 * @param {!WebDriver} driver
 * @param {string} url The URL of the test to be run.
 */
var JsUnitTestRunner = function(driver, url) {
  /** @private {!WebDriver} */
  this.driver_ = driver;

  /** @private {string} */
  this.url_ = url;
};


/**
 * Runs the tests at the given URL.
 * @return {!IThenable<boolean>} Whether the test passed or failed.
 */
JsUnitTestRunner.prototype.run = function() {
  this.driver_.get(this.url_);
  return this.whenTestFinished_().then(
      function() {
        return this.didTestSucceed_();
      }.bind(this)).then(
      function(didSucceed) {
        console.log('[', didSucceed ? 'PASS' : 'FAIL', ']', this.url_);
        return didSucceed;
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
 * @param {!WebDriver} driver
 * @param {!Array<string>} urls The URL of the tests to run.
 *
 * @return {!IThenable}
 */
JsUnitTestRunner.runMany = function(driver, urls) {
  var testFunctions = urls.map(function(url) {
    var runner = new JsUnitTestRunner(driver, url);
    return {
      fn: runner.run.bind(runner),
      name: url
    };
  });

  return sequentiallyRun(testFunctions);
};


/** @type {Function} */
exports.JsUnitTestRunner = JsUnitTestRunner;
