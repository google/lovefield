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
goog.provide('lf.testing.hrSchema.getSchemaBuilder');

goog.require('lf.Order');
goog.require('lf.Type');
goog.require('lf.schema');


/** @return {!lf.schema.Builder} */
lf.testing.hrSchema.getSchemaBuilder = function() {
  var schemaBuilder = lf.schema.create('hr' + goog.now(), 1);
  schemaBuilder.createTable('Job').
      addColumn('id', lf.Type.STRING).
      addColumn('title', lf.Type.STRING).
      addColumn('minSalary', lf.Type.NUMBER).
      addColumn('maxSalary', lf.Type.NUMBER).
      addPrimaryKey(['id']).
      addIndex('idx_maxSalary', ['maxSalary'], false, lf.Order.DESC);

  schemaBuilder.createTable('JobHistory').
      addColumn('employeeId', lf.Type.STRING).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addForeignKey('fk_EmployeeId', 'employeeId', 'Employee', 'id', true).
      addForeignKey(
          'fk_DepartmentId', 'departmentId', 'Department', 'id', true);

  schemaBuilder.createTable('Employee').
      addColumn('id', lf.Type.STRING).
      addColumn('firstName', lf.Type.STRING).
      addColumn('lastName', lf.Type.STRING).
      addColumn('email', lf.Type.STRING).
      addColumn('phoneNumber', lf.Type.STRING).
      addColumn('hireDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('salary', lf.Type.NUMBER).
      addColumn('commissionPercent', lf.Type.NUMBER).
      addColumn('managerId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addColumn('photo', lf.Type.ARRAY_BUFFER).
      addPrimaryKey(['id']).
      addForeignKey('fk_JobId', 'jobId', 'Job', 'id', true).
      addForeignKey(
          'fk_DepartmentId', 'departmentId', 'Department', 'id', true).
      addIndex('idx_salary', ['salary'], false, lf.Order.DESC).
      addNullable(['hireDate']);

  schemaBuilder.createTable('Department').
      addColumn('id', lf.Type.STRING).
      addColumn('name', lf.Type.STRING).
      addColumn('managerId', lf.Type.STRING).
      addColumn('locationId', lf.Type.STRING).
      addPrimaryKey(['id']).
      addForeignKey('fk_ManagerId', 'managerId', 'Employee', 'id', false).
      addForeignKey('fk_LocationId', 'locationId', 'Location', 'id', true);

  schemaBuilder.createTable('Location').
      addColumn('id', lf.Type.STRING).
      addColumn('streetAddress', lf.Type.STRING).
      addColumn('postalCode', lf.Type.STRING).
      addColumn('city', lf.Type.STRING).
      addColumn('stateProvince', lf.Type.STRING).
      addColumn('countryId', lf.Type.STRING).
      addPrimaryKey(['id']).
      addForeignKey('fk_CountryId', 'countryId', 'Country', 'id', true);

  schemaBuilder.createTable('Country').
      addColumn('id', lf.Type.INTEGER).
      addColumn('name', lf.Type.STRING).
      addColumn('regionId', lf.Type.STRING).
      addPrimaryKey(['id'], true).
      addForeignKey('fk_RegionId', 'regionId', 'Region', 'id', true);

  schemaBuilder.createTable('Region').
      addColumn('id', lf.Type.STRING).
      addColumn('name', lf.Type.STRING).
      addPrimaryKey(['id']);

  schemaBuilder.createTable('Holiday').
      addColumn('name', lf.Type.STRING).
      addColumn('begin', lf.Type.DATE_TIME).
      addColumn('end', lf.Type.DATE_TIME).
      addIndex('idx_begin', ['begin'], false, lf.Order.ASC).
      addPrimaryKey(['name']).
      persistentIndex(true);

  schemaBuilder.createTable('DummyTable').
      addColumn('arraybuffer', lf.Type.ARRAY_BUFFER).
      addColumn('boolean', lf.Type.BOOLEAN).
      addColumn('datetime', lf.Type.DATE_TIME).
      addColumn('integer', lf.Type.INTEGER).
      addColumn('number', lf.Type.NUMBER).
      addColumn('string', lf.Type.STRING).
      addColumn('string2', lf.Type.STRING).
      addPrimaryKey(['string', 'number']).
      addUnique('uq_constraint', ['integer', 'string2']);

  return schemaBuilder;
};
