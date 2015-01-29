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
goog.provide('lf.testing.hrSchemaSampleData');


/**
 * Generates a sample Employee record to be used for testing.
 * @param {!lf.Database} db
 * @return {!hr.db.row.Employee}
 */
lf.testing.hrSchemaSampleData.generateSampleEmployeeData = function(db) {
  var buffer = new ArrayBuffer(8);
  var view = new Uint8Array(buffer);
  for (var i = 0; i < 8; ++i) {
    view[i] = i;
  }

  return db.getSchema().getEmployee().createRow({
    id: 'empId',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@neverland.com',
    phoneNumber: '123456',
    // 'Fri Feb 01 1985 14:15:00 GMT-0800 (PST)'
    hireDate: new Date(476144100000),
    jobId: 'jobId',
    salary: 100,
    commissionPercent: 0.15,
    managerId: 'managerId',
    departmentId: 'departmentId',
    photo: buffer
  });
};


/**
 * Generates a sample Job record to be used for testing.
 * @param {!lf.Database} db
 * @return {!hr.db.row.Job}
 */
lf.testing.hrSchemaSampleData.generateSampleJobData = function(db) {
  return db.getSchema().getJob().createRow({
    id: 'jobId',
    title: 'Software Engineer',
    minSalary: 100000,
    maxSalary: 500000
  });
};


/**
 * Generates a sample Department record to be used for testing.
 * @param {!lf.Database} db
 * @return {!hr.db.row.Department}
 */
lf.testing.hrSchemaSampleData.generateSampleDepartmentData = function(db) {
  return db.getSchema().getDepartment().createRow({
    id: 'departmentId',
    name: 'departmentName',
    managerId: 'managerId',
    locationId: 'locationId'
  });
};


/**
 * Generates a sample JobHistory record to be used for testing.
 * @param {!lf.Database} db
 * @return {!hr.db.row.JobHistory}
 */
lf.testing.hrSchemaSampleData.generateSampleJobHistoryData = function(db) {
  return db.getSchema().getJobHistory().createRow({
    employeeId: 'employeeId',
    // 'Fri Feb 01 1985 14:15:00 GMT-0800 (PST)'
    startDate: new Date(476144100000),
    // 'Fri Feb 01 1986 14:15:00 GMT-0800 (PST)'
    endDate: new Date(507680100000),
    jobId: 'jobId',
    departmentId: 'departmentId'
  });
};
