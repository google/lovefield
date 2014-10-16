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
goog.setTestOnly();
goog.require('goog.Promise');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.testing.Benchmark');
goog.require('lf.testing.perf.DefaultBenchmark');
goog.require('lf.testing.perf.SelectBenchmark');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('LfPerfTest');


/** @type {number} */
asyncTestCase.stepTimeout = 30 * 60 * 1000;  // 30 minutes


/** @const {number} */
var REPETITIONS = 5;

function benchmarkSetUp() {
  var resolver = goog.Promise.withResolver();

  var indexedDB =
      window.indexedDB ||
      window.mozIndexedDB ||
      window.webkitIndexedDB ||
      window.msIndexedDB;
  var request = indexedDB.deleteDatabase('hr');
  var resolve = goog.bind(resolver.resolve, resolver);
  request.onsuccess = resolve;
  request.onerror = resolve;
  request.onblocked = resolve;
  request.onupgradeneeded = resolve;

  return resolver.promise;
}

function test1LoadingEmptyDB() {
  var test1 = new lf.testing.perf.DefaultBenchmark();
  var benchmark = new lf.testing.Benchmark(
      'Loading Empty DB',
      benchmarkSetUp,
      goog.bind(test1.close, test1));

  benchmark.schedule(
      'Init empty DB',
      goog.bind(test1.init, test1),
      goog.bind(test1.validateEmpty, test1));
  benchmark.run(REPETITIONS).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
  asyncTestCase.waitForAsync('test1LoadingEmptyDB');
}

function test2FullTableOps() {
  var test2 = new lf.testing.perf.DefaultBenchmark();
  var benchmark = new lf.testing.Benchmark(
      'Full table SCUD',
      benchmarkSetUp,
      goog.bind(test2.close, test2));

  benchmark.schedule(
      'Init empty DB',
      goog.bind(test2.init, test2),
      goog.bind(test2.validateEmpty, test2), true);
  benchmark.schedule(
      'Generate test data',
      goog.bind(test2.generateTestData, test2), undefined, true);
  for (var i = 10000; i <= 50000; i += 10000) {
    benchmark.schedule(
        'Insert ' + i,
        goog.bind(test2.insert, test2, i),
        goog.bind(test2.validateInsert, test2, i));
    benchmark.schedule(
        'Select ' + i,
        goog.bind(test2.select, test2));
    benchmark.schedule(
        'Update ' + i,
        goog.bind(test2.updateAll, test2, i),
        goog.bind(test2.validateUpdateAll, test2, i));
    benchmark.schedule(
        'Delete ' + i,
        goog.bind(test2.deleteAll, test2),
        goog.bind(test2.validateEmpty, test2));
  }

  benchmark.run(REPETITIONS).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
  asyncTestCase.waitForAsync('test2FullTableOps');
}


function test3PKTableOps() {
  var test3 = new lf.testing.perf.DefaultBenchmark();
  var benchmark = new lf.testing.Benchmark(
      'PK-based SCUD',
      benchmarkSetUp,
      goog.bind(test3.close, test3));
  var rowCount = 30000;

  benchmark.schedule(
      'Init empty DB',
      goog.bind(test3.init, test3),
      goog.bind(test3.validateEmpty, test3), true);
  benchmark.schedule(
      'Generate test data',
      goog.bind(test3.generateTestData, test3), undefined, true);
  for (var i = 1; i <= 10000; i *= 10) {
    // Each repetition needs to insert 30000 rows.
    benchmark.schedule(
        'Insert ' + rowCount,
        goog.bind(test3.insert, test3, rowCount),
        goog.bind(test3.validateInsert, test3, rowCount), true);

    // Checks for partial SCUD via primary keys.
    benchmark.schedule(
        'Delete ' + i,
        goog.bind(test3.deletePartial, test3, i),
        goog.bind(test3.validateDeletePartial, test3, i));
    benchmark.schedule(
        'Insert ' + i,
        goog.bind(test3.insertPartial, test3, i),
        goog.bind(test3.validateInsert, test3, rowCount));
    benchmark.schedule(
        'Update ' + i,
        goog.bind(test3.updatePartial, test3, i));
    benchmark.schedule(
        'Select ' + i,
        goog.bind(test3.selectPartial, test3, i),
        goog.bind(test3.validateUpdatePartial, test3, i));

    // Resets the table.
    benchmark.schedule(
        'Delete ' + i,
        goog.bind(test3.deleteAll, test3),
        goog.bind(test3.validateEmpty, test3), true);
  }

  benchmark.run(REPETITIONS).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
  asyncTestCase.waitForAsync('test3PKTableOps');
}


function test4Select() {
  asyncTestCase.waitForAsync('test4_Select');

  var db = null;
  var selectBenchmark = null;
  benchmarkSetUp().then(function() {
    return hr.db.getInstance();
  }).then(function(database) {
    db = database;
    selectBenchmark = new lf.testing.perf.SelectBenchmark(db);
    return selectBenchmark.insertSampleData();
  }).then(function() {
    var benchmarkRunner = new lf.testing.Benchmark('SelectBenchmark');

    benchmarkRunner.schedule(
        'SelectSingleRowIndexed',
        selectBenchmark.querySingleRowIndexed.bind(selectBenchmark),
        selectBenchmark.verifySingleRowIndexed.bind(selectBenchmark));
    benchmarkRunner.schedule(
        'SelectSingleRowNonIndexed',
        selectBenchmark.querySingleRowNonIndexed.bind(selectBenchmark),
        selectBenchmark.verifySingleRowNonIndexed.bind(selectBenchmark));
    benchmarkRunner.schedule(
        'SelectMultiRowIndexedRange',
        selectBenchmark.queryMultiRowIndexedRange.bind(selectBenchmark),
        selectBenchmark.verifyMultiRowIndexedRange.bind(selectBenchmark));
    benchmarkRunner.schedule(
        'SelectMultiRowIndexedSpacedOut',
        selectBenchmark.queryMultiRowIndexedSpacedOut.bind(selectBenchmark),
        selectBenchmark.verifyMultiRowIndexedSpacedOut.bind(selectBenchmark));
    benchmarkRunner.schedule(
        'SelectMultiRowNonIndexedRange',
        selectBenchmark.queryMultiRowNonIndexedRange.bind(selectBenchmark),
        selectBenchmark.verifyMultiRowNonIndexedRange.bind(selectBenchmark));
    benchmarkRunner.schedule(
        'SelectMultiRowNonIndexedSpacedOut',
        selectBenchmark.queryMultiRowNonIndexedSpacedOut.bind(selectBenchmark),
        selectBenchmark.verifyMultiRowNonIndexedSpacedOut.bind(
            selectBenchmark));
    benchmarkRunner.schedule(
        'SelectOrderByIndexed',
        selectBenchmark.queryOrderByIndexed.bind(selectBenchmark),
        selectBenchmark.verifyOrderByIndexed.bind(selectBenchmark));
    benchmarkRunner.schedule(
        'SelectOrderByNonIndexed',
        selectBenchmark.queryOrderByNonIndexed.bind(selectBenchmark),
        selectBenchmark.verifyOrderByNonIndexed.bind(selectBenchmark));
    benchmarkRunner.schedule(
        'SelectProjectNonAggregatedColumns',
        selectBenchmark.queryProjectNonAggregatedColumns.bind(selectBenchmark),
        selectBenchmark.verifyProjectNonAggregatedColumns.bind(
            selectBenchmark));
    benchmarkRunner.schedule(
        'SelectProjectAggregateIndexed',
        selectBenchmark.queryProjectAggregateIndexed.bind(selectBenchmark),
        selectBenchmark.verifyProjectAggregateIndexed.bind(selectBenchmark));
    benchmarkRunner.schedule(
        'SelectProjectAggregateNonIndexed',
        selectBenchmark.queryProjectAggregateNonIndexed.bind(selectBenchmark),
        selectBenchmark.verifyProjectAggregateNonIndexed.bind(selectBenchmark));

    return benchmarkRunner.run(REPETITIONS);
  }).then(function() {
    return selectBenchmark.tearDown().then(function() {
      asyncTestCase.continueTesting();
    });
  }, function(e) {
    return selectBenchmark.tearDown().then(function() {
      fail(e);
    });
  });
}
