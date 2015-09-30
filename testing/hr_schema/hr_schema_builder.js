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

goog.require('lf.ConstraintAction');
goog.require('lf.Order');
goog.require('lf.Type');
goog.require('lf.schema');


/**
 * @param {string=} opt_name Optional schema name, default is hr + timestamp.
 * @return {!lf.schema.Builder}
 */
lf.testing.hrSchema.getSchemaBuilder = function(opt_name) {
  var name = opt_name || 'hr' + goog.now();
  var schemaBuilder = lf.schema.create(name, 1);
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
      addForeignKey('fk_EmployeeId', {
        local: 'employeeId',
        ref: 'Employee.id',
        action: lf.ConstraintAction.RESTRICT
      }).
      addForeignKey('fk_DepartmentId', {
        local: 'departmentId',
        ref: 'Department.id',
        action: lf.ConstraintAction.RESTRICT
      });

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
      addForeignKey('fk_JobId', {
        local: 'jobId',
        ref: 'Job.id',
        action: lf.ConstraintAction.RESTRICT
      }).
      addForeignKey('fk_DepartmentId', {
        local: 'departmentId',
        ref: 'Department.id',
        action: lf.ConstraintAction.RESTRICT
      }).
      addIndex('idx_salary', ['salary'], false, lf.Order.DESC).
      addNullable(['hireDate']);

  schemaBuilder.createTable('Department').
      addColumn('id', lf.Type.STRING).
      addColumn('name', lf.Type.STRING).
      addColumn('managerId', lf.Type.STRING).
      addColumn('locationId', lf.Type.STRING).
      addPrimaryKey(['id']).
      addForeignKey('fk_LocationId', {
        local: 'locationId',
        ref: 'Location.id',
        action: lf.ConstraintAction.RESTRICT
      });

  schemaBuilder.createTable('Location').
      addColumn('id', lf.Type.STRING).
      addColumn('streetAddress', lf.Type.STRING).
      addColumn('postalCode', lf.Type.STRING).
      addColumn('city', lf.Type.STRING).
      addColumn('stateProvince', lf.Type.STRING).
      addColumn('countryId', lf.Type.INTEGER).
      addPrimaryKey(['id']).
      addForeignKey('fk_CountryId', {
        local: 'countryId',
        ref: 'Country.id',
        action: lf.ConstraintAction.RESTRICT
      });

  schemaBuilder.createTable('Country').
      addColumn('id', lf.Type.INTEGER).
      addColumn('name', lf.Type.STRING).
      addColumn('regionId', lf.Type.STRING).
      addPrimaryKey(['id'], true).
      addForeignKey('fk_RegionId', {
        local: 'regionId',
        ref: 'Region.id',
        action: lf.ConstraintAction.RESTRICT
      });

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
      addUnique('uq_constraint', ['integer', 'string2']).
      addNullable(['datetime']);

  schemaBuilder.createTable('CrossColumnTable').
      addColumn('integer1', lf.Type.INTEGER).
      addColumn('integer2', lf.Type.INTEGER).
      addColumn('string1', lf.Type.STRING).
      addColumn('string2', lf.Type.STRING).
      addNullable(['string1', 'string2']).
      addIndex('idx_ascDesc', [
        {
          'name': 'integer1',
          'order': lf.Order.ASC
        },
        {
          'name': 'integer2',
          'order': lf.Order.DESC
        }], true).
      addIndex('idx_crossNull', ['string1', 'string2'], true).
      persistentIndex(true);

  return schemaBuilder;
};
