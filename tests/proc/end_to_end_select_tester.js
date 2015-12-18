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
goog.provide('lf.testing.EndToEndSelectTester');

goog.require('goog.Promise');
goog.require('goog.array');
goog.require('goog.object');
goog.require('goog.testing.jsunit');
goog.require('lf.Order');
goog.require('lf.bind');
goog.require('lf.fn');
goog.require('lf.op');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.hrSchema.MockDataGenerator');
goog.require('lf.testing.util');



/**
 * @constructor @struct
 *
 * @param {!Function} connectFn
 */
lf.testing.EndToEndSelectTester = function(connectFn) {
  this.connectFn_ = connectFn;

  /** @private {?lf.Database} */
  this.db_ = null;

  /** @private {!lf.schema.Table} */
  this.j_;

  /** @private {!lf.schema.Table} */
  this.e_;

  /** @private {!lf.schema.Table} */
  this.d_;

  /** @private {!lf.schema.Table} */
  this.c_;

  /** @private {!lf.schema.Table} */
  this.r_;

  /** @private {!lf.schema.Table} */
  this.l_;

  /** @private {!lf.schema.Table} */
  this.cct_;

  /** @private {!lf.testing.hrSchema.MockDataGenerator} */
  this.dataGenerator_;

  /** @private {!Array<function(): !IThenable>} */
  this.testCases_ = [
    this.testAll.bind(this),
    this.testLimit.bind(this),
    this.testLimitZero.bind(this),
    this.testLimitIndex.bind(this),
    this.testLimitIndexZero.bind(this),
    this.testSkip.bind(this),
    this.testSkipZero.bind(this),
    this.testSkipIndex.bind(this),
    this.testSkipIndexZero.bind(this),
    this.testPredicate.bind(this),
    this.testPredicate_IsNull.bind(this),
    this.testAs.bind(this),
    this.testColumnFiltering.bind(this),
    this.testImplicitJoin.bind(this),
    this.testImplicitJoin_ReverseOrder.bind(this),
    this.testImplicitJoin_Alias.bind(this),
    this.testSelfJoin.bind(this),
    this.testMultiJoin_Implicit.bind(this),
    this.testMultiJoin_Explicit.bind(this),
    this.testPredicate_VarArgAnd.bind(this),
    this.testPredicate_VarArgOr.bind(this),
    this.testCrossColumnNullable_PartialMatch.bind(this),
    this.testCrossColumnNullable_FullMatch.bind(this),
    this.testExplicitJoin.bind(this),
    this.testOuterJoin.bind(this),
    this.testOuterJoinWithWhere.bind(this),
    this.testOuterMultiJoinWithWhere.bind(this),
    this.testOuterInnerJoin.bind(this),
    this.testInnerOuterJoin.bind(this),
    this.testOuterJoin_reversePredicate.bind(this),
    this.testOuterJoin_Alias.bind(this),
    this.testExplicitJoin_WithCrossProduct.bind(this),
    this.testOrderBy_Descending.bind(this),
    this.testOrderBy_Ascending.bind(this),
    this.testOrderBy_Multiple.bind(this),
    this.testOrderBy_Aggregate.bind(this),
    this.testOrderBy_Distinct.bind(this),
    this.testOrderBy_NonProjectedAggregate.bind(this),
    this.testGroupBy.bind(this),
    this.testGroupByWithLimit.bind(this),
    this.testAggregatorsOnly.bind(this),
    this.testCount_Empty.bind(this),
    this.testMin_EmptyTable.bind(this),
    this.testMax_EmptyTable.bind(this),
    this.testCount_Star.bind(this),
    this.testCount_Distinct.bind(this),
    this.testSum_Distinct.bind(this),
    this.testAvg_Distinct.bind(this),
    this.testStddev_Distinct.bind(this),
    this.testDistinct.bind(this),
    this.testInnerJoinOrderBy.bind(this),
    this.testParamBinding.bind(this),
    this.testForgetParamBindingRejects.bind(this),
    this.testInvalidParamBindingThrows.bind(this)
  ];
};


/**
 * Runs all the tests.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.run = function() {
  // this.setUp_ only needs to be run once, given that all queries in this test
  // collection are SELECT, and they do not modify the database.
  return this.setUp_().then(
      function() {
        return lf.testing.util.sequentiallyRun(this.testCases_);
      }.bind(this));
};


/**
 * @return {!IThenable}
 * @private
 */
lf.testing.EndToEndSelectTester.prototype.setUp_ = function() {
  return this.connectFn_({
    'storeType': lf.schema.DataStoreType.MEMORY
  }).then(
      function(db) {
        this.db_ = db;
        this.dataGenerator_ =
            new lf.testing.hrSchema.MockDataGenerator(db.getSchema());
        this.j_ = db.getSchema().table('Job');
        this.e_ = db.getSchema().table('Employee');
        this.d_ = db.getSchema().table('Department');
        this.c_ = db.getSchema().table('Country');
        this.r_ = db.getSchema().table('Region');
        this.l_ = db.getSchema().table('Location');
        this.cct_ = db.getSchema().table('CrossColumnTable');
        return this.addSampleData_();
      }.bind(this));
};


/**
 * @return {!IThenable}
 * @private
 */
lf.testing.EndToEndSelectTester.prototype.addSampleData_ = function() {
  this.dataGenerator_.generate(
      /* jobCount */ 50,
      /* employeeCount */ 300,
      /* departmentCount */ 10);

  var r = this.r_;
  var c = this.c_;
  var l = this.l_;

  return this.db_.createTransaction().exec([
    this.db_.insert().into(r).values(this.dataGenerator_.sampleRegions),
    this.db_.insert().into(c).values(this.dataGenerator_.sampleCountries),
    this.db_.insert().into(l).values(this.dataGenerator_.sampleLocations),
    this.db_.insert().into(this.d_).values(
        this.dataGenerator_.sampleDepartments),
    this.db_.insert().into(this.j_).values(this.dataGenerator_.sampleJobs),
    this.db_.insert().into(this.e_).values(this.dataGenerator_.sampleEmployees),
    this.db_.insert().into(this.cct_).values(this.getSampleCrossColumnTable_())
  ]);
};


/**
 * Sample rows for the CrossColumnTable, which contains a nullable cross-column
 * index.
 * @return {!Array<!lf.Row>}
 * @private
 */
lf.testing.EndToEndSelectTester.prototype.getSampleCrossColumnTable_ =
    function() {
  var sampleRows = new Array(20);
  var padZeros = function(n) {
    return (n < 10) ? ('0' + n) : n;
  };

  for (var i = 0; i < 20; i++) {
    sampleRows[i] = this.cct_.createRow({
      integer1: i,
      integer2: i * 10,
      // Generating a null value for i = [10, 12, 14].
      string1: (i % 2 == 0 && i >= 10 && i < 15) ?
          null : ('string1_' + padZeros(i)),
      // Generating a null value for i = 16 and 18.
      string2: (i % 2 == 0 && i >= 15) ?
          null : ('string2_' + (i * 10).toString())
    });
  }
  return sampleRows;
};


/**
 * Tests that a SELECT query without a specified predicate selects the entire
 * table.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testAll = function() {
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().from(this.j_));

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(this.dataGenerator_.sampleJobs.length, results.length);
      }.bind(this), fail);
};


/**
 * Tests that a SELECT query with a specified limit respects that limit.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testLimit = function() {
  return this.checkSelect_Limit_(Math.floor(
      this.dataGenerator_.sampleJobs.length / 3));
};


/**
 * Tests that a SELECT query with a specified limit of zero respects that limit.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testLimitZero = function() {
  return this.checkSelect_Limit_(0);
};


/**
 * @param {number} limit
 * @return {!IThenable}
 * @private
 */
lf.testing.EndToEndSelectTester.prototype.checkSelect_Limit_ = function(limit) {
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().from(this.j_).limit(limit));

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(limit, results.length);
      });
};


/**
 * Tests that a SELECT query with a specified limit respects that limit.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testLimitIndex = function() {
  return this.checkSelectIndex_Limit_(Math.floor(
      this.dataGenerator_.sampleJobs.length / 3));
};


/**
 * Tests that a SELECT query with a specified limit of zero respects that limit.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testLimitIndexZero = function() {
  return this.checkSelectIndex_Limit_(0);
};


/**
 * @param {number} limit
 * @return {!IThenable}
 * @private
 */
lf.testing.EndToEndSelectTester.prototype.checkSelectIndex_Limit_ = function(
    limit) {
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().
          from(this.j_).
          where(this.j_.maxSalary.gt(0)).
          limit(limit));
  var plan = queryBuilder.explain();
  assertTrue(plan.indexOf('index_range_scan') != -1);
  assertTrue(plan.indexOf('skip') == -1);

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(limit, results.length);
      });
};


/**
 * Tests that a SELECT query with a specified SKIP actually skips those rows.
 * @return {!IThenable<!Array<Object>>}
 */
lf.testing.EndToEndSelectTester.prototype.testSkip = function() {
  return this.checkSelect_Skip_(Math.floor(
      this.dataGenerator_.sampleJobs.length / 3));
};


/**
 * Tests that a SELECT query with a specified SKIP of zero skips no rows.
 * @return {!IThenable<!Array<Object>>}
 */
lf.testing.EndToEndSelectTester.prototype.testSkipZero = function() {
  return this.checkSelect_Skip_(0);
};


/**
 * @param {number} skip
 * @return {!IThenable}
 * @private
 */
lf.testing.EndToEndSelectTester.prototype.checkSelect_Skip_ = function(skip) {
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().from(this.j_).skip(skip));

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(
            this.dataGenerator_.sampleJobs.length - skip, results.length);
      }.bind(this));
};


/**
 * Tests that a SELECT query with a specified SKIP actually skips those rows.
 * @return {!IThenable<!Array<Object>>}
 */
lf.testing.EndToEndSelectTester.prototype.testSkipIndex = function() {
  return this.checkSelectIndex_Skip_(Math.floor(
      this.dataGenerator_.sampleJobs.length / 3));
};


/**
 * Tests that a SELECT query with a specified SKIP of zero skips no rows.
 * @return {!IThenable<!Array<Object>>}
 */
lf.testing.EndToEndSelectTester.prototype.testSkipIndexZero = function() {
  return this.checkSelectIndex_Skip_(0);
};


/**
 * @param {number} skip
 * @return {!IThenable}
 * @private
 */
lf.testing.EndToEndSelectTester.prototype.checkSelectIndex_Skip_ = function(
    skip) {
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().
          from(this.j_).
          where(this.j_.maxSalary.gt(0)).
          skip(skip));
  var plan = queryBuilder.explain();
  assertTrue(plan.indexOf('index_range_scan') != -1);
  assertTrue(plan.indexOf('limit') == -1);

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(
            this.dataGenerator_.sampleJobs.length - skip, results.length);
      }.bind(this));
};


/**
 * Tests that a SELECT query with a specified predicate selects only the rows
 * that satisfy the predicate.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testPredicate = function() {
  var targetId = this.dataGenerator_.sampleJobs[3].payload()['id'];

  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().from(this.j_).where(this.j_.id.eq(targetId)));

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(targetId, results[0].id);
      });
};


/** @return {!IThenable} */
lf.testing.EndToEndSelectTester.prototype.testPredicate_IsNull =
    function() {
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (this.db_.
      select().
      from(this.cct_).
      where(this.cct_['string1'].isNull()));

  // TODO(dpapad): Currently isNull() predicates do not leverage indices.
  // Reverse the assertion below once addressed.
  var plan = queryBuilder.explain();
  assertFalse(plan.indexOf(
      'index_range_scan(CrossColumnTable.idx_crossNull') != -1);

  return queryBuilder.exec().then(
      function(results) {
        assertSameElements(
            [10, 12, 14],
            results.map(function(obj) { return obj['integer1'] }));
      });
};


/**
 * Tests the case where a cross-column nullable index is being used, even though
 * the predicates only bind the first indexed column, but not the 2nd indexed
 * column.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testCrossColumnNullable_PartialMatch =
    function() {
  var targetValue = 'string1_09';
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (this.db_.
      select().
      from(this.cct_).
      where(this.cct_['string1'].gt(targetValue)));

  // Ensure that cross-column nullable index is being used.
  var plan = queryBuilder.explain();
  assertTrue(plan.indexOf(
      'index_range_scan(CrossColumnTable.idx_crossNull') != -1);

  return queryBuilder.exec().then(
      function(results) {
        // Rows with integer1 value of 14, 16 and 18 have string1 value of null,
        // so should not appear in the results.
        assertSameElements(
            [11, 13, 15, 16, 17, 18, 19],
            results.map(function(obj) { return obj['integer1'] }));
      });
};


/**
 * Tests the case where a cross-column nullable index is being used and both
 * indexed columns are bound by predicates.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testCrossColumnNullable_FullMatch =
    function() {
  var targetString1 = 'string1_08';
  var targetString2 = 'string2_80';
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (this.db_.
      select().
      from(this.cct_).
      where(lf.op.and(
          this.cct_['string1'].eq(targetString1),
          this.cct_['string2'].eq(targetString2))));

  // Ensure that cross-column nullable index is being used.
  var plan = queryBuilder.explain();
  assertTrue(plan.indexOf(
      'index_range_scan(CrossColumnTable.idx_crossNull') != -1);

  return queryBuilder.exec().then(
      function(results) {
        assertSameElements(
            [8],
            results.map(function(obj) { return obj['integer1'] }));
      });
};


/** @return {!IThenable} */
lf.testing.EndToEndSelectTester.prototype.testAs = function() {
  var targetId = this.dataGenerator_.sampleJobs[3].payload()['id'];
  var j = this.j_;
  var q1 = this.db_.select(j.id.as('Foo')).from(j).where(j.id.eq(targetId));
  var q2 = this.db_.select(j.id).from(j).where(j.id.eq(targetId));

  return q1.exec().then(function(results) {
    assertEquals(1, results.length);
    assertEquals(targetId, results[0]['Foo']);
    return q2.exec();
  }).then(function(results) {
    assertEquals(1, results.length);
    assertEquals(targetId, results[0][j.id.getName()]);
  });
};


/**
 * Tests that a SELECT query with column filtering only returns the columns that
 * were requested.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testColumnFiltering = function() {
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select(this.j_.id, this.j_.title.as('Job Title')).
      from(this.j_));

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(this.dataGenerator_.sampleJobs.length, results.length);
        results.forEach(function(result) {
          assertEquals(2, goog.object.getCount(result));
          assertTrue(goog.isDefAndNotNull(result.id));
          assertTrue(goog.isDefAndNotNull(result['Job Title']));
        });
      }.bind(this));
};


/**
 * Tests the case of a SELECT query with an implicit join.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testImplicitJoin = function() {
  var jobId = 'jobId' +
      Math.floor(this.dataGenerator_.sampleJobs.length / 2).toString();
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().
      from(this.e_, this.j_).
      where(lf.op.and(
          this.e_.jobId.eq(jobId),
          this.e_.jobId.eq(this.j_.id))));

  return queryBuilder.exec().then(
      function(results) {
        this.assertEmployeesForJob_(this.e_, jobId, results);
      }.bind(this));
};


/**
 * Tests the case of a SELECT query with an implicit join and with a join
 * predicate that is in reverse order compared to the ordering of tables in the
 * from() clause.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testImplicitJoin_ReverseOrder =
    function() {
  var jobId = 'jobId' +
      Math.floor(this.dataGenerator_.sampleJobs.length / 2).toString();

  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().
      from(this.j_, this.e_).
      where(lf.op.and(
          this.e_.jobId.eq(jobId),
          this.e_.jobId.eq(this.j_.id))));

  return queryBuilder.exec().then(
      function(results) {
        this.assertEmployeesForJob_(this.e_, jobId, results);
      }.bind(this));
};


/**
 * Tests the case of a SELECT query with an implicit join and with the involved
 * tables using aliases.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testImplicitJoin_Alias =
    function() {
  var jobId = 'jobId' +
      Math.floor(this.dataGenerator_.sampleJobs.length / 2).toString();
  var j1 = this.j_.as('j1');
  var e1 = this.e_.as('e1');

  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().
      from(j1, e1).
      where(lf.op.and(
          e1.jobId.eq(jobId),
          e1.jobId.eq(j1.id))));

  return queryBuilder.exec().then(
      function(results) {
        this.assertEmployeesForJob_(e1, jobId, results);
      }.bind(this));
};


/**
 * Tests the case where a SELECT query with a self-table join is being issued.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testSelfJoin = function() {
  var j1 = this.j_.as('j1');
  var j2 = this.j_.as('j2');

  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().
      from(j1, j2).
      where(j1.minSalary.eq(j2.maxSalary)).
      orderBy(j1.id, lf.Order.ASC).
      orderBy(j2.id, lf.Order.ASC));

  return queryBuilder.exec().then(
      function(results) {
        var groundTruth = this.dataGenerator_.jobGroundTruth.selfJoinSalary;
        assertEquals(groundTruth.length, results.length);
        for (var i = 0; i < results.length; i++) {
          assertEquals(
              results[i][j1.getAlias()].id, groundTruth[i][0].payload()['id']);
          assertEquals(
              results[i][j2.getAlias()].id, groundTruth[i][1].payload()['id']);
        }
      }.bind(this));
};


/**
 * Tests the case of a SELECT query with a 3+ table join.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testMultiJoin_Implicit =
    function() {
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().
      from(this.e_, this.j_, this.d_).
      where(lf.op.and(
          this.e_.jobId.eq(this.j_.id),
          this.e_.departmentId.eq(this.d_.id))));
  return this.checkMultiJoin_(queryBuilder);
};


/**
 * Tests the case of a SELECT query with a 3+ table join.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testMultiJoin_Explicit =
    function() {
  var d = this.d_;
  var e = this.e_;
  var j = this.j_;
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().
      from(e).
      innerJoin(j, j.id.eq(e.jobId)).
      innerJoin(d, d.id.eq(e.departmentId)));
  return this.checkMultiJoin_(queryBuilder);
};


/**
 * Executes and checks the given multi-join query (implicit vs explicit).
 * @param {!lf.query.SelectBuilder} queryBuilder
 * @return {!IThenable}
 * @private
 */
lf.testing.EndToEndSelectTester.prototype.checkMultiJoin_ =
    function(queryBuilder) {
  var d = this.d_;
  var e = this.e_;
  var j = this.j_;
  return queryBuilder.exec().then(
      function(results) {
        assertEquals(
            this.dataGenerator_.sampleEmployees.length, results.length);
        results.forEach(function(obj) {
          assertEquals(3, goog.object.getCount(obj));
          assertTrue(goog.isDefAndNotNull(obj[e.getName()]));
          assertTrue(goog.isDefAndNotNull(obj[j.getName()]));
          assertTrue(goog.isDefAndNotNull(obj[d.getName()]));

          var employeeJobId = obj[e.getName()][e.jobId.getName()];
          var employeeDepartmentId = obj[e.getName()][e.departmentId.getName()];
          var jobId = obj[j.getName()][j.id.getName()];
          var departmentId = obj[d.getName()][d.id.getName()];
          assertTrue(employeeJobId == jobId);
          assertTrue(employeeDepartmentId == departmentId);
        });
      }.bind(this));
};


/**
 * Tests the case of a SELECT with an AND condition that has 3 clauses.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testPredicate_VarArgAnd =
    function() {
  var sampleEmployee = this.dataGenerator_.sampleEmployees[
      Math.floor(this.dataGenerator_.sampleEmployees.length / 2)];
  var d = this.d_;
  var e = this.e_;
  var j = this.j_;
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().
      from(e, j, d).
      where(lf.op.and(
          e.jobId.eq(j.id),
          e.departmentId.eq(d.id),
          e.id.eq(sampleEmployee.payload()['id']))));

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(1, results.length);
        var obj = results[0];
        assertEquals(
            sampleEmployee.payload()['id'],
            obj[e.getName()][e.id.getName()]);
        assertEquals(
            sampleEmployee.payload()['jobId'],
            obj[j.getName()][j.id.getName()]);
        assertEquals(
            sampleEmployee.payload()['departmentId'],
            obj[d.getName()][d.id.getName()]);
        assertEquals(
            obj[e.getName()][e.jobId.getName()],
            obj[j.getName()][j.id.getName()]);
        assertEquals(
            obj[e.getName()][e.departmentId.getName()],
            obj[d.getName()][d.id.getName()]);
      });
};


/**
 * Tests the case of a SELECT with an OR condition that has 3 clauses.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testPredicate_VarArgOr =
    function() {
  var sampleJob = this.dataGenerator_.sampleJobs[
      Math.floor(this.dataGenerator_.sampleJobs.length / 2)];
  var j = this.j_;
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().
      from(j).
      where(lf.op.or(
          j.minSalary.eq(this.dataGenerator_.jobGroundTruth.minMinSalary),
          j.maxSalary.eq(this.dataGenerator_.jobGroundTruth.maxMaxSalary),
          j.title.eq(sampleJob.payload()['title']))));

  return queryBuilder.exec().then(
      function(results) {
        assertTrue(results.length >= 1);
        results.forEach(function(obj, index) {
          assertTrue(
              obj[j.minSalary.getName()] ==
                  this.dataGenerator_.jobGroundTruth.minMinSalary ||
              obj[j.maxSalary.getName()] ==
                  this.dataGenerator_.jobGroundTruth.maxMaxSalary ||
              obj[j.id.getName()] == sampleJob.payload()['id']);
        }, this);
      }.bind(this));
};


/**
 * Tests that a SELECT query with an explicit join.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testExplicitJoin = function() {
  var minSalaryLimit = 59000;

  var e = this.e_;
  var j = this.j_;
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().
      from(e).
      innerJoin(j, j.id.eq(e.jobId)).
      where(j.minSalary.gt(minSalaryLimit)));

  return queryBuilder.exec().then(
      function(results) {
        var expectedJobs = this.dataGenerator_.sampleJobs.filter(
            function(job) {
              return job.payload()['minSalary'] > minSalaryLimit;
            });

        var expectedEmployeeCount = expectedJobs.reduce(
            function(soFar, job) {
              return soFar + this.dataGenerator_.employeeGroundTruth.
                  employeesPerJob.get(job.payload()['id']).length;
            }.bind(this), 0);

        assertEquals(expectedEmployeeCount, results.length);
        results.forEach(function(result) {
          assertTrue(this.dataGenerator_.employeeGroundTruth.employeesPerJob.
              containsEntry(
                  result[e.getName()]['jobId'],
                  result[e.getName()]['id']));
        }, this);
      }.bind(this));
};


/**
 * @param {!lf.schema.Table} leftTable
 * @param {!lf.schema.Table} rightTable
 * @param {!Array<{
 *     Region: !hr.db.row.RegionType,
 *     Country: !hr.db.row.CountryType}>} results
 * @private
 */
lf.testing.EndToEndSelectTester.prototype.assertOuterJoinResult_ = function(
    leftTable, rightTable, results) {
  assertEquals(
      this.dataGenerator_.sampleRegions.length + 1, results.length);
  var expectedMatched = 2;
  var matchedRows = results.slice(0, expectedMatched);
  matchedRows.forEach(function(resultRow) {
    Object.keys(resultRow[rightTable.getEffectiveName()]).forEach(
        function(column) {
          assertNotNull(resultRow[rightTable.getEffectiveName()][column]);
        });
  });
  var unMatchedRows = results.slice(expectedMatched);
  unMatchedRows.forEach(function(resultRow) {
    Object.keys(resultRow[rightTable.getEffectiveName()]).forEach(
        function(column) {
          assertNull(resultRow[rightTable.getEffectiveName()][column]);
        });
  });
  results.forEach(function(resultRow) {
    Object.keys(resultRow[leftTable.getEffectiveName()]).forEach(
        function(column) {
          assertNotNull(resultRow[leftTable.getEffectiveName()][column]);
        });
  });
};


/**
 * @param {!lf.schema.Table} table1
 * @param {!lf.schema.Table} table2
 * @param {!lf.schema.Table} table3
 * @param {!Array<{
 *     Region: !hr.db.row.RegionType,
 *     Country: !hr.db.row.CountryType,
 *     Location: !hr.db.row.LocationType}>} results
 * @private
 */
lf.testing.EndToEndSelectTester.prototype.assertOuterInnerJoinResult_ =
    function(table1, table2, table3, results) {
  assertEquals(
      this.dataGenerator_.sampleLocations.length, results.length);
  // All are non-null.
  results.forEach(function(resultRow) {
    Object.keys(resultRow[table1.getEffectiveName()]).forEach(
        function(column) {
          assertNotNull(resultRow[table1.getEffectiveName()][column]);
        });
    Object.keys(resultRow[table2.getEffectiveName()]).forEach(
        function(column) {
          assertNotNull(resultRow[table2.getEffectiveName()][column]);
        });
    Object.keys(resultRow[table3.getEffectiveName()]).forEach(
        function(column) {
          assertNotNull(resultRow[table3.getEffectiveName()][column]);
        });
  });
};


/**
 * @param {!lf.schema.Table} table1
 * @param {!lf.schema.Table} table2
 * @param {!lf.schema.Table} table3
 * @param {!Array<{
 *     Region: !hr.db.row.RegionType,
 *     Country: !hr.db.row.CountryType,
 *     Location: !hr.db.row.LocationType}>} results
 * @private
 */
lf.testing.EndToEndSelectTester.prototype.assertInnerOuterJoinResult_ =
    function(table1, table2, table3, results) {
  assertEquals(
      this.dataGenerator_.sampleCountries.length, results.length);
  var expectedMatched = 1;
  // The matched rows are non-null.
  results.slice(0, expectedMatched).forEach(function(resultRow) {
    Object.keys(resultRow[table1.getEffectiveName()]).forEach(
        function(column) {
          assertNotNull(resultRow[table1.getEffectiveName()][column]);
        });
    Object.keys(resultRow[table2.getEffectiveName()]).forEach(
        function(column) {
          assertNotNull(resultRow[table2.getEffectiveName()][column]);
        });
    Object.keys(resultRow[table3.getEffectiveName()]).forEach(
        function(column) {
          assertNotNull(resultRow[table3.getEffectiveName()][column]);
        });
  });
  //  The first two tables have non-null entries and third table null.
  results.slice(expectedMatched, results.length).forEach(function(resultRow) {
    Object.keys(resultRow[table1.getEffectiveName()]).forEach(
        function(column) {
          assertNotNull(resultRow[table1.getEffectiveName()][column]);
        });
    Object.keys(resultRow[table2.getEffectiveName()]).forEach(
        function(column) {
          assertNotNull(resultRow[table2.getEffectiveName()][column]);
        });
    Object.keys(resultRow[table3.getEffectiveName()]).forEach(
        function(column) {
          assertNull(resultRow[table3.getEffectiveName()][column]);
        });
  });
};


/**
 * Tests a SELECT query with an outer join.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testOuterJoin = function() {
  var c = this.c_;
  var r = this.r_;
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().
      from(r).
      leftOuterJoin(c, r.id.eq(c.regionId)).
      orderBy(r.id, lf.Order.ASC));

  return queryBuilder.exec().then(
      function(results) {
        this.assertOuterJoinResult_(r, c, results);
      }.bind(this));
};


/**
 * Tests a SELECT query with an outer join and a where clause. It ensures that
 * the where clause is applied on the result of the join (and not before the
 * join has been calculated).
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testOuterJoinWithWhere = function() {
  var c = this.c_;
  var r = this.r_;
  var countryId = 2;
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().
      from(r).
      leftOuterJoin(c, r.id.eq(c.regionId)).
      orderBy(r.id, lf.Order.ASC).
      where(c.id.eq(countryId)));

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(countryId, results[0][c.getName()][c.id.getName()]);
        assertNotNull(results[0][r.getName()]);
        assertEquals(
            results[0][c.getName()][c.regionId.getName()],
            results[0][r.getName()][r.id.getName()]);
      }.bind(this));
};


/**
 * Tests a query with two outer joins and a composite where clause.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testOuterMultiJoinWithWhere =
    function() {
  var d = this.d_;
  var e = this.e_;
  var j = this.j_;
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().
      from(e).
      leftOuterJoin(j, e.jobId.eq(j.id)).
      leftOuterJoin(d, e.departmentId.eq(d.id)).
      where(lf.op.and(j.id.isNull(), d.id.isNull())));

  return queryBuilder.exec().then(
      function(results) {
        // Since every employee corresponds to an existing jobId and
        // departmentId expecting an empty result.
        assertEquals(0, results.length);
      }.bind(this));
};


/**
 * Tests a SELECT query with an outer join followed by inner join.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testOuterInnerJoin = function() {
  var c = this.c_;
  var r = this.r_;
  var l = this.l_;
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().
      from(c).
      leftOuterJoin(r, r.id.eq(c.regionId)).
      innerJoin(l, c.id.eq(l.countryId)).
      orderBy(r.id, lf.Order.ASC));

  return queryBuilder.exec().then(
      function(results) {
        this.assertOuterInnerJoinResult_(r, c, l, results);
      }.bind(this));
};


/**
 * Tests a SELECT query with an inner join followed by outer join.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testInnerOuterJoin = function() {
  var c = this.c_;
  var r = this.r_;
  var l = this.l_;
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().
      from(c).
      innerJoin(r, c.regionId.eq(r.id)).
      leftOuterJoin(l, c.id.eq(l.countryId)).
      orderBy(r.id, lf.Order.ASC));

  return queryBuilder.exec().then(
      function(results) {
        this.assertInnerOuterJoinResult_(c, r, l, results);
      }.bind(this));
};


/**
 * Tests a SELECT left outer join query with the reversed order of columns
 * in the predicate.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.
    testOuterJoin_reversePredicate = function() {
  var c = this.c_;
  var r = this.r_;
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().
      from(r).
      leftOuterJoin(c, c.regionId.eq(r.id)).
      orderBy(r.id, lf.Order.ASC));

  return queryBuilder.exec().then(
      function(results) {
        this.assertOuterJoinResult_(r, c, results);
      }.bind(this));
};


/**
 * Tests a SELECT query with an outer join on tables using alias.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testOuterJoin_Alias = function() {
  var c1 = this.c_.as('c1');
  var r1 = this.r_.as('r1');
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().
      from(r1).
      leftOuterJoin(c1, r1.id.eq(c1.regionId)).
      orderBy(r1.id, lf.Order.ASC));

  return queryBuilder.exec().then(
      function(results) {
        this.assertOuterJoinResult_(r1, c1, results);
      }.bind(this));
};


/**
 * Tests that a SELECT query with an explicit join that also includes a cross
 * product with a third table (a table not involved in the join predicate).
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.
    testExplicitJoin_WithCrossProduct = function() {
  var sampleEmployee = this.dataGenerator_.sampleEmployees[
      Math.floor(this.dataGenerator_.sampleEmployees.length / 2)];
  var expectedDepartmentId = sampleEmployee.payload()['departmentId'];
  var d = this.d_;
  var e = this.e_;
  var j = this.j_;
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().
      from(e, d).
      innerJoin(j, j.id.eq(e.jobId)).
      where(d.id.eq(expectedDepartmentId)));

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(
            this.dataGenerator_.sampleEmployees.length, results.length);
        results.forEach(function(obj) {
          assertEquals(3, goog.object.getCount(obj));
          assertTrue(goog.isDefAndNotNull(obj[e.getName()]));
          assertTrue(goog.isDefAndNotNull(obj[j.getName()]));
          assertTrue(goog.isDefAndNotNull(obj[d.getName()]));

          var departmentId = obj[d.getName()][d.id.getName()];
          assertEquals(expectedDepartmentId, departmentId);

          var employeeJobId = obj[e.getName()][e.jobId.getName()];
          var jobId = obj[j.getName()][j.id.getName()];
          assertEquals(employeeJobId, jobId);
        });
      }.bind(this));
};


/** @return {!IThenable} */
lf.testing.EndToEndSelectTester.prototype.testOrderBy_Ascending =
    function() {
  var j = this.j_;
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().from(j).orderBy(j.minSalary, lf.Order.ASC));

  return queryBuilder.exec().then(
      function(results) {
        this.assertOrder_(results, j.minSalary, lf.Order.ASC);
      }.bind(this));
};


/** @return {!IThenable} */
lf.testing.EndToEndSelectTester.prototype.testOrderBy_Descending =
    function() {
  var j = this.j_;
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().from(j).orderBy(j.maxSalary, lf.Order.DESC));

  return queryBuilder.exec().then(
      function(results) {
        this.assertOrder_(results, j.maxSalary, lf.Order.DESC);
      }.bind(this));
};


/**
 * Tests the case where the results are ordered by more than one columns.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testOrderBy_Multiple =
    function() {
  var j = this.j_;
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().from(j).
          orderBy(j.maxSalary, lf.Order.DESC).
          orderBy(j.minSalary, lf.Order.ASC));

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(results.length, this.dataGenerator_.sampleJobs.length);
        this.assertOrder_(results, j.maxSalary, lf.Order.DESC);

        // Assert that within entries that have the same maxSalary, the
        // minSalary appears in ASC order.
        var maxSalaryBuckets = goog.array.bucket(
            results, function(result) { return result.maxSalary; });
        goog.object.forEach(maxSalaryBuckets, function(partialResults) {
          this.assertOrder_(partialResults, j.minSalary, lf.Order.ASC);
        }, this);
      }.bind(this));
};


/**
 * Tests the case where the results are ordered by an aggregate column (in
 * combination with GROUP_BY).
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testOrderBy_Aggregate =
    function() {
  var e = this.e_;
  var aggregatedColumn = lf.fn.min(e.salary);
  var order = lf.Order.ASC;
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select(e.jobId, aggregatedColumn).
      from(e).
      orderBy(aggregatedColumn, order).
      groupBy(e.jobId));

  return queryBuilder.exec().then(
      function(results) {
        this.assertOrder_(results, aggregatedColumn, order);
      }.bind(this));
};


/**
 * Tests the case where the ordering is requested on a column that is being
 * projected as a DISTINCT aggregation.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testOrderBy_Distinct =
    function() {
  var e = this.e_;
  var aggregatedColumn = lf.fn.distinct(e.jobId);
  var order = lf.Order.DESC;
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select(aggregatedColumn).
      from(e).
      orderBy(e.jobId, order));

  return queryBuilder.exec().then(
      function(results) {
        this.assertOrder_(results, aggregatedColumn, order);
      }.bind(this));
};


/**
 * Tests the case where the results are ordered by an aggregate column (in
 * combination with GROUP_BY), but that aggregate column is not present in the
 * projection list.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testOrderBy_NonProjectedAggregate =
    function() {
  var e = this.e_;
  var aggregatedColumn = lf.fn.min(e.salary);
  var order = lf.Order.ASC;
  var queryBuilder1 = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select(e.jobId, aggregatedColumn).
      from(e).
      orderBy(aggregatedColumn, order).
      groupBy(e.jobId));

  var queryBuilder2 = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select(e.jobId).
      from(e).
      orderBy(aggregatedColumn, order).
      groupBy(e.jobId));

  var expectedJobIdOrder = null;
  // First executing the query with the aggregated column in the projected list,
  // to get the expected jobId ordering.
  return queryBuilder1.exec().then(function(results) {
    this.assertOrder_(results, aggregatedColumn, order);
    expectedJobIdOrder = results.map(function(obj) {
      return obj[e.jobId.getName()];
    });
    // Then executing the same query without the aggregated column in the
    // projected list.
    return queryBuilder2.exec();
  }.bind(this)).then(function(results) {
    var actualJobIdOrder = results.map(function(obj) {
      return obj[e.jobId.getName()];
    });
    assertArrayEquals(expectedJobIdOrder, actualJobIdOrder);
  }.bind(this));
};


/** @return {!IThenable} */
lf.testing.EndToEndSelectTester.prototype.testGroupBy = function() {
  var e = this.e_;
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select(e.jobId, lf.fn.avg(e.salary), lf.fn.count(e.id)).
      from(e).
      groupBy(e.jobId));

  return queryBuilder.exec().then(
      function(results) {
        var expectedResultCount = this.dataGenerator_.employeeGroundTruth.
            employeesPerJob.getKeys().length;
        assertEquals(expectedResultCount, results.length);
        this.assertGroupByResults_(results);
      }.bind(this));
};


/** @return {!IThenable} */
lf.testing.EndToEndSelectTester.prototype.testGroupByWithLimit = function() {
  var limit = 2;
  var e = this.e_;
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select(e.jobId, lf.fn.avg(e.salary), lf.fn.count(e.id)).
      from(e).
      limit(limit).
      groupBy(e.jobId));

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(limit, results.length);
        this.assertGroupByResults_(results);
      }.bind(this));
};


/**
 * Helper function for performing assertions an the results of
 * testSelect_GroupBy and testSelect_GroupByWithLimit.
 * @param {!Array<Object>} results
 * @private
 */
lf.testing.EndToEndSelectTester.prototype.assertGroupByResults_ =
    function(results) {
  var e = this.e_;
  results.forEach(function(obj) {
    assertEquals(3, goog.object.getCount(obj));
    assertTrue(goog.isDefAndNotNull(obj[e.jobId.getName()]));
    assertTrue(goog.isDefAndNotNull(
        obj[lf.fn.avg(e.salary).getName()]));

    // Verifying that each group has the correct count of employees.
    var employeesPerJobCount = obj[lf.fn.count(e.id).getName()];
    var expectedEmployeesPerJobCount = this.dataGenerator_.
        employeeGroundTruth.employeesPerJob.get(
            obj[e.jobId.getName()]).length;
    assertEquals(expectedEmployeesPerJobCount, employeesPerJobCount);
  }, this);
};


/**
 * Tests the case where a MIN,MAX aggregators are used without being mixed up
 * with non-aggregated columns.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testAggregatorsOnly =
    function() {
  var aggregatedColumn1 = lf.fn.max(this.j_.maxSalary);
  var aggregatedColumn2 = lf.fn.min(this.j_.maxSalary).as('minS');
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select(aggregatedColumn1, aggregatedColumn2).from(this.j_));

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(2, goog.object.getCount(results[0]));
        assertEquals(
            this.dataGenerator_.jobGroundTruth.maxMaxSalary,
            results[0][aggregatedColumn1.getName()]);
        assertEquals(
            this.dataGenerator_.jobGroundTruth.minMaxSalary,
            results[0][aggregatedColumn2.getAlias()]);
      }.bind(this));
};


/**
 * Tests the case where a COUNT and DISTINCT aggregators are combined.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testCount_Distinct =
    function() {
  var aggregatedColumn = lf.fn.count(
      lf.fn.distinct(this.j_.maxSalary)).as('NS');
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select(aggregatedColumn).from(this.j_));

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(1, goog.object.getCount(results[0]));
        assertEquals(
            this.dataGenerator_.jobGroundTruth.countDistinctMaxSalary,
            results[0][aggregatedColumn.getAlias()]);
      }.bind(this));
};


/**
 * Tests the case where a COUNT aggregator is used on an empty table.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testCount_Empty = function() {
  var h = this.db_.getSchema().table('Holiday');
  var aggregatedColumn = lf.fn.count(h.name);
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select(aggregatedColumn).from(h));

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(1, goog.object.getCount(results[0]));
        assertEquals(0, results[0][aggregatedColumn.getName()]);
      });
};


/**
 * Tests the case where a COUNT(*) aggregator is used.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testCount_Star = function() {
  var e = this.db_.getSchema().table('Employee');
  var aggregatedColumn = lf.fn.count();
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select(aggregatedColumn).from(e));

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(1, goog.object.getCount(results[0]));
        assertEquals(
            this.dataGenerator_.sampleEmployees.length,
            results[0][aggregatedColumn.getName()]);
      }.bind(this));
};


/**
 * Tests the case where a MIN aggregator is used on an empty table.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testMin_EmptyTable = function() {
  var h = this.db_.getSchema().table('Holiday');
  var aggregatedColumn = lf.fn.min(h.begin);
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select(aggregatedColumn).from(h));

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(1, goog.object.getCount(results[0]));
        assertNull(results[0][aggregatedColumn.getName()]);
      });
};


/**
 * Tests the case where a MAX aggregator is used on an empty table.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testMax_EmptyTable = function() {
  var h = this.db_.getSchema().table('Holiday');
  var aggregatedColumn = lf.fn.max(h.begin);
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select(aggregatedColumn).from(h));

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(1, goog.object.getCount(results[0]));
        assertNull(results[0][aggregatedColumn.getName()]);
      });
};


/**
 * Tests the case where a SUM and DISTINCT aggregators are combined.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testSum_Distinct = function() {
  var aggregatedColumn = lf.fn.sum(lf.fn.distinct(this.j_.maxSalary));
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select(aggregatedColumn).from(this.j_));

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(1, goog.object.getCount(results[0]));
        assertEquals(
            this.dataGenerator_.jobGroundTruth.sumDistinctMaxSalary,
            results[0][aggregatedColumn.getName()]);
      }.bind(this));
};


/**
 * Tests the case where a AVG and DISTINCT aggregators are combined.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testAvg_Distinct = function() {
  var aggregatedColumn = lf.fn.avg(lf.fn.distinct(this.j_.maxSalary));
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select(aggregatedColumn).from(this.j_));

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(1, goog.object.getCount(results[0]));
        assertEquals(
            this.dataGenerator_.jobGroundTruth.avgDistinctMaxSalary,
            results[0][aggregatedColumn.getName()]);
      }.bind(this));
};


/**
 * Tests the case where a STDDEV and DISTINCT aggregators are combined.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testStddev_Distinct =
    function() {
  var aggregatedColumn = lf.fn.stddev(lf.fn.distinct(this.j_.maxSalary));
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select(aggregatedColumn).from(this.j_));

  return queryBuilder.exec().then(
      function(results) {
        assertEquals(1, results.length);
        assertEquals(1, goog.object.getCount(results[0]));
        assertEquals(
            this.dataGenerator_.jobGroundTruth.stddevDistinctMaxSalary,
            results[0][aggregatedColumn.getName()]);
      }.bind(this));
};


/**
 * Tests the case where a DISTINCT aggregator is used on its own.
 * @return {!IThenable}
 */
lf.testing.EndToEndSelectTester.prototype.testDistinct = function() {
  var aggregatedColumn = lf.fn.distinct(this.j_.maxSalary);
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select(aggregatedColumn).from(this.j_));

  return queryBuilder.exec().then(
      function(results) {
        var distinctSalaries = results.map(function(result) {
          return result[aggregatedColumn.getName()];
        });
        assertSameElements(
            this.dataGenerator_.jobGroundTruth.distinctMaxSalary,
            distinctSalaries);
      }.bind(this));
};


/**
 * Asserts the ordering of a given list of results.
 * @param {!Array<!Object>} results The results to be examined.
 * @param {!lf.schema.Column} column The column on which the entries are sorted.
 * @param {!lf.Order} order The expected ordering of the entries.
 * @private
 */
lf.testing.EndToEndSelectTester.prototype.assertOrder_ = function(
    results, column, order) {
  var soFar = null;
  results.forEach(function(result, index) {
    var value = result[column.getName()];
    if (index > 0) {
      assertTrue(order == lf.Order.DESC ?
          value <= soFar : value >= soFar);
    }
    soFar = value;
  });
};


/**
 * Asserts that the returned employees for a given job are agreeing with the
 * ground truth data.
 * @param {!lf.schema.Table} employeeSchema
 * @param {string} jobId
 * @param {!Array<{
 *     Employee: !hr.db.row.EmployeeType,
 *     Job: !hr.db.row.JobType}>} actualEmployees
 * @private
 */
lf.testing.EndToEndSelectTester.prototype.assertEmployeesForJob_ = function(
    employeeSchema, jobId, actualEmployees) {
  var expectedEmployeeIds =
      this.dataGenerator_.employeeGroundTruth.employeesPerJob.get(jobId);
  var actualEmployeeIds = actualEmployees.map(function(result) {
    return result[employeeSchema.getEffectiveName()]['id'];
  });
  assertSameElements(expectedEmployeeIds, actualEmployeeIds);
};


/** @return {!IThenable} */
lf.testing.EndToEndSelectTester.prototype.testInnerJoinOrderBy =
    function() {
  var expected = this.dataGenerator_.sampleEmployees.map(function(row) {
    return row.payload()['lastName'];
  }).sort();

  var d = this.d_;
  var e = this.e_;
  return this.db_.select(d.name, e.lastName.as('elname'), e.firstName).
      from(d, e).
      where(e.departmentId.eq(d.id)).
      orderBy(e.lastName).
      exec().then(
      function(results) {
        var actual = results.map(function(row) {
          return row['elname'];
        });
        assertArrayEquals(expected, actual);
      });
};


/** @return {!IThenable} */
lf.testing.EndToEndSelectTester.prototype.testParamBinding = function() {
  var targetId = this.dataGenerator_.sampleJobs[3].payload()['id'];
  var queryBuilder = /** @type {!lf.query.SelectBuilder} */ (
      this.db_.select().from(this.j_).where(this.j_.id.eq(lf.bind(1))));

  return queryBuilder.bind(['', '']).exec().then(function(results) {
    assertEquals(0, results.length);
    return queryBuilder.bind(['', targetId]).exec();
  }).then(function(results) {
    assertEquals(1, results.length);
    assertEquals(targetId, results[0].id);
    return queryBuilder.exec();
  }).then(function(results) {
    assertEquals(1, results.length);
    assertEquals(targetId, results[0].id);
  });
};


/** @return {!IThenable} */
lf.testing.EndToEndSelectTester.prototype.testForgetParamBindingRejects =
    function() {
  var q = this.db_.select().from(this.j_).where(this.j_.id.eq(lf.bind(1)));
  return q.exec().then(fail, function(e) {
    // 501: Value is not bounded.
    assertEquals(501, e.code);
  });
};


/** @return {!IThenable} */
lf.testing.EndToEndSelectTester.prototype.testInvalidParamBindingThrows =
    function() {
  return new goog.Promise(function(resolve, reject) {
    var j = this.j_;
    var q = this.db_.select().from(j).where(j.id.eq(lf.bind(1)));
    var thrown = false;
    try {
      q.bind([0]);
    } catch (e) {
      thrown = true;
      // 510: Cannot bind to given array: out of range..
      assertEquals(510, e.code);
    }
    assertTrue(thrown);

    thrown = false;
    q = this.db_.select().from(j).where(j.id.between(lf.bind(0), lf.bind(1)));
    try {
      q.bind([0]);
    } catch (e) {
      thrown = true;
      // 510: Cannot bind to given array: out of range.
      assertEquals(510, e.code);
    }
    assertTrue(thrown);
    resolve();
  }.bind(this));
};
