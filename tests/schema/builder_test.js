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
goog.require('lf.ConstraintTiming');
goog.require('lf.Order');
goog.require('lf.Type');
goog.require('lf.schema');
goog.require('lf.schema.BaseColumn');
goog.require('lf.schema.ForeignKeySpec');
goog.require('lf.schema.Table');
goog.require('lf.structs.set');
goog.require('lf.testing.util');


/** @return {!lf.schema.Builder} */
function createBuilder() {
  var schemaBuilder = lf.schema.create('hr', 1);
  schemaBuilder.createTable('Job').
      addColumn('id', lf.Type.STRING).
      addColumn('title', lf.Type.STRING).
      addColumn('minSalary', lf.Type.NUMBER).
      addColumn('maxSalary', lf.Type.NUMBER).
      addPrimaryKey(['id']).
      addIndex('idx_maxSalary', ['maxSalary'], false, lf.Order.DESC);

  schemaBuilder.createTable('JobHistory').
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
        action: lf.ConstraintAction.CASCADE,
        timing: lf.ConstraintTiming.IMMEDIATE
      });

  schemaBuilder.createTable('Employee').
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

  schemaBuilder.createTable('Department').
      addColumn('id', lf.Type.INTEGER).
      addColumn('name', lf.Type.STRING).
      addColumn('managerId', lf.Type.INTEGER).
      addPrimaryKey([{'name': 'id', 'order': lf.Order.DESC}]).
      addForeignKey('fk_ManagerId', {
        local: 'managerId',
        ref: 'Employee.id'
      });

  schemaBuilder.createTable('DummyTable').
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
  return schemaBuilder;
}

function testGetForeignKeySimpleSpec() {
  var schemaBuilder = createBuilder();
  assertEquals(0, schemaBuilder.getSchema().table('Job').getConstraint().
      getForeignKeys().length);

  assertEquals(1, schemaBuilder.getSchema().table('Department').getConstraint().
      getForeignKeys().length);

  var specs = new lf.schema.ForeignKeySpec({
    local: 'managerId',
    ref: 'Employee.id',
    action: lf.ConstraintAction.RESTRICT,
    timing: lf.ConstraintTiming.IMMEDIATE
  }, 'Department', 'fk_ManagerId');
  assertObjectEquals(specs, schemaBuilder.getSchema().table('Department').
      getConstraint().getForeignKeys()[0]);
}

function testGetForeignKeyTwoSpecs() {
  var schemaBuilder = createBuilder();
  assertEquals(2, schemaBuilder.getSchema().table('JobHistory').
      getConstraint().getForeignKeys().length);

  var specs = new lf.schema.ForeignKeySpec({
    local: 'employeeId',
    ref: 'Employee.id',
    action: lf.ConstraintAction.CASCADE,
    timing: lf.ConstraintTiming.IMMEDIATE
  }, 'JobHistory', 'fk_EmployeeId');
  assertObjectEquals(specs, schemaBuilder.getSchema().table('JobHistory').
      getConstraint().getForeignKeys()[0]);
  specs = new lf.schema.ForeignKeySpec({
    local: 'departmentId',
    ref: 'Department.id',
    action: lf.ConstraintAction.CASCADE,
    timing: lf.ConstraintTiming.IMMEDIATE
  }, 'JobHistory', 'fk_DeptId');
  assertObjectEquals(specs, schemaBuilder.getSchema().table('JobHistory').
      getConstraint().getForeignKeys()[1]);
}

function checkObjectEquals(expected, actual) {
  for (var key in actual) {
    if (key.indexOf('closure_uid_') != -1) {
      delete actual[key];
      break;
    }
  }
  assertObjectEquals(expected, actual);
}

function testGetParentForeignKeys() {
  var schema = createBuilder().getSchema();
  var parentForeignKeys = schema.info().getReferencingForeignKeys('Job');
  var spec = new lf.schema.ForeignKeySpec({
    local: 'jobId',
    ref: 'Job.id',
    action: lf.ConstraintAction.CASCADE,
    timing: lf.ConstraintTiming.IMMEDIATE
  }, 'Employee', 'fk_JobId');
  assertEquals(1, parentForeignKeys.length);
  checkObjectEquals(spec, parentForeignKeys[0]);
}


function testThrows_DuplicateTable() {
  var schemaBuilder = createBuilder();
  // 503: Name {0} is already defined.
  lf.testing.util.assertThrowsError(503, function() {
    schemaBuilder.createTable('DummyTable');
  });
}


function testDefaultIndexOnForeignKey() {
  var schemaBuilder = createBuilder();
  var employee = schemaBuilder.getSchema().table('Employee');
  assertEquals(
      'Employee.fk_JobId',
      employee['jobId'].getIndex().getNormalizedName());
}

function testThrows_InValidFKRefTableName() {
  var schemaBuilder = createBuilder();
  schemaBuilder.createTable('FkTable2').
      addColumn('employeeId', lf.Type.STRING).
      addForeignKey('fkemployeeId', {
        local: 'employeeId',
        ref: 'Employee1.id'
      });
  // 536: Foreign key {0} refers to invalid table.
  lf.testing.util.assertThrowsError(536, function() {
    schemaBuilder.getSchema();
  });
}

function testThrows_ColumnTypeMismatch() {
  var schemaBuilder = createBuilder();
  schemaBuilder.createTable('FkTable3').
      addColumn('employeeId', lf.Type.STRING).
      addForeignKey('fkemployeeId', {
        local: 'employeeId',
        ref: 'FkTable4.employeeId'
      });
  schemaBuilder.createTable('FkTable4').
      addColumn('employeeId', lf.Type.INTEGER);
  // 538: Foreign key {0} column type mismatch.
  lf.testing.util.assertThrowsError(538, function() {
    schemaBuilder.getSchema();
  });
}

function testThrows_InValidFKRefColName() {
  var schemaBuilder = createBuilder();
  schemaBuilder.createTable('FkTable5').
      addColumn('employeeId', lf.Type.STRING).
      addForeignKey('fkemployeeId', {
        local: 'employeeId',
        ref: 'Employee.id1'
      });
  // 537: Foreign key {0} refers to invalid column.
  lf.testing.util.assertThrowsError(537, function() {
    schemaBuilder.getSchema();
  });
}

function testThrows_InValidFKRefName() {
  var schemaBuilder = createBuilder();
  // 540: Foreign key {0} has invalid reference syntax.
  lf.testing.util.assertThrowsError(540, function() {
    schemaBuilder.createTable('FkTable5').
        addColumn('employeeId', lf.Type.STRING).
        addForeignKey('fkemployeeId', {
          local: 'employeeId',
          ref: 'Employeeid'
        });
  });
}

function test_checkForeignKeyChainOnSameColumn() {
  var schemaBuilder = lf.schema.create('hr', 1);
  schemaBuilder.createTable('FkTable1').
      addColumn('employeeId', lf.Type.INTEGER).
      addForeignKey('fk_employeeId', {
        local: 'employeeId',
        ref: 'FkTable2.employeeId'
      });
  schemaBuilder.createTable('FkTable2').
      addColumn('employeeId', lf.Type.INTEGER).
      addUnique('uq_employeeId', ['employeeId']).
      addForeignKey('fk_employeeId', {
        local: 'employeeId',
        ref: 'FkTable3.employeeId'
      });
  schemaBuilder.createTable('FkTable3').
      addColumn('employeeId', lf.Type.INTEGER).
      addPrimaryKey(['employeeId']);

  // 534: Foreign key {0} refers to source column of another foreign key.
  lf.testing.util.assertThrowsError(534, function() {
    schemaBuilder.getSchema();
  });
}

function testCheckForeignKeyLoop() {
  var schemaBuilder = createBuilder();
  schemaBuilder.createTable('FkTable8').
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('employeeId2', lf.Type.INTEGER).
      addPrimaryKey([{'name': 'employeeId2', 'order': lf.Order.DESC}]).
      addForeignKey('fkemployeeId1', {
        local: 'employeeId',
        ref: 'FkTable10.employeeId'
      });
  schemaBuilder.createTable('FkTable9').
      addColumn('employeeId', lf.Type.INTEGER).
      addForeignKey('fkemployeeId2', {
        local: 'employeeId',
        ref: 'FkTable10.employeeId'
      });
  schemaBuilder.createTable('FkTable10').
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('employeeId2', lf.Type.INTEGER).
      addPrimaryKey([{'name': 'employeeId', 'order': lf.Order.DESC}]).
      addForeignKey('fkemployeeId3', {
        local: 'employeeId2',
        ref: 'FkTable11.employeeId'
      });
  schemaBuilder.createTable('FkTable11').
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('employeeId2', lf.Type.INTEGER).
      addPrimaryKey([{'name': 'employeeId', 'order': lf.Order.DESC}]).
      addForeignKey('fkemployeeId4', {
        local: 'employeeId2',
        ref: 'FkTable8.employeeId2'
      });
  // 533: Foreign key loop detected.
  lf.testing.util.assertThrowsError(533, function() {
    schemaBuilder.getSchema();
  });
}

function testCheckForeignKeySelfLoop() {
  var schemaBuilder = createBuilder();
  schemaBuilder.createTable('FkTable8').
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('employeeId2', lf.Type.INTEGER).
      addPrimaryKey([{'name': 'employeeId', 'order': lf.Order.DESC}]).
      addForeignKey('fkemployeeId1', {
        local: 'employeeId2',
        ref: 'FkTable8.employeeId'
      });
  schemaBuilder.getSchema();
}

function testCheckForeignKeySelfLoopOfBiggerGraph() {
  var schemaBuilder = createBuilder();
  schemaBuilder.createTable('FkTable8').
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('employeeId2', lf.Type.INTEGER).
      addPrimaryKey([{'name': 'employeeId2', 'order': lf.Order.DESC}]).
      addForeignKey('fkemployeeId1', {
        local: 'employeeId',
        ref: 'FkTable9.employeeId2'
      });
  schemaBuilder.createTable('FkTable9').
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('employeeId2', lf.Type.INTEGER).
      addPrimaryKey([{'name': 'employeeId2', 'order': lf.Order.DESC}]);
  // Self loop on table11
  schemaBuilder.createTable('FkTable11').
      addColumn('employeeId', lf.Type.INTEGER).
      addColumn('employeeId2', lf.Type.INTEGER).
      addPrimaryKey([{'name': 'employeeId', 'order': lf.Order.DESC}]).
      addForeignKey('fkemployeeId4', {
        local: 'employeeId2',
        ref: 'FkTable8.employeeId2'
      }).
      addForeignKey('fkemployeeId2', {
        local: 'employeeId2',
        ref: 'FkTable11.employeeId'
      });
  schemaBuilder.getSchema();
}

function testThrows_FKRefKeyNonUnique() {
  var schemaBuilder = createBuilder();
  schemaBuilder.createTable('FkTable5').
      addColumn('employeeId', lf.Type.STRING).
      addForeignKey('fkemployeeId', {
        local: 'employeeId',
        ref: 'Employee.firstName'
      });
  // 539: Foreign key {0} refers to non-unique column.
  lf.testing.util.assertThrowsError(539, function() {
    schemaBuilder.getSchema();
  });
}

function testThrows_ModificationAfterFinalization() {
  var schemaBuilder = createBuilder();
  schemaBuilder.getSchema();
  // 535: Schema is already finalized.
  lf.testing.util.assertThrowsError(535, function() {
    schemaBuilder.createTable('NewTable');
  });
}

function testSchemaCorrectness() {
  var schemaBuilder = createBuilder();
  var schema = schemaBuilder.getSchema();
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
  assertEquals(4, emp.getIndices().length);
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


function testSchemaCorrectness_IndexOrder() {
  var schemaBuilder = createBuilder();
  var schema = schemaBuilder.getSchema();

  // Test case of DESC index.
  var job = schema.table('Job');
  var maxSalaryIndexSchema = job.getIndices().filter(
      function(indexSchema) {
        return indexSchema.name == 'idx_maxSalary';
      })[0];
  assertEquals(lf.Order.DESC, maxSalaryIndexSchema.columns[0].order);

  // Test case of ASC index.
  var dummyTable = schema.table('DummyTable');
  var stringIndexSchema = dummyTable.getIndices().filter(
      function(indexSchema) {
        return indexSchema.name == 'idx_string';
      })[0];
  assertEquals(lf.Order.ASC, stringIndexSchema.columns[0].order);
}


function testThrows_IllegalName() {
  // 502: Naming rule violation: {0}.
  lf.testing.util.assertThrowsError(502, function() {
    var schemaBuilder = lf.schema.create('d1', 1);
    schemaBuilder.createTable('#NewTable');
  });

  lf.testing.util.assertThrowsError(502, function() {
    var schemaBuilder = lf.schema.create('d2', 1);
    schemaBuilder.createTable('NameTable').
        addColumn('22arraybuffer', lf.Type.ARRAY_BUFFER);
  });

  lf.testing.util.assertThrowsError(502, function() {
    var schemaBuilder = lf.schema.create('d3', 1);
    schemaBuilder.createTable('NameTable').
        addColumn('_obj_#ect', lf.Type.OBJECT);
  });

  lf.testing.util.assertThrowsError(502, function() {
    var schemaBuilder = lf.schema.create('d4', 1);
    schemaBuilder.createTable('NameTable').
        addColumn('name', lf.Type.STRING).
        addIndex('idx.name', ['name']);
  });

  lf.testing.util.assertThrowsError(502, function() {
    var schemaBuilder = lf.schema.create('d4', 1);
    schemaBuilder.createTable('NameTable').
        addColumn('name', lf.Type.STRING).
        addUnique('unq#name', ['name']);
  });
}
