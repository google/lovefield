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
goog.provide('lf.testing.hrSchema.MockDataGenerator');

goog.require('goog.labs.structs.Multimap');
goog.require('goog.math');
goog.require('lf.Row');
goog.require('lf.structs.set');
goog.require('lf.testing.hrSchema.DepartmentDataGenerator');
goog.require('lf.testing.hrSchema.EmployeeDataGenerator');
goog.require('lf.testing.hrSchema.JobDataGenerator');



/**
 * A helper class for generating sample database rows, and also ground truth
 * data for the generated rows.
 * @constructor @struct
 *
 * @param {!lf.schema.Database} schema
 */
lf.testing.hrSchema.MockDataGenerator = function(schema) {
  /** @private {!lf.schema.Database} */
  this.schema_ = schema;

  /** @type {!Array<!lf.Row>} */
  this.sampleJobs = [];

  /** @type {!Array<!lf.Row>} */
  this.sampleEmployees = [];

  /** @type {!Array<!lf.Row>} */
  this.sampleDepartments = [];

  /** @type {!Array<!lf.Row>} */
  this.sampleLocations = [];

  /** @type {!Array<!lf.Row>} */
  this.sampleCountries = [];

  /** @type {!Array<!lf.Row>} */
  this.sampleRegions = [];

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
 *   maxHireDate: !Date,
 *   distinctHireDates: !Array<?Date>,
 *   employeesPerJob: !goog.labs.structs.Multimap<string, string>,
 *   thetaJoinSalaryIds: !Array<string>
 * }}
 */
lf.testing.hrSchema.MockDataGenerator.EmployeeGroundTruth;


/**
 * @typedef {{
 *   minMinSalary: number,
 *   maxMinSalary: number,
 *   distinctMinSalary: !Array<number>,
 *   sumDistinctMinSalary: number,
 *   countDistinctMinSalary: number,
 *   avgDistinctMinSalary: number,
 *   stddevDistinctMinSalary: number,
 *   minMaxSalary: number,
 *   maxMaxSalary: number,
 *   distinctMaxSalary: !Array<number>,
 *   countDistinctMaxSalary: number,
 *   avgDistinctMaxSalary: number,
 *   stddevDistinctMaxSalary: number,
     geomeanDistinctMaxSalary: number,
 *   selfJoinSalary: !Array<!Array<!lf.Row>>
 * }}
 */
lf.testing.hrSchema.MockDataGenerator.JobGroundTruth;


/**
 * Generates sample Employee and Job rows, and calculates all ground truth data
 * about the generated rows.
 * @param {number} jobCount The number of Job rows to generate.
 * @param {number} employeeCount The number of Employee rows to generate.
 * @param {number} departmentCount The number of Department rows to generate.
 */
lf.testing.hrSchema.MockDataGenerator.prototype.generate = function(
    jobCount, employeeCount, departmentCount) {
  var employeeGenerator =
      new lf.testing.hrSchema.EmployeeDataGenerator(this.schema_);
  employeeGenerator.setJobCount(jobCount);
  employeeGenerator.setDepartmentCount(departmentCount);
  this.sampleEmployees = employeeGenerator.generate(employeeCount);

  var jobGenerator =
      new lf.testing.hrSchema.JobDataGenerator(this.schema_);
  this.sampleJobs = jobGenerator.generate(jobCount);

  var departmentGenerator =
      new lf.testing.hrSchema.DepartmentDataGenerator(this.schema_);
  this.sampleDepartments = departmentGenerator.generate(departmentCount);

  var location = this.schema_.table('Location');
  this.sampleLocations = [
    location.createRow({
      id: 'locationId',
      streetAddress: 'dummyStreetAddress',
      postalCode: 'dummyPostalCode',
      city: 'dummyCity',
      stateProvince: 'dummyStateProvince',
      countryId: 1
    })
  ];
  var country = this.schema_.table('Country');
  this.sampleCountries = [
    country.createRow({
      id: 1,
      name: 'dummyCountryName',
      regionId: 'regionId'
    }),
    country.createRow({
      id: 2,
      name: 'dummyCountryName',
      regionId: 'regionId'
    })
  ];
  var region = this.schema_.table('Region');
  this.sampleRegions = [
    region.createRow({
      id: 'regionId',
      name: 'dummyRegionName'
    }),
    region.createRow({
      id: 'regionId2',
      name: 'dummyRegionName2'
    }),
    region.createRow({
      id: 'regionId3',
      name: 'dummyRegionName2'
    })
  ];

  this.jobGroundTruth = this.extractJobGroundTruth_();
  this.employeeGroundTruth = this.extractEmployeeGroundTruth_();
};


/**
 * @return {!lf.testing.hrSchema.MockDataGenerator.JobGroundTruth}
 * @private
 */
lf.testing.hrSchema.MockDataGenerator.prototype.extractJobGroundTruth_ =
    function() {
  var minSalary = function(job) { return job.payload()['minSalary']; };
  var maxSalary = function(job) { return job.payload()['maxSalary']; };

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
        null, this.findJobDistinct_(maxSalary)),
    geomeanDistinctMaxSalary:
        this.findGeomean_(this.findJobDistinct_(maxSalary)),
    selfJoinSalary: this.findSelfJoinSalary_()
  };
};


/**
 * @return {!lf.testing.hrSchema.MockDataGenerator.EmployeeGroundTruth}
 * @private
 */
lf.testing.hrSchema.MockDataGenerator.prototype.extractEmployeeGroundTruth_ =
    function() {
  var salary = function(employee) { return employee.payload()['salary']; };
  var hireDate = function(employee) { return employee.payload()['hireDate']; };
  return {
    employeesPerJob: this.findEmployeesPerJob_(),
    minSalary: 0,
    maxSalary: 0,
    avgSalary:
        goog.math.average.apply(null, this.sampleEmployees.map(salary)),
    stddevSalary: goog.math.standardDeviation.apply(
        null, this.sampleEmployees.map(salary)),
    countSalary: 0,
    distinctHireDates: this.findDistinct_(hireDate, this.sampleEmployees),
    minHireDate: this.findEmployeeMinDate_(),
    maxHireDate: this.findEmployeeMaxDate_(),
    thetaJoinSalaryIds: this.findThetaJoinSalaryIds_()
  };
};


/**
 * Finds the MIN of a given attribute in the Job table.
 * @param {!function(!lf.Row): number} getterFn The function to call for
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
 * @param {!function(!lf.Row): number} getterFn The function to call for
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
 * Finds the DISTINCT of a given attribute in the rows provided.
 * @param {!function(!lf.Row): *} getterFn The function to call for
 *     accessing the attribute of interest.
 * @param {!Array<!lf.Row>} rows
 * @return {!Array<*>} The distinct values.
 * @private
 */
lf.testing.hrSchema.MockDataGenerator.prototype.findDistinct_ = function(
    getterFn, rows) {
  var valueSet = lf.structs.set.create();
  rows.forEach(function(row) {
    valueSet.add(getterFn(row));
  }, this);
  return lf.structs.set.values(valueSet);
};


/**
 * Finds the DISTINCT of a given attribute in the Job table.
 * @param {!function(!lf.Row): number} getterFn The function to call for
 *     accessing the attribute of interest.
 * @return {!Array<number>} The distinct values.
 * @private
 */
lf.testing.hrSchema.MockDataGenerator.prototype.findJobDistinct_ = function(
    getterFn) {
  return this.findDistinct_(getterFn, this.sampleJobs);
};


/**
 * Finds all job pairs where j1.minSalary == j2.maxSalary.
 * @return {!Array<!Array<!lf.Row>>}
 * @private
 */
lf.testing.hrSchema.MockDataGenerator.prototype.findSelfJoinSalary_ =
    function() {
  var result = [];

  for (var i = 0; i < this.sampleJobs.length; i++) {
    var job1 = this.sampleJobs[i];
    for (var j = 0; j < this.sampleJobs.length; j++) {
      var job2 = this.sampleJobs[j];
      if (job1.payload()['minSalary'] == job2.payload()['maxSalary']) {
        result.push([job1, job2]);
      }
    }
  }

  // Sorting results to be in deterministic order such that they can be usefuld
  // for assertions.
  result.sort(function(jobPair1, jobPair2) {
    if (jobPair1[0].payload()['id'] < jobPair2[0].payload()['id']) {
      return -1;
    } else if (jobPair1[0].payload()['id'] > jobPair2[0].payload()['id']) {
      return 1;
    } else {
      if (jobPair1[1].payload()['id'] < jobPair2[1].payload()['id']) {
        return -1;
      } else if (jobPair1[1].payload()['id'] > jobPair2[1].payload()['id']) {
        return 1;
      }
      return 0;
    }
  });

  return result;
};


/**
 * Finds the GEOMEAN of a given set of values.
 * @param {!Array<number>} values
 * @return {number} The geometrical mean.
 * @private
 */
lf.testing.hrSchema.MockDataGenerator.prototype.findGeomean_ =
    function(values) {
  var reduced = values.reduce(function(soFar, value) {
    return soFar += Math.log(value);
  }, 0);
  return Math.pow(Math.E, reduced / values.length);
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
    employeesPerJob.add(employee.payload()['jobId'], employee.payload()['id']);
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
        return employee1.payload()['hireDate'] -
            employee2.payload()['hireDate'];
      });
  return employeesSorted[0].payload()['hireDate'];
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
        return employee2.payload()['hireDate'] -
            employee1.payload()['hireDate'];
      });
  return employeesSorted[0].payload()['hireDate'];
};


/**
 * Finds the IDs of all employees whose salary is larger than the MAX salary for
 * their job title.
 * Note: This is possible because generated employee data does not respect
 * corresponding min/max job salary.
 * @return {!Array<string>} The employee IDs in ascending sorted order.
 * @private
 */
lf.testing.hrSchema.MockDataGenerator.prototype.findThetaJoinSalaryIds_ =
    function() {
  var employeeIds = [];

  for (var i = 0; i < this.sampleEmployees.length; i++) {
    for (var j = 0; j < this.sampleJobs.length; j++) {
      var employee = this.sampleEmployees[i];
      var job = this.sampleJobs[j];
      if (employee.payload()['jobId'] == job.payload()['id'] &&
          employee.payload()['salary'] > job.payload()['maxSalary']) {
        employeeIds.push(employee.payload()['id']);
      }
    }
  }

  return employeeIds.sort();
};


/**
 * @typedef {{
 *   departments: !Array<!Object>,
 *   employees: !Array<!Object>,
 *   jobs: !Array<!Object>
 * }}
 */
lf.testing.hrSchema.MockDataGenerator.ExportData;


/**
 * Exports all data generated by this generator.
 * @return {!lf.testing.hrSchema.MockDataGenerator.ExportData}
 */
lf.testing.hrSchema.MockDataGenerator.prototype.exportData = function() {
  /** @type {!Array<!Object>} */
  var employeesPayloads = this.sampleEmployees.map(
      function(employee) {
        return employee.toDbPayload();
      });
  /** @type {!Array<!Object>} */
  var jobsPayloads = this.sampleJobs.map(
      function(job) {
        return job.toDbPayload();
      });
  /** @type {!Array<!Object>} */
  var departmentsPayloads = this.sampleDepartments.map(
      function(department) {
        return department.toDbPayload();
      });

  return {
    departments: departmentsPayloads,
    employees: employeesPayloads,
    jobs: jobsPayloads
  };
};


/**
 * Creates a MockDataGenerator with a fixed set of data.
 * @param {!lf.schema.Database} schema
 * @param {!lf.testing.hrSchema.MockDataGenerator.ExportData} data
 * @return {!lf.testing.hrSchema.MockDataGenerator}
 */
lf.testing.hrSchema.MockDataGenerator.fromExportData = function(schema, data) {
  var deserialize = function(tableSchema, obj) {
    return tableSchema.deserializeRow({
      'id': lf.Row.getNextId(),
      'value': obj
    });
  };

  var employeeSchema = schema.table('Employee');
  var employees = data.employees.map(function(obj) {
    return deserialize(employeeSchema, obj);
  });

  var jobSchema = schema.table('Job');
  var jobs = data.jobs.map(function(obj) {
    return deserialize(jobSchema, obj);
  });

  var departmentSchema = schema.table('Department');
  var departments = data.departments.map(function(obj) {
    return deserialize(departmentSchema, obj);
  });

  var generator = new lf.testing.hrSchema.MockDataGenerator(schema);
  generator.sampleJobs = jobs;
  generator.sampleEmployees = employees;
  generator.sampleDepartments = departments;
  generator.jobGroundTruth = generator.extractJobGroundTruth_();
  generator.employeeGroundTruth = generator.extractEmployeeGroundTruth_();

  return generator;
};
