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
goog.provide('lf.testing.hrSchema.MockDataGenerator');

goog.require('goog.labs.structs.Multimap');
goog.require('goog.math');
goog.require('goog.structs.Set');
goog.require('lf.testing.hrSchema.EmployeeDataGenerator');
goog.require('lf.testing.hrSchema.JobDataGenerator');



/**
 * A helper class for generating sample database rows, and also ground truth
 * data for the generated rows.
 * @constructor
 *
 * @param {!hr.db.schema.Database} schema
 */
lf.testing.hrSchema.MockDataGenerator = function(schema) {
  /** @private {!hr.db.schema.Database} */
  this.schema_ = schema;

  /** @type {!Array.<!hr.db.row.Job>} */
  this.sampleJobs = [];

  /** @type {!Array.<!hr.db.row.Employee>} */
  this.sampleEmployees = [];

  /** @type {!lf.testing.hrSchema.MockDataGenerator.JobGroundTruth} */
  this.jobGroundTruth;

  /** @type {!lf.testing.hrSchema.MockDataGenerator.EmployeeGroundTruth} */
  this.employeeGroundTruth;
};


/**
 * @typedef {{
 *   minSalary: number,
 *   maxSalary: number,
 *   avgSalary: number,
 *   stddevSalary: number,
 *   countSalary: number,
 *   minHireDate: !Date,
 *   maxHireDate: !Date
 * }}
 */
lf.testing.hrSchema.MockDataGenerator.EmployeeGroundTruth;


/**
 * @typedef {{
 *   minMinSalary: number,
 *   maxMinSalary: number,
 *   distinctMinSalary: !Array.<number>,
 *   countDistinctMinSalary: number,
 *   avgDistinctMinSalary: number,
 *   stddevDistinctMinSalary: number,
 *   minMaxSalary: number,
 *   maxMaxSalary: number,
 *   distinctMaxSalary: !Array.<number>,
 *   countDistinctMaxSalary: number,
 *   avgDistinctMaxSalary: number,
 *   stddevDistinctMaxSalary: number
 * }}
 */
lf.testing.hrSchema.MockDataGenerator.JobGroundTruth;


/**
 * Generates sample Employee and Job rows, and calculates all ground truth data
 * about the generated rows.
 * @param {number} jobCount The number of Job rows to generate.
 * @param {number} employeeCount The number of Employee rows to generate.
 */
lf.testing.hrSchema.MockDataGenerator.prototype.generate = function(
    jobCount, employeeCount) {
  var employeeGenerator =
      new lf.testing.hrSchema.EmployeeDataGenerator(this.schema_);
  this.sampleEmployees = employeeGenerator.generate(employeeCount);

  var jobGenerator =
      new lf.testing.hrSchema.JobDataGenerator(this.schema_);
  this.sampleJobs = jobGenerator.generate(jobCount);

  this.jobGroundTruth = this.extractJobGroundTruth_();
  this.employeeGroundTruth = this.extractEmployeeGroundTruth_();
};


/**
 * @return {!lf.testing.hrSchema.MockDataGenerator.JobGroundTruth}
 * @private
 */
lf.testing.hrSchema.MockDataGenerator.prototype.extractJobGroundTruth_ =
    function() {
  var minSalary = function(job) { return job.getMinSalary(); };
  var maxSalary = function(job) { return job.getMaxSalary(); };

  return {
    minMinSalary: this.findJobMin_(minSalary),
    maxMinSalary: this.findJobMax_(minSalary),
    distinctMinSalary: this.findJobDistinct_(minSalary),
    sumDistinctMinSalary:
        goog.math.sum.apply(null, this.findJobDistinct_(minSalary)),
    countDistinctMinSalary: this.findJobDistinct_(minSalary).length,
    avgDistinctMinSalary:
        goog.math.average.apply(null, this.findJobDistinct_(minSalary)),
    stddevDistinctMinSalary: goog.math.standardDeviation.apply(
        null, this.findJobDistinct_(minSalary)),
    minMaxSalary: this.findJobMin_(maxSalary),
    maxMaxSalary: this.findJobMax_(maxSalary),
    distinctMaxSalary: this.findJobDistinct_(maxSalary),
    sumDistinctMaxSalary:
        goog.math.sum.apply(null, this.findJobDistinct_(maxSalary)),
    countDistinctMaxSalary: this.findJobDistinct_(maxSalary).length,
    avgDistinctMaxSalary:
        goog.math.average.apply(null, this.findJobDistinct_(maxSalary)),
    stddevDistinctMaxSalary: goog.math.standardDeviation.apply(
        null, this.findJobDistinct_(maxSalary))
  };
};


/**
 * @return {!lf.testing.hrSchema.MockDataGenerator.EmployeeGroundTruth}
 * @private
 */
lf.testing.hrSchema.MockDataGenerator.prototype.extractEmployeeGroundTruth_ =
    function() {
  // TODO(dpapad): Calculate ground truth data, and migrate select_benchmark.js
  // to use this generator.
  var salary = function(employee) { return employee.getSalary(); };

  return {
    employeesPerJob: this.findEmployeesPerJob_(),
    minSalary: 0,
    maxSalary: 0,
    avgSalary:
        goog.math.average.apply(null, this.sampleEmployees.map(salary)),
    stddevSalary: goog.math.standardDeviation.apply(
        null, this.sampleEmployees.map(salary)),
    countSalary: 0,
    minHireDate: this.findEmployeeMinDate_(),
    maxHireDate: this.findEmployeeMaxDate_()
  };
};


/**
 * Finds the MIN of a given attribute in the Job table.
 * @param {!function(!hr.db.row.Job): number} getterFn The function to call for
 *     accessing the attribute of interest.
 * @return {number} The min value.
 * @private
 */
lf.testing.hrSchema.MockDataGenerator.prototype.findJobMin_ = function(
    getterFn) {
  var jobsSorted = this.sampleJobs.slice().sort(
      function(job1, job2) { return getterFn(job1) - getterFn(job2); });
  return getterFn(jobsSorted[0]);
};


/**
 * Finds the MAX of a given attribute in the Job table.
 * @param {!function(!hr.db.row.Job): number} getterFn The function to call for
 *     accessing the attribute of interest.
 * @return {number} The max value.
 * @private
 */
lf.testing.hrSchema.MockDataGenerator.prototype.findJobMax_ = function(
    getterFn) {
  var jobsSorted = this.sampleJobs.slice().sort(
      function(job1, job2) { return getterFn(job2) - getterFn(job1); });
  return getterFn(jobsSorted[0]);
};


/**
 * Finds the DISTINCT of a given attribute in the Job table.
 * @param {!function(!hr.db.row.Job): number} getterFn The function to call for
 *     accessing the attribute of interest.
 * @return {!Array.<number>} The distinct values.
 * @private
 */
lf.testing.hrSchema.MockDataGenerator.prototype.findJobDistinct_ = function(
    getterFn) {
  var valueSet = new goog.structs.Set();
  this.sampleJobs.forEach(function(job) {
    valueSet.add(getterFn(job));
  }, this);
  return valueSet.getValues();
};


/**
 * Finds the association between Jobs and Employees.
 * @return {!goog.labs.structs.Multimap.<string, string>} A map where the key
 *     is a job ID and the value is a collection of Employee IDs.
 * @private
 */
lf.testing.hrSchema.MockDataGenerator.prototype.findEmployeesPerJob_ =
    function() {
  var employeesPerJob = new goog.labs.structs.Multimap();
  this.sampleEmployees.forEach(function(employee) {
    employeesPerJob.add(employee.getJobId(), employee.getId());
  });
  return employeesPerJob;
};


/**
 * Finds the MIN hireDate attribute in the Employee table.
 * @return {!Date} The min value.
 * @private
 */
lf.testing.hrSchema.MockDataGenerator.prototype.findEmployeeMinDate_ =
    function() {
  var employeesSorted = this.sampleEmployees.slice().sort(
      function(employee1, employee2) {
        return employee1.getHireDate() - employee2.getHireDate();
      });
  return employeesSorted[0].getHireDate();
};


/**
 * Finds the MAX hireDate attribute in the Employee table.
 * @return {!Date} The min value.
 * @private
 */
lf.testing.hrSchema.MockDataGenerator.prototype.findEmployeeMaxDate_ =
    function() {
  var employeesSorted = this.sampleEmployees.slice().sort(
      function(employee1, employee2) {
        return employee2.getHireDate() - employee1.getHireDate();
      });
  return employeesSorted[0].getHireDate();
};
