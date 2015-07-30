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
goog.provide('lf.testing.perf.BenchmarkRunner');

goog.require('goog.Promise');
goog.require('lf.structs.map');
goog.require('lf.testing.util');



/**
 * Helper class for executing asynchronous tests in the given order, and storing
 * the results.
 * @param {string} name Name of the benchmark.
 * @param {!function(): !IThenable=} opt_setUp The set up function to be invoked
 *     before each run.
 * @param {!function(): !IThenable=} opt_tearDown The tear down function to be
 *     invoked after each run.
 * @struct
 * @constructor
 */
lf.testing.perf.BenchmarkRunner = function(name, opt_setUp, opt_tearDown) {
  /** @private {string} */
  this.name_ = name;

  /** @private {!lf.structs.Map<string, !Array<number>>} */
  this.results_ = lf.structs.map.create();

  /** @private {!Array<!lf.testing.perf.TestCase>} */
  this.tests_ = [];

  /** @private {!function(): !IThenable} */
  this.setUp_ = opt_setUp || goog.Promise.resolve;

  /** @private {!function(): !IThenable} */
  this.tearDown_ = opt_tearDown || goog.Promise.resolve;

  /** @private {!lf.testing.perf.BenchmarkRunner.LogLevel} */
  this.logLevel_ = lf.testing.perf.BenchmarkRunner.LogLevel.INFO;

  /** @private {number} */
  this.currentRepetition_ = 0;
};


/**
 * @typedef {{
 *   name: string,
 *   data: !Object
 * }}
 */
lf.testing.perf.BenchmarkRunner.Results;


/**
 * @enum {number}
 */
lf.testing.perf.BenchmarkRunner.LogLevel = {
  ERROR: 3,
  WARNING: 2,
  INFO: 1,
  FINE: 0
};


/** @param {!lf.testing.perf.Benchmark} benchmark */
lf.testing.perf.BenchmarkRunner.prototype.schedule = function(benchmark) {
  this.tests_.push.apply(this.tests_, benchmark.getTestCases());
};


/**
 * @param {number=} opt_repetitions Repeitions of test set, default to 1.
 * @return {!IThenable<!lf.testing.perf.BenchmarkRunner.Results>} The results.
 */
lf.testing.perf.BenchmarkRunner.prototype.run = function(opt_repetitions) {
  var loopCount = opt_repetitions || 1;
  var functions = [];
  for (var i = 0; i < loopCount; ++i) {
    functions.push(goog.bind(this.runTests_, this));
  }
  return lf.testing.util.sequentiallyRun(functions).then(goog.bind(function() {
    var data = this.getResults();
    this.info_('RESULT: ' + JSON.stringify(data));
    this.fine_('RESULT: ' + JSON.stringify(data, null, 2));
    return data;
  }, this));
};


/** @return {!lf.testing.perf.BenchmarkRunner.Results} */
lf.testing.perf.BenchmarkRunner.prototype.getResults = function() {
  var result = {};
  this.tests_.forEach(function(test) {
    if (test.skipRecording) {
      return;
    }
    var durations = this.results_.get(test.name) || [];
    if (durations.length > 0) {
      var sum = durations.reduce(function(a, b) { return a + b; }, 0);
      result[test.name] = Number(sum / durations.length).toFixed(3).toString();
    } else {
      result[test.name] = 'unavailable';
    }
  }, this);
  return {
    'name': this.name_,
    'data': result
  };
};


/**
 * Logs any arguments passed to it.
 * @param {!lf.testing.perf.BenchmarkRunner.LogLevel} logLevel
 * @param {...*} var_args Items to be logged.
 * @private
 */
lf.testing.perf.BenchmarkRunner.prototype.log_ = function(logLevel, var_args) {
  if (logLevel < this.logLevel_) {
    return;
  }

  // Cheat linter.
  var con = goog.global.console;
  var args = Array.prototype.slice.call(arguments, 1);
  con.log.apply(con, args);
};


/**
 * @param {...*} var_args Items to be logged.
 * @private
 */
lf.testing.perf.BenchmarkRunner.prototype.info_ = function(var_args) {
  var args = Array.prototype.slice.call(arguments, 0);
  this.log_.apply(
      this, [lf.testing.perf.BenchmarkRunner.LogLevel.INFO].concat(args));
};


/**
 * @param {...*} var_args Items to be logged.
 * @private
 */
lf.testing.perf.BenchmarkRunner.prototype.fine_ = function(var_args) {
  var args = Array.prototype.slice.call(arguments, 0);
  this.log_.apply(
      this, [lf.testing.perf.BenchmarkRunner.LogLevel.FINE].concat(args));
};


/**
 * @return {!IThenable}
 * @private
 */
lf.testing.perf.BenchmarkRunner.prototype.runTests_ = function() {
  this.currentRepetition_++;
  this.fine_('REPETITION:', this.currentRepetition_);
  var functions = [this.setUp_];
  this.tests_.forEach(function(test) {
    functions.push(goog.bind(this.runOneTest_, this, test));
  }, this);
  functions.push(this.tearDown_);
  return lf.testing.util.sequentiallyRun(functions);
};


/**
 * Runs a single test, time it, and validate the test result.
 * @param {!lf.testing.perf.TestCase} test The test to be executed.
 * @return {!IThenable}
 * @private
 */
lf.testing.perf.BenchmarkRunner.prototype.runOneTest_ = function(test) {
  this.fine_('\n----------Running', test.name, '------------');
  var start = goog.global.performance.now();
  var duration = null;
  return test.tester().then(goog.bind(function(result) {
    var end = goog.global.performance.now();
    duration = end - start;
    if (!test.skipRecording) {
      var timeData = this.results_.get(test.name) || [];
      timeData.push(duration);
      this.results_.set(test.name, timeData);
    }

    // Performing validation only on the first repetition.
    return this.currentRepetition_ > 1 ?
        goog.Promise.resolve(true) : test.validator(result);
  }, this)).then(goog.bind(function(validated) {
    if (validated) {
      this.fine_('PASSED', test.name, ':', duration);
      return goog.Promise.resolve();
    } else {
      this.fine_('FAILED ', test.name);
      return goog.Promise.reject(test.name + ' validation failed');
    }
  }, this));
};
