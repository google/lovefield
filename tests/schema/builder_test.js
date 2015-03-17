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
goog.require('lf.testing.util');


/** @return {!lf.schema.Builder} */
function createBuilder() {
  var ds = lf.schema.create('hr', 1);

  ds.createTable('Job').
      addColumn('id', lf.Type.STRING).
      addColumn('title', lf.Type.STRING).
      addColumn('minSalary', lf.Type.NUMBER).
      addColumn('maxSalary', lf.Type.NUMBER).
      addPrimaryKey(['id']).
      addIndex('idx_maxSalary', ['maxSalary'], false, lf.Order.DESC);

  ds.createTable('JobHistory').
      addColumn('employeeId', lf.Type.STRING).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addForeignKey('fk_EmployeeId', 'employeeId', 'Employee', 'id', true).
      addForeignKey('fk_DeptId', 'departmentId', 'Department', 'id', true);

  ds.createTable('Employee').
      addColumn('id', lf.Type.INTEGER).
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
      addIndex('idx_string', ['string'], true, lf.Order.ASC).
      addIndex('idx_number', [{'name': 'number'}], true).
      addNullable(['arraybuffer', 'object']);

  return ds;
}


function testThrows_DuplicateTable() {
  var ds = createBuilder();
  lf.testing.util.assertThrowsSyntaxError(function() {
    ds.createTable('DummyTable');
  });
}


function testThrows_DuplicateColumn() {
  var ds = createBuilder();
  lf.testing.util.assertThrowsSyntaxError(function() {
    ds.createTable('Table2').
        addColumn('col', lf.Type.STRING).
        addColumn('col', lf.Type.STRING);
  });
}


function testThrows_ModificationAfterFinalization() {
  var ds = createBuilder();
  ds.getSchema();
  lf.testing.util.assertThrowsSyntaxError(function() {
    ds.createTable('NewTable');
  });
}


function testThrows_CrossColumnPkWithAutoInc() {
  var ds = lf.schema.create('hr', 1);
  lf.testing.util.assertThrowsSyntaxError(function() {
    ds.createTable('Employee').
        addColumn('id1', lf.Type.INTEGER).
        addColumn('id2', lf.Type.INTEGER).
        addPrimaryKey([
          {'name': 'id1', 'autoIncrement': true},
          {'name': 'id2', 'autoIncrement': true}
        ]);
  });
}


function testThrows_NonIntegerPkWithAutoInc() {
  var ds = lf.schema.create('hr', 1);
  lf.testing.util.assertThrowsSyntaxError(function() {
    ds.createTable('Employee').
        addColumn('id', lf.Type.STRING).
        addPrimaryKey([{'name': 'id', 'autoIncrement': true}]);
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
  assertTrue(emp['hireDate'].isNullable());

  var e = emp.as('e');
  assertEquals('e', e.getEffectiveName());
  assertEquals(2, emp.getIndices().length);
  assertEquals(12, emp.getColumns().length);
  assertTrue(emp['id'] instanceof lf.schema.BaseColumn);
  assertEquals('Employee.#', e.getRowIdIndexName());

  var dummy = schema.table('DummyTable');
  var row = dummy.createRow({
    'arraybuffer': null,
    'boolean': true,
    'datetime': new Date(1),
    'integer': 2,
    'number': 3,
    'object': null,
    'string': 'bar'
  });
  var row2 = dummy.deserializeRow(row.serialize());
  assertObjectEquals(row.payload(), row2.payload());
}


function testThrows_NonIndexableColumns() {
  lf.testing.util.assertThrowsSyntaxError(function() {
    var ds = lf.schema.create('d1', 1);
    ds.createTable('NewTable').
        addColumn('object', lf.Type.OBJECT).
        addPrimaryKey(['object']);
  });

  lf.testing.util.assertThrowsSyntaxError(function() {
    var ds = lf.schema.create('d2', 1);
    ds.createTable('NameTable').
        addColumn('arraybuffer', lf.Type.ARRAY_BUFFER).
        addIndex('idx_arraybuffer', ['arraybuffer']);
  });
}


function testThrows_IllegalName() {
  lf.testing.util.assertThrowsSyntaxError(function() {
    var ds = lf.schema.create('d1', 1);
    ds.createTable('#NewTable');
  });

  lf.testing.util.assertThrowsSyntaxError(function() {
    var ds = lf.schema.create('d2', 1);
    ds.createTable('NameTable').
        addColumn('22arraybuffer', lf.Type.ARRAY_BUFFER);
  });

  lf.testing.util.assertThrowsSyntaxError(function() {
    var ds = lf.schema.create('d3', 1);
    ds.createTable('NameTable').
        addColumn('_obj_#ect', lf.Type.OBJECT);
  });

  lf.testing.util.assertThrowsSyntaxError(function() {
    var ds = lf.schema.create('d4', 1);
    ds.createTable('NameTable').
        addColumn('name', lf.Type.STRING).
        addIndex('idx.name', ['name']);
  });

  lf.testing.util.assertThrowsSyntaxError(function() {
    var ds = lf.schema.create('d4', 1);
    ds.createTable('NameTable').
        addColumn('name', lf.Type.STRING).
        addUnique('unq#name', ['name']);
  });
}


/**
 * Tests that the generated createRow() function produces the correct default
 * values for each column, based on the column's type and whether the column is
 * nullable by default.
 */
function testCreateRow_DefaultValues() {
  var schemaBuilder = createBuilder();
  var schema = schemaBuilder.getSchema();
  var e = schema.table('Employee');
  var employeeRow = e.createRow();
  assertTrue(employeeRow instanceof lf.Row);
  var expectedEmployeeRow = {
    id: 0,
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    hireDate: null,
    jobId: '',
    salary: 0,
    commissionPercent: 0,
    managerId: '',
    departmentId: '',
    photo: null
  };
  assertObjectEquals(expectedEmployeeRow, employeeRow.payload());

  var dt = schema.table('DummyTable');
  var dummyTableRow = dt.createRow();
  assertTrue(dummyTableRow instanceof lf.Row);
  var payload = dummyTableRow.payload();
  assertNull(payload['arraybuffer']);
  assertFalse(payload['boolean']);
  assertEquals(0, payload['datetime'].getTime());
  assertEquals(0, payload['integer']);
  assertEquals(0, payload['number']);
  assertNull(payload['object']);
  assertEquals('', payload['string']);
}


/**
 * Tests that keyOfIndex() method returns the expected keys, for the case of
 * single column indices.
 */
function testKeyOfIndex_SingleKey() {
  var ds = lf.schema.create('ki', 1);
  ds.createTable('DummyTable').
      addColumn('datetime', lf.Type.DATE_TIME).
      addColumn('integer', lf.Type.INTEGER).
      addColumn('number', lf.Type.NUMBER).
      addColumn('string', lf.Type.STRING).
      addIndex('idx_datetime', ['datetime']).
      addIndex('idx_integer', ['integer']).
      addIndex('idx_number', ['number']).
      addIndex('idx_string', ['string']);
  var schema = ds.getSchema();
  var dummy = schema.table('DummyTable');
  var row = dummy.createRow({
    'datetime': new Date(999),
    'integer': 2,
    'number': 3,
    'string': 'bar'
  });
  assertEquals(999, row.keyOfIndex('DummyTable.idx_datetime'));
  assertEquals(2, row.keyOfIndex('DummyTable.idx_integer'));
  assertEquals(3, row.keyOfIndex('DummyTable.idx_number'));
  assertEquals('bar', row.keyOfIndex('DummyTable.idx_string'));
  assertEquals(row.id(), row.keyOfIndex('DummyTable.#'));
}


/**
 * Tests that keyOfIndex() method returns the expected keys, for the case of
 * cross-column indices.
 */
function testKeyOfIndex_CrossColumnKey() {
  var schemaBuilder = lf.schema.create('ki', 1);
  schemaBuilder.createTable('DummyTable').
      addColumn('datetime', lf.Type.DATE_TIME).
      addColumn('integer', lf.Type.INTEGER).
      addColumn('number', lf.Type.NUMBER).
      addColumn('string', lf.Type.STRING).
      addColumn('boolean', lf.Type.BOOLEAN).
      addPrimaryKey(['string', 'integer']).
      addIndex('idx_NumberInteger', ['number', 'integer']).
      addIndex('idx_NumberIntegerString', ['number', 'integer', 'string']).
      addIndex('idb_DateTimeString', ['datetime', 'string']).
      addIndex('idb_BooleanString', ['boolean', 'string']);

  var schema = schemaBuilder.getSchema();
  var table = schema.table('DummyTable');
  var row = table.createRow({
    'boolean': true,
    'datetime': new Date(999),
    'integer': 2,
    'number': 3,
    'string': 'bar'
  });
  assertEquals(row.id(), row.keyOfIndex(table.getRowIdIndexName()));

  var indices = table.getIndices();
  var pkIndexSchema = indices[0];
  assertArrayEquals(
      ['bar', 2],
      row.keyOfIndex(pkIndexSchema.getNormalizedName()));

  var numberStringIndexSchema = indices[1];
  assertArrayEquals(
      [3, 2],
      row.keyOfIndex(numberStringIndexSchema.getNormalizedName()));

  var numberIntegerStringIndexSchema = indices[2];
  assertArrayEquals(
      [3, 2, 'bar'],
      row.keyOfIndex(numberIntegerStringIndexSchema.getNormalizedName()));

  var dateTimeStringIndexSchema = indices[3];
  assertArrayEquals(
      [999, 'bar'],
      row.keyOfIndex(dateTimeStringIndexSchema.getNormalizedName()));

  var booleanStringIndexSchema = indices[4];
  assertArrayEquals(
      [1, 'bar'],
      row.keyOfIndex(booleanStringIndexSchema.getNormalizedName()));
}
