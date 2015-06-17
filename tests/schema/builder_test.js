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
goog.require('goog.testing.jsunit');
goog.require('lf.ConstraintAction');
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
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.INTEGER).
      addForeignKey('fk_EmployeeId', {
        local: 'employeeId',
        ref: 'Employee.id',
        action: lf.ConstraintAction.CASCADE
      }).
      addForeignKey('fk_DeptId', {
        local: 'departmentId',
        ref: 'Department.id',
        action: lf.ConstraintAction.CASCADE
      });

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
      addColumn('departmentId', lf.Type.INTEGER).
      addColumn('photo', lf.Type.ARRAY_BUFFER).
      addPrimaryKey([{'name': 'id', 'autoIncrement': true}]).
      addUnique('uq_email', ['email']).
      addIndex('idx_salary', [{'name': 'salary', 'order': lf.Order.DESC}]).
      addForeignKey('fk_JobId', {
        local: 'jobId',
        ref: 'Job.id',
        action: lf.ConstraintAction.CASCADE
      }).
      addNullable(['hireDate']);

  ds.createTable('Department').
      addColumn('id', lf.Type.INTEGER).
      addColumn('name', lf.Type.STRING).
      addColumn('managerId', lf.Type.INTEGER).
      addPrimaryKey([{'name': 'id', 'order': lf.Order.DESC}]).
      addForeignKey('fk_ManagerId', {
        local: 'managerId',
        ref: 'Employee.id'
      });

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
  // 503: Name {0} is already defined.
  lf.testing.util.assertThrowsError(503, function() {
    ds.createTable('DummyTable');
  });
}

function testThrows_DuplicateColumn() {
  var ds = createBuilder();
  // 503: Name {0} is already defined.
  lf.testing.util.assertThrowsError(503, function() {
    ds.createTable('Table2').
        addColumn('col', lf.Type.STRING).
        addColumn('col', lf.Type.STRING);
  });
}

function testThrows_InValidFKLocalColName() {
  var ds = createBuilder();
  var testFn = function() {
    ds.createTable('fktable1').
        addColumn('employeeId', lf.Type.STRING).
        addColumn('startDate', lf.Type.DATE_TIME).
        addColumn('endDate', lf.Type.DATE_TIME).
        addColumn('jobId', lf.Type.STRING).
        addColumn('departmentId', lf.Type.STRING).
        addForeignKey('fkemployeeId', {
          local: 'employeeId1',
          ref: 'Employee.id'
        });
  };
  // 540: Foreign key {0} has invalid reference syntax.
  lf.testing.util.assertThrowsError(540, testFn);
}

function testThrows_InValidFKRefTableName() {
  var ds = createBuilder();
  ds.createTable('fkTable2').
      addColumn('employeeId', lf.Type.STRING).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addForeignKey('fkemployeeId', {
        local: 'employeeId',
        ref: 'Employee1.id'
      });
  // 536: Foreign key {0} refers to invalid table.
  lf.testing.util.assertThrowsError(536, function() {
    ds.getSchema();
  });
}

function testThrows_ColumnTypeMismatch() {
  var ds = createBuilder();
  ds.createTable('fkTable3').
      addColumn('employeeId', lf.Type.STRING).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addForeignKey('fkemployeeId', {
        local: 'employeeId',
        ref: 'fkTable4.employeeId'
      });
  ds.createTable('fkTable4').
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING);
  // 538: Foreign key {0} column type mismatch.
  lf.testing.util.assertThrowsError(538, function() {
    ds.getSchema();
  });
}

function testThrows_InValidFKRefColName() {
  var ds = createBuilder();
  ds.createTable('fkTable5').
      addColumn('employeeId', lf.Type.STRING).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addForeignKey('fkemployeeId', {
        local: 'employeeId',
        ref: 'Employee.id1'
      });
  // 537: Foreign key {0} refers to invalid column.
  lf.testing.util.assertThrowsError(537, function() {
    ds.getSchema();
  });
}

function testThrows_InValidFKRefName() {
  var ds = createBuilder();
  // 540: Foreign key {0} has invalid reference syntax.
  lf.testing.util.assertThrowsError(540, function() {
    ds.createTable('fkTable5').
        addColumn('employeeId', lf.Type.STRING).
        addColumn('startDate', lf.Type.DATE_TIME).
        addColumn('endDate', lf.Type.DATE_TIME).
        addColumn('jobId', lf.Type.STRING).
        addColumn('departmentId', lf.Type.STRING).
        addForeignKey('fkemployeeId', {
          local: 'employeeId',
          ref: 'Employeeid'
        });
  });
}

function test_checkForeignKeyChainOnSameColumn() {
  var ds = createBuilder();
  ds.createTable('fkTable8').
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addForeignKey('fkemployeeId1', {
        local: 'employeeId',
        ref: 'fkTable10.employeeId'
      });
  ds.createTable('fkTable9').
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addForeignKey('fkemployeeId2', {
        local: 'employeeId',
        ref: 'fkTable10.employeeId'
      });
  ds.createTable('fkTable10').
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('employeeId2', lf.Type.INTEGER).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addPrimaryKey([{'name': 'employeeId', 'order': lf.Order.DESC}]).
      addForeignKey('fkemployeeId3', {
        local: 'employeeId',
        ref: 'fkTable11.employeeId'
      });
  ds.createTable('fkTable11').
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addPrimaryKey([{'name': 'employeeId', 'order': lf.Order.DESC}]);

  // 534: Foreign key {0} refers to source column of another foreign key.
  lf.testing.util.assertThrowsError(534, function() {
    ds.getSchema();
  });
}

function test_checkForeignKeyLoop() {
  var ds = createBuilder();
  ds.createTable('fkTable8').
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('employeeId2', lf.Type.INTEGER).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addPrimaryKey([{'name': 'employeeId2', 'order': lf.Order.DESC}]).
      addForeignKey('fkemployeeId1', {
        local: 'employeeId',
        ref: 'fkTable10.employeeId'
      });
  ds.createTable('fkTable9').
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addForeignKey('fkemployeeId2', {
        local: 'employeeId',
        ref: 'fkTable10.employeeId'
      });
  ds.createTable('fkTable10').
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('employeeId2', lf.Type.INTEGER).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addPrimaryKey([{'name': 'employeeId', 'order': lf.Order.DESC}]).
      addForeignKey('fkemployeeId3', {
        local: 'employeeId2',
        ref: 'fkTable11.employeeId'
      });
  ds.createTable('fkTable11').
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('employeeId2', lf.Type.INTEGER).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addPrimaryKey([{'name': 'employeeId', 'order': lf.Order.DESC}]).
      addForeignKey('fkemployeeId4', {
        local: 'employeeId2',
        ref: 'fkTable8.employeeId2'
      });
  // 533: Foreign key loop detected.
  lf.testing.util.assertThrowsError(533, function() {
    ds.getSchema();
  });
}

function test_checkForeignKeySelfLoop() {
  var ds = createBuilder();
  ds.createTable('fkTable8').
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('employeeId2', lf.Type.INTEGER).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addPrimaryKey([{'name': 'employeeId', 'order': lf.Order.DESC}]).
      addForeignKey('fkemployeeId1', {
        local: 'employeeId2',
        ref: 'fkTable8.employeeId'
      });
  ds.getSchema();
}

function test_checkForeignKeySelfLoopOfBiggerGraph() {
  var ds = createBuilder();
  ds.createTable('fkTable8').
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('employeeId2', lf.Type.INTEGER).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addPrimaryKey([{'name': 'employeeId2', 'order': lf.Order.DESC}]).
      addForeignKey('fkemployeeId1', {
        local: 'employeeId',
        ref: 'fkTable9.employeeId2'
      });
  ds.createTable('fkTable9').
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('employeeId2', lf.Type.INTEGER).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addPrimaryKey([{'name': 'employeeId2', 'order': lf.Order.DESC}]);
  // Self loop on table11
  ds.createTable('fkTable11').
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('employeeId2', lf.Type.INTEGER).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addPrimaryKey([{'name': 'employeeId', 'order': lf.Order.DESC}]).
      addForeignKey('fkemployeeId4', {
        local: 'employeeId2',
        ref: 'fkTable8.employeeId2'
      }).
      addForeignKey('fkemployeeId2', {
        local: 'employeeId2',
        ref: 'fkTable11.employeeId'
      });
  ds.getSchema();
}

function testThrows_FKRefKeyNonUnique() {
  var ds = createBuilder();
  ds.createTable('fkTable5').
      addColumn('employeeId', lf.Type.STRING).
      addColumn('startDate', lf.Type.DATE_TIME).
      addColumn('endDate', lf.Type.DATE_TIME).
      addColumn('jobId', lf.Type.STRING).
      addColumn('departmentId', lf.Type.STRING).
      addForeignKey('fkemployeeId', {
        local: 'employeeId',
        ref: 'Employee.firstName'
      });
  // 539: Foreign key {0} refers to non-unique column.
  lf.testing.util.assertThrowsError(539, function() {
    ds.getSchema();
  });
}

function testThrows_ModificationAfterFinalization() {
  var ds = createBuilder();
  ds.getSchema();
  // 535: Schema is already finalized.
  lf.testing.util.assertThrowsError(535, function() {
    ds.createTable('NewTable');
  });
}

function testThrows_CrossColumnPkWithAutoInc() {
  var ds = lf.schema.create('hr', 1);
  // 505: Can not use autoIncrement with a cross-column primary key.
  lf.testing.util.assertThrowsError(505, function() {
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
  // 504: Can not use autoIncrement with a non-integer primary key.
  lf.testing.util.assertThrowsError(504, function() {
    ds.createTable('Employee').
        addColumn('id', lf.Type.STRING).
        addPrimaryKey([{'name': 'id', 'autoIncrement': true}]);
  });
}


/**
 * Tests that if a cross-column index refers to a nullable column an exception
 * is thrown.
 */
function testThrows_CrossColumnNullableIndex() {
  var tableBuilder1 = lf.schema.create('hr', 1);
  // 507: Cross-column index {0} refers to nullable columns: {1}.
  lf.testing.util.assertThrowsError(507, function() {
    tableBuilder1.createTable('Employee').
        addColumn('id1', lf.Type.STRING).
        addColumn('id2', lf.Type.STRING).
        addNullable(['id1']).
        addIndex('idx_indexName', ['id1', 'id2']);
  });

  var tableBuilder2 = lf.schema.create('hr', 1);
  lf.testing.util.assertThrowsError(507, function() {
    tableBuilder2.createTable('Employee').
        addColumn('id1', lf.Type.STRING).
        addColumn('id2', lf.Type.STRING).
        addIndex('idx_indexName', ['id1', 'id2']).
        addNullable(['id1']);
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
  assertTrue(emp['id'].isUnique());
  assertTrue(emp['email'].isUnique());
  assertTrue(emp['hireDate'].isNullable());

  var e = emp.as('e');
  assertEquals('e', e.getEffectiveName());
  assertEquals(3, emp.getIndices().length);
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
  // 509: Attempt to index table {0} on non-indexable column {1}.
  lf.testing.util.assertThrowsError(509, function() {
    var ds = lf.schema.create('d1', 1);
    ds.createTable('NewTable').
        addColumn('object', lf.Type.OBJECT).
        addPrimaryKey(['object']);
  });

  lf.testing.util.assertThrowsError(509, function() {
    var ds = lf.schema.create('d2', 1);
    ds.createTable('NameTable').
        addColumn('arraybuffer', lf.Type.ARRAY_BUFFER).
        addIndex('idx_arraybuffer', ['arraybuffer']);
  });
}

function testThrows_IllegalName() {
  // 502: Naming rule violation: {0}.
  lf.testing.util.assertThrowsError(502, function() {
    var ds = lf.schema.create('d1', 1);
    ds.createTable('#NewTable');
  });

  lf.testing.util.assertThrowsError(502, function() {
    var ds = lf.schema.create('d2', 1);
    ds.createTable('NameTable').
        addColumn('22arraybuffer', lf.Type.ARRAY_BUFFER);
  });

  lf.testing.util.assertThrowsError(502, function() {
    var ds = lf.schema.create('d3', 1);
    ds.createTable('NameTable').
        addColumn('_obj_#ect', lf.Type.OBJECT);
  });

  lf.testing.util.assertThrowsError(502, function() {
    var ds = lf.schema.create('d4', 1);
    ds.createTable('NameTable').
        addColumn('name', lf.Type.STRING).
        addIndex('idx.name', ['name']);
  });

  lf.testing.util.assertThrowsError(502, function() {
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
    departmentId: 0,
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
 * Tests that keyOfIndex() is correctly handling nullable fields.
 */
function testKeyOfIndex_NullableField() {
  var schemaBuilder = lf.schema.create('ki', 1);
  schemaBuilder.createTable('SomeTable').
      addColumn('datetime', lf.Type.DATE_TIME).
      addColumn('integer', lf.Type.INTEGER).
      addColumn('number', lf.Type.NUMBER).
      addColumn('string', lf.Type.STRING).
      addColumn('boolean', lf.Type.BOOLEAN).
      addNullable(['datetime', 'integer', 'number', 'string', 'boolean']).
      addIndex('idx_datetime', ['datetime']).
      addIndex('idx_integer', ['integer']).
      addIndex('idx_number', ['number']).
      addIndex('idx_string', ['string']).
      addIndex('idx_boolean', ['boolean']);
  var schema = schemaBuilder.getSchema();
  var table = schema.table('SomeTable');
  var row = table.createRow();

  table.getIndices().forEach(function(indexSchema) {
    assertNull(row.keyOfIndex(indexSchema.getNormalizedName()));
  });
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

function testIsUnique_CrossColumnPk() {
  var schemaBuilder = lf.schema.create('hr', 1);

  schemaBuilder.createTable('DummyTable').
      addColumn('id1', lf.Type.NUMBER).
      addColumn('id2', lf.Type.NUMBER).
      addColumn('email', lf.Type.STRING).
      addColumn('maxSalary', lf.Type.NUMBER).
      addPrimaryKey(['id1', 'id2']);

  var schema = schemaBuilder.getSchema();
  var tableSchema = schema.table('DummyTable');
  assertFalse(tableSchema['id1'].isUnique());
  assertFalse(tableSchema['id2'].isUnique());
}
