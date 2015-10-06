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
goog.setTestOnly();
goog.require('goog.Promise');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('lf.Capability');
goog.require('lf.ConstraintTiming');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.perf.BenchmarkRunner');
goog.require('lf.testing.perf.ForeignKeysBenchmark');
goog.require('lf.testing.perf.FullTableBenchmark');
goog.require('lf.testing.perf.LoadingEmptyDbBenchmark');
goog.require('lf.testing.perf.LoadingPopulatedDbBenchmark');
goog.require('lf.testing.perf.PkTableBenchmark');
goog.require('lf.testing.perf.ScenarioBenchmark');
goog.require('lf.testing.perf.SelectBenchmark');
goog.require('lf.testing.perf.hr.db');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('LfPerfTest');


/** @type {number} */
asyncTestCase.stepTimeout = 30 * 60 * 1000;  // 30 minutes


/** @const {number} */
var REPETITIONS = 5;


/** @type {!lf.Capability} */
var capability;


/**
 * An array that holds the results from all benchmarks, such that they can be
 * extracted later using WebDriver.
 * @type {!Array<!lf.testing.perf.BenchmarkRunner.Results>}
 */
var overallResults = [];


function setUpPage() {
  capability = lf.Capability.get();
}


function benchmarkSetUp() {
  var resolver = goog.Promise.withResolver();

  var indexedDB =
      window.indexedDB ||
      window.mozIndexedDB ||
      window.webkitIndexedDB ||
      window.msIndexedDB;
  var request = indexedDB.deleteDatabase('hr_nofk');
  var resolve = goog.bind(resolver.resolve, resolver);
  request.onsuccess = resolve;
  request.onerror = resolve;
  request.onblocked = resolve;
  request.onupgradeneeded = resolve;

  return resolver.promise;
}

function test1LoadingEmptyDB() {
  if (!capability.indexedDb) {
    return;
  }

  asyncTestCase.waitForAsync('test1LoadingEmptyDB');
  var benchmark = new lf.testing.perf.LoadingEmptyDbBenchmark();
  var benchmarkRunner = new lf.testing.perf.BenchmarkRunner(
      'Loading Empty DB',
      benchmarkSetUp,
      benchmark.close.bind(benchmark));
  benchmarkRunner.schedule(benchmark);
  benchmarkRunner.run(REPETITIONS).then(function(results) {
    overallResults.push(results);
    asyncTestCase.continueTesting();
  }, fail);
}


function test2FullTableOps() {
  if (!capability.indexedDb) {
    return;
  }

  asyncTestCase.waitForAsync('test2FullTableOps');
  var benchmark = new lf.testing.perf.FullTableBenchmark();
  var benchmarkRunner = new lf.testing.perf.BenchmarkRunner(
      'Full table SCUD',
      benchmarkSetUp,
      benchmark.close.bind(benchmark));
  benchmarkRunner.schedule(benchmark);

  return benchmarkRunner.run(REPETITIONS).then(function(results) {
    overallResults.push(results);
    asyncTestCase.continueTesting();
  }, fail);
}


function test2FullTableOps_Mem() {
  asyncTestCase.waitForAsync('test2FullTableOps_Mem');
  var benchmark = new lf.testing.perf.FullTableBenchmark(
      /* opt_volatile*/ true);
  var benchmarkRunner = new lf.testing.perf.BenchmarkRunner(
      'Full table SCUD Mem',
      undefined,
      benchmark.close.bind(benchmark));
  benchmarkRunner.schedule(benchmark);

  return benchmarkRunner.run(REPETITIONS).then(function(results) {
    overallResults.push(results);
    asyncTestCase.continueTesting();
  }, fail);
}


function test3PKTableOps() {
  if (!capability.indexedDb) {
    return;
  }

  asyncTestCase.waitForAsync('test3PKTableOps');
  var benchmark = new lf.testing.perf.PkTableBenchmark();
  var benchmarkRunner = new lf.testing.perf.BenchmarkRunner(
      'PK-based SCUD',
      benchmarkSetUp,
      benchmark.close.bind(benchmark));
  benchmarkRunner.schedule(benchmark);

  benchmarkRunner.run(REPETITIONS).then(function(results) {
    overallResults.push(results);
    asyncTestCase.continueTesting();
  }, fail);
}


function test3PKTableOps_Mem() {
  asyncTestCase.waitForAsync('test3PKTableOps_Mem');
  var benchmark = new lf.testing.perf.PkTableBenchmark(
      /* opt_volatile */ true);
  var benchmarkRunner = new lf.testing.perf.BenchmarkRunner(
      'PK-based SCUD Mem',
      undefined,
      benchmark.close.bind(benchmark));
  benchmarkRunner.schedule(benchmark);

  benchmarkRunner.run(REPETITIONS).then(function(results) {
    overallResults.push(results);
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * @param {string} name
 * @param {!lf.Database} db
 * @return {!IThenable}
 */
function selectRunner(name, db) {
  var selectBenchmark;

  return lf.testing.perf.SelectBenchmark.fromJson(
      'test4_mock_data_30k.json', db).then(function(benchmark) {
    selectBenchmark = benchmark;

    return selectBenchmark.insertSampleData();
  }).then(function() {
    var benchmarkRunner = new lf.testing.perf.BenchmarkRunner(name);
    benchmarkRunner.schedule(selectBenchmark);

    return benchmarkRunner.run(REPETITIONS);
  }).then(function(results) {
    overallResults.push(results);
    return selectBenchmark.tearDown();
  });
}


function test4Select() {
  if (!capability.indexedDb) {
    return;
  }

  asyncTestCase.waitForAsync('test4_Select');

  benchmarkSetUp().then(function() {
    return lf.testing.perf.hr.db.connect();
  }).then(function(database) {
    return selectRunner('SelectBenchmark', database);
  }).then(function() {
    asyncTestCase.continueTesting();
  });
}


function test4Select_Mem() {
  asyncTestCase.waitForAsync('test4_Select_Mem');

  benchmarkSetUp().then(function() {
    return lf.testing.perf.hr.db.connect(
        {storeType: lf.schema.DataStoreType.MEMORY});
  }).then(function(database) {
    return selectRunner('SelectBenchmark Mem', database);
  }).then(function() {
    asyncTestCase.continueTesting();
  });
}


function test5LoadingPopulatedDB() {
  if (!capability.indexedDb) {
    return;
  }

  asyncTestCase.waitForAsync('test5LoadingPopulatedDB');
  var rowCount = 20000;
  var benchmark = new lf.testing.perf.LoadingPopulatedDbBenchmark();

  var preRunSetup = function() {
    return benchmark.init().then(function() {
      return benchmark.close();
    }).then(function() {
      return benchmark.init();
    }).then(function() {
      return benchmark.loadTestData('default_benchmark_mock_data_50k.json');
    }).then(function() {
      return benchmark.insert(rowCount);
    }).then(function() {
      return benchmark.close(true /* skipDeletion */);
    });
  };

  var benchmarkRunner = new lf.testing.perf.BenchmarkRunner(
      'Loading Populated DB',
      preRunSetup,
      benchmark.close.bind(benchmark));
  benchmarkRunner.schedule(benchmark);

  benchmarkRunner.run(REPETITIONS).then(function(results) {
    overallResults.push(results);
    asyncTestCase.continueTesting();
  }, fail);
}


function test6ScenarioSimulations() {
  asyncTestCase.waitForAsync('test6ScenarioSimulations');
  var benchmark = new lf.testing.perf.ScenarioBenchmark();
  var benchmarkRunner = new lf.testing.perf.BenchmarkRunner(
      'Scenario Simulations');

  benchmark.init().then(function() {
    benchmarkRunner.schedule(benchmark);

    benchmarkRunner.run(REPETITIONS).then(function(results) {
      overallResults.push(results);
      asyncTestCase.continueTesting();
    }, fail);
  }, fail);
}


function test7ForeignKeys() {
  asyncTestCase.waitForAsync('test7ForeignKeys');

  goog.Promise.all([
    lf.testing.perf.ForeignKeysBenchmark.create(
        lf.ConstraintTiming.IMMEDIATE),
    lf.testing.perf.ForeignKeysBenchmark.create(
        lf.ConstraintTiming.DEFERRABLE),
    lf.testing.perf.ForeignKeysBenchmark.create(null)
  ]).then(function(benchmarks) {
    var benchmarkRunner = new lf.testing.perf.BenchmarkRunner(
        'ForeignKeysBenchmark');
    benchmarks.forEach(function(benchmark) {
      benchmarkRunner.schedule(benchmark);
    });

    return benchmarkRunner.run(REPETITIONS);
  }).then(function(results) {
    overallResults.push(results);
    asyncTestCase.continueTesting();
  }, fail);
}
