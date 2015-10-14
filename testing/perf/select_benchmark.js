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
goog.provide('lf.testing.perf.SelectBenchmark');

goog.require('goog.Promise');
goog.require('goog.math');
goog.require('goog.net.XhrIo');
goog.require('goog.object');
goog.require('lf.Order');
goog.require('lf.fn');
goog.require('lf.op');
goog.require('lf.structs.set');
goog.require('lf.testing.hrSchema.MockDataGenerator');
goog.require('lf.testing.perf.Benchmark');
goog.require('lf.testing.perf.TestCase');

goog.scope(function() {



/**
 * Benchmark for various types of SELECT queries.
 * @constructor @struct
 * @implements {lf.testing.perf.Benchmark}
 *
 * @param {!lf.Database} db
 * @param {!lf.testing.hrSchema.MockDataGenerator} dataGenerator
 */
lf.testing.perf.SelectBenchmark = function(db, dataGenerator) {
  this.db_ = db;

  /** @private {!lf.testing.perf.hr.db.schema.Employee} */
  this.e_ = this.db_.getSchema().getEmployee();

  /** @private {!lf.testing.perf.hr.db.schema.Job} */
  this.j_ = this.db_.getSchema().getJob();

  /** @private {!lf.testing.perf.hr.db.schema.CrossColumnTable} */
  this.cct_ = this.db_.getSchema().getCrossColumnTable();

  /** @private {!lf.testing.hrSchema.MockDataGenerator} */
  this.dataGenerator_ = dataGenerator;

  /**
   * The number of expected results for all "range" and "spaced out" queries.
   * This is necessary so that even though the data is randomly generated, the
   * query returns the same amount of results each time, such that timings are
   * comparable across runs.
   * @private {number}
   */
  this.employeeResultCount_ = this.dataGenerator_.sampleEmployees.length / 10;

  /** @private {!lf.testing.perf.SelectBenchmark.QueryData_} */
  this.queryData_ = this.generateQueryData_();
};


/**
 * The precision to use when comparing floating point numbers.
 * @private {number}
 */
lf.testing.perf.SelectBenchmark.EPSILON_ = Math.pow(10, -9);


/**
 * @typedef {{
*    employeeId: string,
*    employeeIds: !Array<string>,
*    employeeEmail: string,
*    employeeHireDateStart: !Date,
*    employeeHireDateEnd: !Date,
*    employeeSalaryStart: number,
*    employeeSalaryEnd: number,
*    employeeSalariesSpacedOut: !Array<number>,
*    employeeHireDatesSpacedOut: !Array<!Date>,
*    employeeLimit: number,
*    employeeSkip: number
*  }}
 * @private
 */
lf.testing.perf.SelectBenchmark.QueryData_;


/**
 * Generates data necessary for constructing the queries that will be benchmark.
 * @return {!lf.testing.perf.SelectBenchmark.QueryData_}
 * @private
 */
lf.testing.perf.SelectBenchmark.prototype.generateQueryData_ = function() {
  var queryData = {};
  var sampleEmployees = this.dataGenerator_.sampleEmployees;

  var employeeIdIndex =
      Math.floor(Math.random() * sampleEmployees.length);
  var employeeEmailIndex =
      Math.floor(Math.random() * sampleEmployees.length);

  queryData.employeeId = sampleEmployees[employeeIdIndex].getId();
  queryData.employeeEmail =
      sampleEmployees[employeeEmailIndex].getEmail();

  // Randomly select an employee somewhere in the first half.
  var employeeIndex1 =
      Math.floor(Math.random() * (sampleEmployees.length / 2));
  // Randomly select an employee somewhere in the second half.
  var employeeIndex2 = Math.floor(
          (sampleEmployees.length / 2) +
          Math.random() * (sampleEmployees.length / 2));
  queryData.employeeIds = [
    sampleEmployees[employeeIndex1].getId(),
    sampleEmployees[Math.floor((employeeIndex1 + employeeIndex2) / 2)].getId(),
    sampleEmployees[employeeIndex2].getId()
  ];

  queryData.employeeSalariesSpacedOut = [];
  queryData.employeeHireDatesSpacedOut = [];
  var step = Math.floor(
      this.dataGenerator_.sampleEmployees.length /
      this.employeeResultCount_);
  for (var i = 0; i < sampleEmployees.length; i += step) {
    queryData.employeeSalariesSpacedOut.push(
        sampleEmployees[i].getSalary());
    queryData.employeeHireDatesSpacedOut.push(
        sampleEmployees[i].getHireDate());
  }

  // Sorting employees by hireDate.
  sampleEmployees.sort(function(emp1, emp2) {
    return emp1.getHireDate() - emp2.getHireDate();
  });
  var employee1Index = Math.floor(
      Math.random() * (sampleEmployees.length / 2));
  var employee2Index = employee1Index + this.employeeResultCount_ - 1;
  // Selecting hireDateStart and hireDateEnd such that the amount of results
  // falling within the range is EMPLOYEE_RESULT_COUNT_.
  queryData.employeeHireDateStart =
      sampleEmployees[employee1Index].getHireDate();
  queryData.employeeHireDateEnd =
      sampleEmployees[employee2Index].getHireDate();

  // Sorting employees by salary.
  sampleEmployees.sort(function(emp1, emp2) {
    return emp1.getSalary() - emp2.getSalary();
  });
  employee1Index = Math.floor(
      Math.random() * (sampleEmployees.length / 2));
  employee2Index = employee1Index + this.employeeResultCount_ - 1;
  // Selecting employeeSalaryStart and employeeSalaryEnd such that the amount of
  // results falling within the range is EMPLOYEE_RESULT_COUNT_.
  queryData.employeeSalaryStart =
      sampleEmployees[employee1Index].getSalary();
  queryData.employeeSalaryEnd =
      sampleEmployees[employee2Index].getSalary();
  queryData.employeeLimit = 5;
  queryData.employeeSkip = 2000;

  return /** @type {!lf.testing.perf.SelectBenchmark.QueryData_} */ (queryData);
};


/**
 * Inserts sample data to the database.
 * @return {!IThenable}
 */
lf.testing.perf.SelectBenchmark.prototype.insertSampleData = function() {
  var insertEmployees = this.db_.
      insert().into(this.e_).
      values(this.dataGenerator_.sampleEmployees).
      exec();

  var insertJobs = this.db_.
      insert().into(this.j_).
      values(this.dataGenerator_.sampleJobs).
      exec();

  var crossColumnTableRows = [];
  for (var i = 0; i < 200; i++) {
    for (var j = 0; j < 200; j++) {
      crossColumnTableRows.push(this.cct_.createRow(
          /** @type {!lf.testing.perf.hr.db.row.CrossColumnTableType} */ ({
            integer1: i,
            integer2: j
          })));
    }
  }
  var insertCrossColumnTable = this.db_.
      insert().into(this.cct_).
      values(crossColumnTableRows).
      exec();

  return goog.Promise.all([
    insertJobs, insertEmployees, insertCrossColumnTable]);
};


/**
 * Deletes all data from the database.
 * @return {!IThenable}
 */
lf.testing.perf.SelectBenchmark.prototype.tearDown = function() {
  var tx = this.db_.createTransaction();
  return tx.exec([
    this.db_.delete().from(this.e_),
    this.db_.delete().from(this.j_)
  ]).then(function() {
    this.db_.close();
  }.bind(this));
};


/** @return {!IThenable} */
lf.testing.perf.SelectBenchmark.prototype.querySingleRowIndexed =
    function() {
  return this.db_.
      select().
      from(this.e_).
      where(this.e_.id.eq(this.queryData_.employeeId)).
      exec();
};


/**
 * @param {!Array<!Object>} results
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.SelectBenchmark.prototype.verifySingleRowIndexed =
    function(results) {
  if (results.length != 1) {
    return goog.Promise.resolve(false);
  }

  return goog.Promise.resolve(
      results[0].id == this.queryData_.employeeId);
};


/** @return {!IThenable} */
lf.testing.perf.SelectBenchmark.prototype.querySingleRowNonIndexed =
    function() {
  return this.db_.
      select().
      from(this.e_).
      where(this.e_.email.eq(this.queryData_.employeeEmail)).
      exec();
};


/**
 * Note: The following query uses two ValuePredicates that both operate on an
 * indexed property. This causes the IndexRangeScanPass to select the most
 * selective index for the IndexRangeScan step by calling BTree#cost(), and
 * because of the TODO that exists in that method performance is very poor.
 * Should observe a noticeable change once BTree#cost() is optimized.
 *
 * @return {!IThenable}
 */
lf.testing.perf.SelectBenchmark.prototype.querySingleRowMultipleIndices =
    function() {
  // Selecting a value purposefully high such that all rows satisfy this
  // predicate, whereas the other predicate is satisfied by only one row.
  var salaryThreshold = 2 * this.dataGenerator_.employeeGroundTruth.avgSalary;

  var q = this.db_.
      select().
      from(this.e_).
      orderBy(this.e_.id, lf.Order.ASC).
      where(lf.op.and(
          this.e_.id.eq(this.queryData_.employeeId),
          this.e_.salary.lt(salaryThreshold)));

  return q.exec();
};


/**
 * @param {!Array<!Object>} results
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.SelectBenchmark.prototype.verifySingleRowMultipleIndices =
    function(results) {
  var salaryThreshold = 2 * this.dataGenerator_.employeeGroundTruth.avgSalary;

  var validated = results.every(function(obj) {
    return obj[this.e_.id.getName()] == this.queryData_.employeeId &&
        obj[this.e_.salary.getName()] < salaryThreshold;
  }, this);

  return goog.Promise.resolve(validated);
};


/**
 * @param {!Array<!Object>} results
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.SelectBenchmark.prototype.verifySingleRowNonIndexed =
    function(results) {
  if (results.length < 1) {
    return goog.Promise.resolve(false);
  }

  var validated = results.every(function(obj) {
    return obj.email == this.queryData_.employeeEmail;
  }, this);

  return goog.Promise.resolve(validated);
};


/** @return {!IThenable} */
lf.testing.perf.SelectBenchmark.prototype.queryMultiRowIndexedSpacedOut =
    function() {
  return this.db_.
      select().
      from(this.e_).
      where(this.e_.salary.in(this.queryData_.employeeSalariesSpacedOut)).
      exec();
};


/**
 * @param {!Array<!Object>} results
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.SelectBenchmark.prototype.verifyMultiRowIndexedSpacedOut =
    function(results) {
  // Multiple employees can have the same salary.
  if (results.length < this.queryData_.employeeSalariesSpacedOut.length) {
    return goog.Promise.resolve(false);
  }

  var salariesSet = lf.structs.set.create(
      this.queryData_.employeeSalariesSpacedOut);
  var errorsExist = results.some(function(obj, index) {
    return !salariesSet.has(obj.salary);
  }, this);

  return goog.Promise.resolve(!errorsExist);
};


/** @return {!IThenable} */
lf.testing.perf.SelectBenchmark.prototype.queryMultiRowIndexedRange =
    function() {
  return this.db_.
      select().
      from(this.e_).
      where(this.e_.salary.between(
          this.queryData_.employeeSalaryStart,
          this.queryData_.employeeSalaryEnd)).
      exec();
};


/**
 * @param {!Array<!Object>} results
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.SelectBenchmark.prototype.verifyMultiRowIndexedRange =
    function(results) {
  var employeeIdSet = lf.structs.set.create();
  this.dataGenerator_.sampleEmployees.forEach(function(employee) {
    if (employee.getSalary() >= this.queryData_.employeeSalaryStart &&
        employee.getSalary() <= this.queryData_.employeeSalaryEnd) {
      employeeIdSet.add(employee.getId());
    }
  }, this);

  if (results.length != employeeIdSet.size) {
    return goog.Promise.resolve(false);
  }

  var validated = results.every(function(obj) {
    return employeeIdSet.has(obj.id);
  }, this);

  return goog.Promise.resolve(validated);
};


/** @return {!IThenable} */
lf.testing.perf.SelectBenchmark.prototype.queryMultiRowNonIndexedSpacedOut =
    function() {
  return this.db_.
      select().
      from(this.e_).
      where(this.e_.hireDate.in(this.queryData_.employeeHireDatesSpacedOut)).
      exec();
};


/**
 * @param {!Array<!Object>} results
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.SelectBenchmark.prototype.verifyMultiRowNonIndexedSpacedOut =
    function(results) {
  if (results.length < this.queryData_.employeeHireDatesSpacedOut.length) {
    return goog.Promise.resolve(false);
  }

  var datestamps = this.queryData_.employeeHireDatesSpacedOut.map(
      function(date) {
        return date.getTime();
      });

  var datestampsSet = lf.structs.set.create(datestamps);
  var errorsExist = results.some(function(obj, index) {
    return !datestampsSet.has(obj.hireDate.getTime());
  }, this);

  return goog.Promise.resolve(!errorsExist);
};


/** @return {!IThenable} */
lf.testing.perf.SelectBenchmark.prototype.queryMultiRowNonIndexedRange =
    function() {
  return this.db_.
      select().
      from(this.e_).
      where(this.e_.hireDate.between(
          this.queryData_.employeeHireDateStart,
          this.queryData_.employeeHireDateEnd)).
      exec();
};


/**
 * @param {!Array<!Object>} results
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.SelectBenchmark.prototype.verifyMultiRowNonIndexedRange =
    function(results) {
  var employeeHireDateSet = lf.structs.set.create();
  this.dataGenerator_.sampleEmployees.forEach(function(employee) {
    if (employee.getHireDate().getTime() >=
        this.queryData_.employeeHireDateStart.getTime() &&
        employee.getHireDate().getTime() <=
        this.queryData_.employeeHireDateEnd.getTime()) {
      employeeHireDateSet.add(employee.getHireDate());
    }
  }, this);

  if (results.length != employeeHireDateSet.size) {
    return goog.Promise.resolve(false);
  }

  var validated = results.every(function(obj) {
    return employeeHireDateSet.has(obj.hireDate);
  }, this);

  return goog.Promise.resolve(validated);
};


/**
 * Case where an OR predicate involving a single (indexed) column exists.
 * @return {!IThenable}
 */
lf.testing.perf.SelectBenchmark.prototype.queryIndexedOrPredicate =
    function() {
  var predicates = this.queryData_.employeeIds.map(function(employeeId) {
    return this.e_['id'].eq(employeeId);
  }, this);

  return this.db_.
      select().
      from(this.e_).
      where(lf.op.or.apply(null, predicates)).
      exec();
};


/**
 * Case where an OR predicate involving multiple columns exists and each column
 * has a dedicated index.
 * @return {!IThenable}
 */
lf.testing.perf.SelectBenchmark.prototype.queryIndexedOrPredicateMultiColumn =
    function() {
  var targetSalary1 = this.queryData_.employeeSalaryStart;
  var targetSalary2 = this.queryData_.employeeSalaryEnd;
  var targetId = this.queryData_.employeeId;

  return this.db_.
      select().
      from(this.e_).
      where(lf.op.or(
          this.e_['id'].eq(targetId),
          this.e_['salary']['in']([targetSalary1, targetSalary2]))).
      exec();
};


/**
 * @param {!Array<!Object>} results
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.SelectBenchmark.prototype.verifyIndexedOrPredicateMultiColumn =
    function(results) {
  assertTrue(results.length >= 2);

  var targetSalary1 = this.queryData_.employeeSalaryStart;
  var targetSalary2 = this.queryData_.employeeSalaryEnd;
  var targetId = this.queryData_.employeeId;

  var validated = results.every(function(obj) {
    return obj['id'] == targetId || obj['salary'] == targetSalary1 ||
        obj['salary'] == targetSalary2;
  });
  return goog.Promise.resolve(validated);
};


/** @return {!IThenable} */
lf.testing.perf.SelectBenchmark.prototype.queryIndexedInPredicate =
    function() {
  return this.db_.
      select().
      from(this.e_).
      // TODO(dpapad): Figure out how to please the linter, complaining about
      // 'in'.
      where(this.e_['id']['in'](this.queryData_.employeeIds)).
      exec();
};


/**
 * @param {!Array<!Object>} results
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.SelectBenchmark.prototype.verifyIndexedOrPredicate =
    function(results) {
  assertEquals(this.queryData_.employeeIds.length, results.length);
  var actualIds = results.map(function(obj) {
    return obj[this.e_['id'].getName()];
  }, this);
  assertSameElements(this.queryData_.employeeIds, actualIds);
  return goog.Promise.resolve(true);
};


/** @return {!IThenable} */
lf.testing.perf.SelectBenchmark.prototype.queryOrderByIndexed =
    function() {
  return this.db_.
      select().
      from(this.e_).
      orderBy(this.e_.salary, lf.Order.DESC).
      exec();
};


/**
 * @param {!Array<!Object>} results
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.SelectBenchmark.prototype.verifyOrderByIndexed =
    function(results) {
  if (results.length != this.dataGenerator_.sampleEmployees.length) {
    return goog.Promise.resolve(false);
  }

  for (var i = 1; i < results.length; i++) {
    assertTrue(goog.isDefAndNotNull(results[i].salary));
    assertTrue(goog.isDefAndNotNull(results[i - 1].salary));
    if (results[i].salary > results[i - 1].salary) {
      return goog.Promise.resolve(false);
    }
  }

  return goog.Promise.resolve(true);
};


/** @return {!IThenable} */
lf.testing.perf.SelectBenchmark.prototype.queryOrderByIndexedCrossColumn =
    function() {
  return this.db_.
      select().
      from(this.cct_).
      orderBy(this.cct_.integer1, lf.Order.ASC).
      orderBy(this.cct_.integer2, lf.Order.DESC).
      exec();
};


/**
 * @param {!Array<!Object>} results
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.SelectBenchmark.prototype.verifyOrderByIndexedCrossColumn =
    function(results) {
  assertEquals(200 * 200, results.length);
  var objCounter = 0;
  for (var i = 0; i < 200; i++) {
    for (var j = 199; j >= 0; j--) {
      assertEquals(i, results[objCounter]['integer1']);
      assertEquals(j, results[objCounter]['integer2']);
      objCounter++;
    }
  }

  return goog.Promise.resolve(true);
};


/** @return {!IThenable} */
lf.testing.perf.SelectBenchmark.prototype.queryOrderByNonIndexed =
    function() {
  return this.db_.
      select().
      from(this.e_).
      orderBy(this.e_.commissionPercent, lf.Order.DESC).
      exec();
};


/**
 * @param {!Array<!Object>} results
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.SelectBenchmark.prototype.verifyOrderByNonIndexed =
    function(results) {
  if (results.length != this.dataGenerator_.sampleEmployees.length) {
    return goog.Promise.resolve(false);
  }

  for (var i = 1; i < results.length; i++) {
    assertTrue(goog.isDefAndNotNull(results[i].commissionPercent));
    assertTrue(goog.isDefAndNotNull(results[i - 1].commissionPercent));
    if (results[i].commissionPercent > results[i - 1].commissionPercent) {
      return goog.Promise.resolve(false);
    }
  }

  return goog.Promise.resolve(true);
};


/** @return {!IThenable} */
lf.testing.perf.SelectBenchmark.prototype.queryLimitSkipIndexed =
    function() {
  return this.db_.
      select().
      from(this.e_).
      orderBy(this.e_.salary, lf.Order.DESC).
      limit(this.queryData_.employeeLimit).
      skip(this.queryData_.employeeSkip).
      exec();
};


/**
 * @param {!Array<!Object>} results
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.SelectBenchmark.prototype.verifyLimitSkipIndexed =
    function(results) {
  if (this.queryData_.employeeLimit != results.length) {
    return goog.Promise.resolve(false);
  }

  // Sorting sample employees by descending salary.
  this.dataGenerator_.sampleEmployees.sort(function(emp1, emp2) {
    return emp2.getSalary() - emp1.getSalary();
  });

  var expectedEmployees = this.dataGenerator_.sampleEmployees.slice(
      this.queryData_.employeeSkip,
      this.queryData_.employeeSkip + this.queryData_.employeeLimit);

  var validated = expectedEmployees.every(function(employee, index) {
    var obj = results[index];
    return employee.getId() == obj[this.e_.id.getName()];
  }, this);

  return goog.Promise.resolve(validated);
};


/** @return {!IThenable} */
lf.testing.perf.SelectBenchmark.prototype.queryProjectNonAggregatedColumns =
    function() {
  return this.db_.
      select(this.e_.email, this.e_.salary).
      from(this.e_).
      exec();
};


/**
 * @param {!Array<!Object>} results
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.SelectBenchmark.prototype.verifyProjectNonAggregatedColumns =
    function(results) {
  if (results.length != this.dataGenerator_.sampleEmployees.length) {
    return goog.Promise.resolve(false);
  }

  var validated = results.every(function(obj) {
    return goog.object.getCount(obj) == 2 &&
        goog.isDefAndNotNull(obj.email) &&
        goog.isDefAndNotNull(obj.salary);
  }, this);

  return goog.Promise.resolve(validated);
};


/** @return {!IThenable} */
lf.testing.perf.SelectBenchmark.prototype.queryProjectAggregateIndexed =
    function() {
  return this.db_.
      select(lf.fn.avg(this.e_.salary), lf.fn.stddev(this.e_.salary)).
      from(this.e_).
      exec();
};


/**
 * @param {!Array<!Object>} results
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.SelectBenchmark.prototype.verifyProjectAggregateIndexed =
    function(results) {
  if (results.length != 1) {
    return goog.Promise.resolve(false);
  }

  var avgSalaryColumn = lf.fn.avg(this.e_.salary);
  var stddevSalaryColumn = lf.fn.stddev(this.e_.salary);

  var validated =
      goog.math.nearlyEquals(
          results[0][avgSalaryColumn.getName()],
          this.dataGenerator_.employeeGroundTruth.avgSalary,
          lf.testing.perf.SelectBenchmark.EPSILON_) &&
      goog.math.nearlyEquals(
          results[0][stddevSalaryColumn.getName()],
          this.dataGenerator_.employeeGroundTruth.stddevSalary,
          lf.testing.perf.SelectBenchmark.EPSILON_);

  return goog.Promise.resolve(validated);
};


/** @return {!IThenable} */
lf.testing.perf.SelectBenchmark.prototype.queryProjectAggregateNonIndexed =
    function() {
  return this.db_.
      select(lf.fn.min(this.e_.hireDate), lf.fn.max(this.e_.hireDate)).
      from(this.e_).
      exec();
};


/**
 * @param {!Array<!Object>} results
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.SelectBenchmark.prototype.verifyProjectAggregateNonIndexed =
    function(results) {
  if (results.length != 1) {
    return goog.Promise.resolve(false);
  }

  var minHireDateColumn = lf.fn.min(this.e_.hireDate);
  var maxHireDateColumn = lf.fn.max(this.e_.hireDate);

  var validated =
      results[0][minHireDateColumn.getName()] ==
          this.dataGenerator_.employeeGroundTruth.minHireDate &&
      results[0][maxHireDateColumn.getName()] ==
          this.dataGenerator_.employeeGroundTruth.maxHireDate;

  return goog.Promise.resolve(validated);
};


/** @return {!IThenable} */
lf.testing.perf.SelectBenchmark.prototype.queryJoinEqui = function() {
  return this.db_.
      select().
      from(this.e_, this.j_).
      where(this.e_.jobId.eq(this.j_.id)).
      exec();
};


/**
 * @param {!Array<!Object>} results
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.SelectBenchmark.prototype.verifyJoinEqui = function(results) {
  if (this.dataGenerator_.sampleEmployees.length != results.length) {
    return goog.Promise.resolve(false);
  }

  var validated = results.every(function(obj) {
    return goog.object.getCount(obj) == 2 &&
        goog.isDefAndNotNull(obj[this.e_.getName()]) &&
        goog.isDefAndNotNull(obj[this.j_.getName()]) &&
        obj[this.e_.getName()][this.e_.jobId.getName()] ==
            obj[this.j_.getName()][this.j_.id.getName()];
  }, this);

  return goog.Promise.resolve(validated);
};


/** @return {!IThenable} */
lf.testing.perf.SelectBenchmark.prototype.queryJoinTheta = function() {
  return this.db_.
      select().
      from(this.j_, this.e_).
      orderBy(this.e_.id, lf.Order.ASC).
      where(lf.op.and(
          this.e_.jobId.eq(this.j_.id),
          this.e_.salary.gt(this.j_.maxSalary))).
      exec();
};


/**
 * @param {!Array<!Object>} results
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.SelectBenchmark.prototype.verifyJoinTheta = function(results) {
  if (results.length !=
      this.dataGenerator_.employeeGroundTruth.thetaJoinSalaryIds.length) {
    return goog.Promise.resolve(false);
  }
  var validated = results.every(function(obj, i) {
    return obj[this.e_.getName()][this.e_.id.getName()] ==
        this.dataGenerator_.employeeGroundTruth.thetaJoinSalaryIds[i];
  }, this);

  return goog.Promise.resolve(validated);
};


/** @return {!IThenable} */
lf.testing.perf.SelectBenchmark.prototype.queryCountStar = function() {
  return this.db_.
      select(lf.fn.count()).
      from(this.e_).
      exec();
};


/**
 * @param {!Array<!Object>} results
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.SelectBenchmark.prototype.verifyCountStar = function(results) {
  var aggregatedColumn = lf.fn.count();
  var validated = (1 == results.length &&
      this.dataGenerator_.sampleEmployees.length ==
          results[0][aggregatedColumn]);

  return goog.Promise.resolve(validated);
};


/** @override */
lf.testing.perf.SelectBenchmark.prototype.getTestCases = function() {
  // TODO(dpapad): Convert all other methods to private.
  var testCases = [
    ['SingleRowIndexed',
     this.querySingleRowIndexed, this.verifySingleRowIndexed],
    ['SingleRowNonIndexed',
     this.querySingleRowNonIndexed, this.verifySingleRowNonIndexed],
    ['SingleRowMultipleIndices',
     this.querySingleRowMultipleIndices, this.verifySingleRowMultipleIndices],
    ['MultiRowIndexedRange',
     this.queryMultiRowIndexedRange, this.verifyMultiRowIndexedRange],
    ['MultiRowIndexedSpacedOut',
     this.queryMultiRowIndexedSpacedOut, this.verifyMultiRowIndexedSpacedOut],
    ['MultiRowNonIndexedRange',
     this.queryMultiRowNonIndexedRange, this.verifyMultiRowNonIndexedRange],
    ['MultiRowNonIndexedSpacedOut',
     this.queryMultiRowNonIndexedSpacedOut,
     this.verifyMultiRowNonIndexedSpacedOut],
    ['IndexedOrPredicate',
      this.queryIndexedOrPredicate,
      this.verifyIndexedOrPredicate],
    ['IndexedOrPredicateMultiColumn',
      this.queryIndexedOrPredicateMultiColumn,
      this.verifyIndexedOrPredicateMultiColumn],
    ['IndexedInPredicate',
      this.queryIndexedInPredicate,
      // Intentionally using the same verification method as with the OR case.
      this.verifyIndexedOrPredicate],
    ['OrderByIndexed', this.queryOrderByIndexed, this.verifyOrderByIndexed],
    ['OrderByNonIndexed',
     this.queryOrderByNonIndexed, this.verifyOrderByNonIndexed],
    ['OrderByIndexedCrossColumn',
      this.queryOrderByIndexedCrossColumn,
      this.verifyOrderByIndexedCrossColumn],
    ['LimitSkipIndexed',
     this.queryLimitSkipIndexed, this.verifyLimitSkipIndexed],
    ['ProjectNonAggregatedColumns',
      this.queryProjectNonAggregatedColumns,
      this.verifyProjectNonAggregatedColumns],
    ['ProjectAggregateIndexed',
      this.queryProjectAggregateIndexed,
      this.verifyProjectAggregateIndexed],
    ['ProjectAggregateNonIndexed',
      this.queryProjectAggregateNonIndexed,
      this.verifyProjectAggregateNonIndexed],
    ['JoinEqui', this.queryJoinEqui, this.verifyJoinEqui],
    ['JoinTheta', this.queryJoinTheta, this.verifyJoinTheta],
    ['CountStar', this.queryCountStar, this.verifyCountStar]
  ];

  return testCases.map(function(testCase) {
    var testCaseName = testCase[0];
    var queryFn = testCase[1].bind(this);
    var verifyFn = testCase[2].bind(this);
    return new lf.testing.perf.TestCase(testCaseName, queryFn, verifyFn);
  }, this);
};


/**
 * Creates a SelectBenchmark instance with mock data from the specified JSON
 * file.
 * @param {string} jsonFilename
 * @param {!lf.Database} db
 * @return {!IThenable<!lf.testing.perf.SelectBenchmark>}
 */
lf.testing.perf.SelectBenchmark.fromJson = function(jsonFilename, db) {
  return loadSampleDatafromJson(jsonFilename).then(
      function(sampleData) {
        var dataGenerator =
            lf.testing.hrSchema.MockDataGenerator.fromExportData(
                /** @type {!lf.testing.perf.hr.db.schema.Database} */ (
                    db.getSchema()), sampleData);
        return new lf.testing.perf.SelectBenchmark(db, dataGenerator);
      });
};


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

});  // goog.scope
