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
goog.require('goog.testing.jsunit');
goog.require('lf.Order');
goog.require('lf.Row');
goog.require('lf.Type');
goog.require('lf.schema');
goog.require('lf.schema.BaseColumn');
goog.require('lf.schema.Table');


/** @return {!lf.schema.Builder} */
function createBuilder() {
  var ds = lf.schema.create('hr', 1);

  ds.createTable('Job').
      addColumn('id', lf.Type.STRING).
      addColumn('title', lf.Type.STRING).
      addColumn('minSalary', lf.Type.NUMBER).
      addColumn('maxSalary', lf.Type.NUMBER).
      addPrimaryKey(['id']).
      addIndex('idx_maxSalary', ['maxSalary'], lf.Order.DESC);

  ds.createTable('JobHistory').
      addColumn('employeeId', lf.Type.STRING).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addForeignKey('fk_EmployeeId', 'employeeId', 'Employee', 'id', true).
      addForeignKey('fk_DeptId', 'departmentId', 'Department', 'id', true);

  ds.createTable('Employee').
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
      addPrimaryKey([{'name': 'id', 'autoIncrement': true}]).
      addIndex('idx_salary', [{'name': 'salary', 'order': lf.Order.DESC}]).
      addForeignKey('fk_JobId', 'jobId', 'Job', 'id', true).
      addForeignKey('fk_DeptId', 'departmentId', 'Department', 'id', true).
      addNullable(['hireDate']);

  ds.createTable('Department').
      addColumn('id', lf.Type.STRING).
      addColumn('name', lf.Type.STRING).
      addColumn('managerId', lf.Type.STRING).
      addPrimaryKey([{'name': 'id', 'order': lf.Order.DESC}]).
      addForeignKey('fk_ManagerId', 'managerId', 'Employee', 'id');

  ds.createTable('DummyTable').
      addColumn('arraybuffer', lf.Type.ARRAY_BUFFER).
      addColumn('boolean', lf.Type.BOOLEAN).
      addColumn('datetime', lf.Type.DATE_TIME).
      addColumn('integer', lf.Type.INTEGER).
      addColumn('number', lf.Type.NUMBER).
      addColumn('object', lf.Type.OBJECT).
      addColumn('string', lf.Type.STRING).
      addIndex('idx_string', ['string'], lf.Order.ASC, true).
      addIndex('idx_number', [{'name': 'number'}], undefined, true).
      addNullable(['arraybuffer', 'object']);

  return ds;
}

function testNoDuplicateTable() {
  var ds = createBuilder();
  assertThrows(function() {
    ds.createTable('DummyTable');
  });
}

function testNoDplicateColumn() {
  var ds = createBuilder();
  assertThrows(function() {
    ds.createTable('Table2').
        addColumn('col', lf.Type.STRING).
        addColumn('col', lf.Type.STRING);
  });
}

function testNoModificationAfterFinalization() {
  var ds = createBuilder();
  ds.getSchema();
  assertThrows(function() {
    ds.createTable('NewTable');
  });
}

function testSchemaCorrectness() {
  var ds = createBuilder();
  var schema = ds.getSchema();
  var tables = schema.tables();
  assertEquals(5, tables.length);

  var emp = schema.table('Employee');
  assertTrue(emp instanceof lf.schema.Table);
  assertEquals('Employee', emp.getEffectiveName());
  var e = emp.as('e');
  assertEquals('e', e.getEffectiveName());
  assertEquals(2, emp.getIndices().length);
  assertEquals(12, emp.getColumns().length);
  assertTrue(emp['id'] instanceof lf.schema.BaseColumn);
  assertEquals('Employee.#', e.getRowIdIndexName());

  var dummy = schema.table('DummyTable');
  var row = dummy.createRow();
  assertTrue(row instanceof lf.Row);
  var payload = row.payload();
  assertEquals('', lf.Row.binToHex(payload['arraybuffer']));
  assertFalse(payload['boolean']);
  assertEquals(0, payload['datetime'].getTime());
  assertEquals(0, payload['integer']);
  assertEquals(0, payload['number']);
  assertObjectEquals({}, payload['object']);
  assertEquals('', payload['string']);

  var row2 = dummy.createRow({
    'arraybuffer': null,
    'boolean': true,
    'datetime': new Date(1),
    'integer': 2,
    'number': 3,
    'object': null,
    'string': 'bar'
  });
  var row3 = dummy.deserializeRow(row2.serialize());
  assertObjectEquals(row2.payload(), row3.payload());
}
