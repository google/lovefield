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
goog.setTestOnly();
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('lf.Capability');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.hrSchema.MockDataGenerator');
goog.require('lf.testing.hrSchema.getSchemaBuilder');
goog.require('lf.testing.util');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'ImportTaskTest');


/** @type {number} */
asyncTestCase.stepTimeout = 30 * 1000;  // 30 seconds.


/** @type {!lf.Capability} */
var capability;


function setUpPage() {
  capability = lf.Capability.get();
}


/**
 * @param {!lf.schema.ConnectOptions} options Connect options.
 * @return {!IThenable}
 */
function runTestImport(options) {
  // Need to guarantee that the two DBs have different names.
  var builder1 = lf.testing.hrSchema.getSchemaBuilder(
      'hr1_' + new Date().getTime());
  var builder2 = lf.testing.hrSchema.getSchemaBuilder(
      'hr2_' + new Date().getTime());
  var dataGen = new lf.testing.hrSchema.MockDataGenerator(builder1.getSchema());
  dataGen.generate(
      /* jobCount */ 100, /* employeeCount */ 1000, /* departmentCount */ 10);

  var db, db2;
  var data;
  return builder1.connect(options).then(function(dbInstance) {
    db = dbInstance;
    var d = db.getSchema().table('Department');
    var l = db.getSchema().table('Location');
    var c = db.getSchema().table('Country');
    var r = db.getSchema().table('Region');
    var j = db.getSchema().table('Job');
    var e = db.getSchema().table('Employee');

    var tx = db.createTransaction();
    return tx.exec([
      db.insert().into(r).values(dataGen.sampleRegions),
      db.insert().into(c).values(dataGen.sampleCountries),
      db.insert().into(l).values(dataGen.sampleLocations),
      db.insert().into(d).values(dataGen.sampleDepartments),
      db.insert().into(j).values(dataGen.sampleJobs),
      db.insert().into(e).values(dataGen.sampleEmployees)
    ]);
  }).then(function() {
    return db.export();
  }).then(function(exportedData) {
    data = exportedData;
    db.close();
    return builder2.connect(options);
  }).then(function(dbInstance) {
    db2 = dbInstance;
    data['name'] = builder2.getSchema().name();
    return db2.import(data);
  }).then(function() {
    return db2.export();
  }).then(function(exportedData) {
    assertEquals(builder2.getSchema().name(), exportedData['name']);
    assertEquals(builder2.getSchema().version(), exportedData['version']);
    assertObjectEquals(data, exportedData);
  });
}

function testImport_MemDB() {
  asyncTestCase.waitForAsync('testImport_MemDB');
  runTestImport({storeType: lf.schema.DataStoreType.MEMORY}).then(
      asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}

function testImport_IndexedDB() {
  if (!capability.indexedDb) {
    return;
  }

  asyncTestCase.waitForAsync('testImport_IndexedDB');
  runTestImport({storeType: lf.schema.DataStoreType.INDEXED_DB}).then(
      asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}

function testImport_WebSql() {
  if (!capability.webSql) {
    return;
  }

  asyncTestCase.waitForAsync('testImport_WebSql');
  runTestImport({storeType: lf.schema.DataStoreType.WEB_SQL}).then(
      asyncTestCase.continueTesting.bind(asyncTestCase), fail);
}

function disabledTestBenchmark() {
  var ROW_COUNT = 62500;
  var LOOP_COUNT = 30;

  var jobs = new Array(ROW_COUNT);
  for (var i = 0; i < ROW_COUNT; ++i) {
    jobs[i] = {
      id: 'jobId' + i.toString(),
      title: 'Job ' + i.toString(),
      minSalary: 10000 + i,
      maxSalary: 20000 + i
    };
  }

  var start;
  var results;
  var runImport = function() {
    var builder = lf.testing.hrSchema.getSchemaBuilder();
    var data = {
      'name': builder.getSchema().name(),
      'version': builder.getSchema().version(),
      'tables': {
        'Job': jobs
      }
    };

    return builder.connect({
      storeType: lf.schema.DataStoreType.MEMORY
    }).then(function(db) {
      start = goog.global.performance.now();
      return db.import(data);
    }).then(function() {
      var end = goog.global.performance.now();
      results.push(end - start);
    });
  };

  var runInsert = function() {
    var builder = lf.testing.hrSchema.getSchemaBuilder();
    return builder.connect({
      storeType: lf.schema.DataStoreType.MEMORY
    }).then(function(db) {
      var j = db.getSchema().table('Job');
      start = goog.global.performance.now();
      var rows = jobs.map(function(data) {
        return j.createRow(data);
      });
      return db.insert().into(j).values(rows).exec();
    }).then(function() {
      var end = goog.global.performance.now();
      results.push(end - start);
    });
  };

  var compute = function() {
    var base = results.sort(function(a, b) {
      return (a < b) ? -1 : ((a > b) ? 1 : 0);
    });
    var average = base.reduce(function(p, c) {
      return p + c;
    }, 0) / LOOP_COUNT;
    console['log'](average);
  };

  var fill = function(target) {
    results = [];
    var funcs = new Array(LOOP_COUNT);
    for (var i = 0; i < LOOP_COUNT; ++i) {
      funcs[i] = target;
    }
    return funcs;
  };


  asyncTestCase.waitForAsync('testBenchmark');
  lf.testing.util.sequentiallyRun(fill(runImport)).then(function() {
    compute();
    return lf.testing.util.sequentiallyRun(fill(runInsert));
  }).then(function() {
    compute();
    asyncTestCase.continueTesting();
  });
}
