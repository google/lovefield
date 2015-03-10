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
goog.setTestOnly();
goog.require('goog.Promise');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.cache.Journal');
goog.require('lf.eval.Type');
goog.require('lf.fn');
goog.require('lf.pred.JoinPredicate');
goog.require('lf.proc.AggregationStep');
goog.require('lf.proc.Relation');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.hrSchema.MockDataGenerator');
goog.require('lf.testing.proc.DummyStep');


/** @type {!hr.db.schema.Employee} */
var e;


/** @type {!hr.db.schema.Job} */
var j;


/** @type {!lf.testing.hrSchema.MockDataGenerator} */
var dataGenerator;


function setUp() {
  var schema = hr.db.getSchema();
  j = schema.getJob();
  e = schema.getEmployee();
  dataGenerator = new lf.testing.hrSchema.MockDataGenerator(schema);
  dataGenerator.generate(20, 100, 0);
  return hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY});
}


function testExec_Min() {
  return checkCalculation(
      lf.fn.min(j.maxSalary), dataGenerator.jobGroundTruth.minMaxSalary);
}


function testExec_Max() {
  return checkCalculation(
      lf.fn.max(j.maxSalary), dataGenerator.jobGroundTruth.maxMaxSalary);
}


function testExec_Distinct() {
  return checkCalculation(
      lf.fn.distinct(j.maxSalary),
      dataGenerator.jobGroundTruth.distinctMaxSalary);
}


function testExec_Count_Distinct() {
  return checkCalculation(
      lf.fn.count(lf.fn.distinct(j.minSalary)),
      dataGenerator.jobGroundTruth.countDistinctMinSalary);
}


function testExec_Avg_Distinct() {
  return checkCalculation(
      lf.fn.avg(lf.fn.distinct(j.minSalary)),
      dataGenerator.jobGroundTruth.avgDistinctMinSalary);
}


function testExec_Sum_Distinct() {
  return checkCalculation(
      lf.fn.sum(lf.fn.distinct(j.minSalary)),
      dataGenerator.jobGroundTruth.sumDistinctMinSalary);
}


function testExec_Stddev_Distinct() {
  return checkCalculation(
      lf.fn.stddev(lf.fn.distinct(j.minSalary)),
      dataGenerator.jobGroundTruth.stddevDistinctMinSalary);
}


function checkCalculation(aggregatedColumn, expectedValue) {
  return goog.Promise.all([
    checkCalculationWithoutJoin(aggregatedColumn, expectedValue),
    checkCalculationWithJoin(aggregatedColumn, expectedValue)
  ]);
}


/**
 * Checks that performing a transformation on a relationship that is *not* the
 * result of a natural join, results in a relation with fields that are
 * populated as expected.
 * @param {!lf.fn.AggregatedColumn} aggregatedColumn The column to be
 *     calculated.
 * @param {number} expectedValue The expected value for the aggregated column.
 * @return {!IThenable}
 */
function checkCalculationWithoutJoin(aggregatedColumn, expectedValue) {
  var inputRelation = lf.proc.Relation.fromRows(
      dataGenerator.sampleJobs, [j.getName()]);
  return checkCalculationForRelation(
      inputRelation, aggregatedColumn, expectedValue);
}


/**
 * Checks that performing a transformation on a relationship that is the
 * result of a natural join, results in a relation with fields that are
 * populated as expected.
 * @param {!lf.fn.AggregatedColumn} aggregatedColumn The column to be
 *     calculated.
 * @param {number} expectedValue The expected value for the aggregated column.
 * @return {!IThenable}
 */
function checkCalculationWithJoin(aggregatedColumn, expectedValue) {
  var relationLeft = lf.proc.Relation.fromRows(
      dataGenerator.sampleEmployees, [e.getName()]);
  var relationRight = lf.proc.Relation.fromRows(
      dataGenerator.sampleJobs, [j.getName()]);
  var joinPredicate = new lf.pred.JoinPredicate(
      e.jobId, j.id, lf.eval.Type.EQ);
  var joinedRelation = joinPredicate.evalRelations(relationLeft, relationRight);
  return checkCalculationForRelation(
      joinedRelation, aggregatedColumn, expectedValue);
}


/**
 * @param {!lf.proc.Relation} inputRelation
 * @param {!lf.fn.AggregatedColumn} aggregatedColumn The column to be
 *     calculated.
 * @param {number|!Array} expectedValue The expected value for the aggregated
 *     column.
 * @return {!IThenable}
 */
function checkCalculationForRelation(
    inputRelation, aggregatedColumn, expectedValue) {
  var childStep = new lf.testing.proc.DummyStep([inputRelation]);
  var aggregationStep = new lf.proc.AggregationStep([aggregatedColumn]);
  aggregationStep.addChild(childStep);

  var journal = new lf.cache.Journal(hr.db.getGlobal(), []);
  return aggregationStep.exec(journal).then(function(relations) {
    var relation = relations[0];
    if (expectedValue instanceof Array) {
      assertEquals(
          expectedValue.length,
          relation.getAggregationResult(aggregatedColumn).entries.length);
    } else {
      assertEquals(
          expectedValue,
          relation.getAggregationResult(aggregatedColumn));
    }
  });
}
