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
goog.require('goog.net.XhrIo');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('goog.userAgent.product');
goog.require('hr.db');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.Benchmark');
goog.require('lf.testing.hrSchema.MockDataGenerator');
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
  if (goog.userAgent.product.SAFARI) {
    return;
  }

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


/**
 * @param {!lf.testing.perf.DefaultBenchmark} test2
 * @param {!lf.testing.Benchmark} benchmark
 * @return {!IThenable}
 */
function fullTableOps(test2, benchmark) {
  benchmark.schedule(
      'Init empty DB',
      goog.bind(test2.init, test2),
      goog.bind(test2.validateEmpty, test2), true);
  benchmark.schedule(
      'Load test data',
      goog.bind(
          test2.loadTestData, test2,
          'default_benchmark_mock_data_50k.json'), undefined, true);
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

  return benchmark.run(REPETITIONS);
}

function test2FullTableOps() {
  if (goog.userAgent.product.SAFARI) {
    return;
  }

  var test2 = new lf.testing.perf.DefaultBenchmark();
  var benchmark = new lf.testing.Benchmark(
      'Full table SCUD',
      benchmarkSetUp,
      goog.bind(test2.close, test2));

  fullTableOps(test2, benchmark).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
  asyncTestCase.waitForAsync('test2FullTableOps');
}

function test2FullTableOps_Mem() {
  var test2 = new lf.testing.perf.DefaultBenchmark(/* opt_volatile*/ true);
  var benchmark = new lf.testing.Benchmark(
      'Full table SCUD Mem',
      goog.Promise.resolve,
      goog.bind(test2.close, test2));

  fullTableOps(test2, benchmark).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
  asyncTestCase.waitForAsync('test2FullTableOps_Mem');
}


/**
 * @param {!lf.testing.perf.DefaultBenchmark} test3
 * @param {!lf.testing.Benchmark} benchmark
 * @return {!IThenable}
 */
function pkTableOps(test3, benchmark) {
  var rowCount = 30000;

  benchmark.schedule(
      'Init empty DB',
      goog.bind(test3.init, test3),
      goog.bind(test3.validateEmpty, test3), true);
  benchmark.schedule(
      'Load test data',
      goog.bind(
          test3.loadTestData, test3,
          'default_benchmark_mock_data_50k.json'), undefined, true);
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

  return benchmark.run(REPETITIONS);
}

function test3PKTableOps() {
  if (goog.userAgent.product.SAFARI) {
    return;
  }

  var test3 = new lf.testing.perf.DefaultBenchmark();
  var benchmark = new lf.testing.Benchmark(
      'PK-based SCUD',
      benchmarkSetUp,
      goog.bind(test3.close, test3));

  pkTableOps(test3, benchmark).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
  asyncTestCase.waitForAsync('test3PKTableOps');
}

function test3PKTableOps_Mem() {
  var test3 = new lf.testing.perf.DefaultBenchmark(/* opt_volatile */ true);
  var benchmark = new lf.testing.Benchmark(
      'PK-based SCUD Mem',
      goog.Promise.resolve,
      goog.bind(test3.close, test3));

  pkTableOps(test3, benchmark).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
  asyncTestCase.waitForAsync('test3PKTableOps_Mem');
}


/**
 * @param {string} name
 * @param {!lf.Database} db
 * @return {!IThenable}
 */
function selectRunner(name, db) {
  var selectBenchmark;
  var tearDown;

  var promise = loadSampleDatafromJson('test4_mock_data_30k.json');

  return promise.then(function(sampleData) {
    var dataGenerator = lf.testing.hrSchema.MockDataGenerator.
        fromExportData(
            /** @type {!hr.db.schema.Database} */ (db.getSchema()), sampleData);
    selectBenchmark = new lf.testing.perf.SelectBenchmark(db, dataGenerator);
    tearDown = goog.bind(selectBenchmark.tearDown, selectBenchmark.tearDown);

    return selectBenchmark.insertSampleData();
  }).then(function() {
    var benchmarkRunner = new lf.testing.Benchmark(name);

    benchmarkRunner.schedule(
        'SelectSingleRowIndexed',
        selectBenchmark.querySingleRowIndexed.bind(selectBenchmark),
        selectBenchmark.verifySingleRowIndexed.bind(selectBenchmark));
    benchmarkRunner.schedule(
        'SelectSingleRowNonIndexed',
        selectBenchmark.querySingleRowNonIndexed.bind(selectBenchmark),
        selectBenchmark.verifySingleRowNonIndexed.bind(selectBenchmark));
    benchmarkRunner.schedule(
        'SelectSingleRowMultipleIndices',
        selectBenchmark.querySingleRowMultipleIndices.bind(selectBenchmark),
        selectBenchmark.verifySingleRowMultipleIndices.bind(selectBenchmark));
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
        'SelectLimitSkipIndexed',
        selectBenchmark.queryLimitSkipIndexed.bind(selectBenchmark),
        selectBenchmark.verifyLimitSkipIndexed.bind(selectBenchmark));
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
    benchmarkRunner.schedule(
        'SelectJoinEqui',
        selectBenchmark.queryJoinEqui.bind(selectBenchmark),
        selectBenchmark.verifyJoinEqui.bind(selectBenchmark));
    benchmarkRunner.schedule(
        'SelectJoinTheta',
        selectBenchmark.queryJoinTheta.bind(selectBenchmark),
        selectBenchmark.verifyJoinTheta.bind(selectBenchmark));

    return benchmarkRunner.run(REPETITIONS);
  }).then(tearDown, tearDown);
}

function test4Select() {
  if (goog.userAgent.product.SAFARI) {
    return;
  }

  asyncTestCase.waitForAsync('test4_Select');

  benchmarkSetUp().then(function() {
    return hr.db.connect();
  }).then(function(database) {
    return selectRunner('SelectBenchmark', database);
  }).then(function() {
    asyncTestCase.continueTesting();
  });
}

function test4Select_Mem() {
  asyncTestCase.waitForAsync('test4_Select_Mem');

  benchmarkSetUp().then(function() {
    return hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY});
  }).then(function(database) {
    return selectRunner('SelectBenchmark Mem', database);
  }).then(function() {
    asyncTestCase.continueTesting();
  });
}

function test5LoadingPopulatedDB() {
  if (goog.userAgent.product.SAFARI) {
    return;
  }

  asyncTestCase.waitForAsync('test5LoadingPopulatedDB');
  var rowCount = 20000;
  var test = new lf.testing.perf.DefaultBenchmark();

  var preRunSetup = function() {
    return test.init().then(function() {
      return test.close();
    }).then(function() {
      return test.init();
    }).then(function() {
      return test.loadTestData('default_benchmark_mock_data_50k.json');
    }).then(function() {
      return test.insert(rowCount);
    });
  };

  var benchmark = new lf.testing.Benchmark('Loading Populated DB', preRunSetup);
  benchmark.schedule('Init populated DB', goog.bind(test.init, test));

  benchmark.run(REPETITIONS).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Reads the sample data from a JSON file.
 * @param {string} filename The name of the JSON file holding the data. Has to
 *     reside in the same folder as this test.
 * @return {!IThenable}
 */
function loadSampleDatafromJson(filename) {
  return new goog.Promise(function(resolve, reject) {
    goog.net.XhrIo.send(filename, function(e) {
      var xhr = e.target;
      resolve(JSON.parse(xhr.getResponseText()));
    });
  });
}
