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
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.proc.GroupByStep');
goog.require('lf.proc.NoOpStep');
goog.require('lf.proc.Relation');
goog.require('lf.testing.hrSchema.MockDataGenerator');


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
}


/**
 * Tests GroupByStep#exec() method for the case where grouping is performed on a
 * single column.
 * @return {!IThenable}
 */
function testExec_SingleColumn() {
  var inputRelation = lf.proc.Relation.fromRows(
      dataGenerator.sampleEmployees, [e.getName()]);
  var childStep = new lf.proc.NoOpStep([inputRelation]);
  var groupByStep = new lf.proc.GroupByStep([e.jobId]);
  groupByStep.addChild(childStep);

  var employeesPerJob = dataGenerator.employeeGroundTruth.employeesPerJob;
  return groupByStep.exec().then(function(relations) {
    var jobIds = employeesPerJob.getKeys();
    assertEquals(jobIds.length, relations.length);
    relations.forEach(function(relation) {
      var jobId = /** @type {string} */ (relation.entries[0].getField(e.jobId));
      var expectedRows = employeesPerJob.get(jobId);
      assertEquals(expectedRows.length, relation.entries.length);
      relation.entries.forEach(function(entry) {
        assertEquals(jobId, entry.getField(e.jobId));
      });
    });
  });
}


/**
 * Tests GroupByStep#exec() method for the case where grouping is performed on
 * multiple columns.
 * @return {!IThenable}
 */
function testExec_MultiColumn() {
  var inputRelation = lf.proc.Relation.fromRows(
      dataGenerator.sampleJobs, [j.getName()]);
  var childStep = new lf.proc.NoOpStep([inputRelation]);
  var groupByStep = new lf.proc.GroupByStep([j.minSalary, j.maxSalary]);
  groupByStep.addChild(childStep);

  return groupByStep.exec().then(function(relations) {
    var jobCount = 0;
    relations.forEach(function(relation) {
      var groupByMinSalary = relation.entries[0].getField(j.minSalary);
      var groupByMaxSalary = relation.entries[0].getField(j.maxSalary);
      relation.entries.forEach(function(entry) {
        assertEquals(groupByMinSalary, entry.getField(j.minSalary));
        assertEquals(groupByMaxSalary, entry.getField(j.maxSalary));
        jobCount++;
      });
    });
    assertEquals(inputRelation.entries.length, jobCount);
  });
}
