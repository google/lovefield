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
goog.require('lf.Order');
goog.require('lf.Row');
goog.require('lf.Type');
goog.require('lf.schema.TableBuilder');
goog.require('lf.structs.set');
goog.require('lf.testing.util');


function testThrows_DuplicateColumn() {
  // 503: Name {0} is already defined.
  lf.testing.util.assertThrowsError(503, function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('col', lf.Type.STRING).
        addColumn('col', lf.Type.STRING);
  });
}


function testThrows_InvalidNullable() {
  // Testing single column primary key.
  // 545: Primary key column {0} can't be marked as nullable,
  lf.testing.util.assertThrowsError(545, function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('id', lf.Type.STRING).
        addPrimaryKey(['id']).
        addNullable(['id']);
    tableBuilder.getSchema();
  });

  // Testing multi column primary key.
  lf.testing.util.assertThrowsError(545, function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('id1', lf.Type.STRING).
        addColumn('id2', lf.Type.STRING).
        addNullable(['id2']).
        addPrimaryKey(['id1', 'id2']);
    tableBuilder.getSchema();
  });
}


function testThrows_NonIndexableColumns() {
  // 509: Attempt to index table {0} on non-indexable column {1}.
  lf.testing.util.assertThrowsError(509, function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('object', lf.Type.OBJECT).
        addPrimaryKey(['object']);
  });

  lf.testing.util.assertThrowsError(509, function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('arraybuffer', lf.Type.ARRAY_BUFFER).
        addIndex('idx_arraybuffer', ['arraybuffer']);
  });
}


function testThrows_CrossColumnPkWithAutoInc() {
  // 505: Can not use autoIncrement with a cross-column primary key.
  lf.testing.util.assertThrowsError(505, function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('id1', lf.Type.INTEGER).
        addColumn('id2', lf.Type.INTEGER).
        addPrimaryKey([
          {'name': 'id1', 'autoIncrement': true},
          {'name': 'id2', 'autoIncrement': true}
        ]);
  });
}


function testThrows_NonIntegerPkWithAutoInc() {
  // 504: Can not use autoIncrement with a non-integer primary key.
  lf.testing.util.assertThrowsError(504, function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('id', lf.Type.STRING).
        addPrimaryKey([{'name': 'id', 'autoIncrement': true}]);
  });
}


function testThrows_InValidFKLocalColName() {
  // 540: Foreign key {0} has invalid reference syntax.
  lf.testing.util.assertThrowsError(540, function() {
    var tableBuilder = new lf.schema.TableBuilder('FkTable1');
    tableBuilder.
        addColumn('employeeId', lf.Type.STRING).
        addForeignKey('fkemployeeId', {
          local: 'employeeId1',
          ref: 'Employee.id'
        });
  });
}


function testThrows_DuplicateIndexName() {
  // 503: Name FkTableDupIndex.fkemployeeId is already defined.
  // Callincg addForeignKey first, addIndex second.
  lf.testing.util.assertThrowsError(503, function() {
    var tableBuilder = new lf.schema.TableBuilder('FkTableDupIndex');
    tableBuilder.
        addColumn('employeeId', lf.Type.INTEGER).
        addForeignKey('fkemployeeId', {
          local: 'employeeId',
          ref: 'Employee.id'
        }).
        addIndex('fkemployeeId', ['employeeId'], true, lf.Order.ASC);
  });

  // 503: Name FkTableDupIndex.fkemployeeId is already defined.
  // Callincg addIndex first, addForeignKey second.
  lf.testing.util.assertThrowsError(503, function() {
    var tableBuilder = new lf.schema.TableBuilder('FkTableDupIndex');
    tableBuilder.
        addColumn('employeeId', lf.Type.INTEGER).
        addIndex('fkemployeeId', ['employeeId'], true, lf.Order.ASC).
        addForeignKey('fkemployeeId', {
          local: 'employeeId',
          ref: 'Employee.id'
        });
  });
}


function testThrows_IndexColumnConstraintNameConflict() {
  // 546: Indices/constraints/columns can't re-use the table name {0},
  lf.testing.util.assertThrowsError(546, function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('id', lf.Type.INTEGER).
        addIndex('Table', ['id']);
  });

  lf.testing.util.assertThrowsError(546, function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('id', lf.Type.INTEGER).
        addUnique('Table', ['id']);
  });

  lf.testing.util.assertThrowsError(546, function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.addColumn('Table', lf.Type.INTEGER);
  });
}


function testThrows_ColumnBothPkAndFk() {
  // 543: Foreign key {0}. A primary key column can't also be a foreign key
  // child column.
  lf.testing.util.assertThrowsError(543, function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('id', lf.Type.STRING).
        addPrimaryKey(['id']).
        addForeignKey('fk_id', {
          local: 'id',
          ref: 'OtherTable.id',
        });
    return tableBuilder.getSchema();
  });
}


function testThrows_PrimaryKeyDuplicateIndex() {
  // 544: Duplicate primary key index found at {0},
  // Testing single column primary key.
  lf.testing.util.assertThrowsError(544, function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('id', lf.Type.STRING).
        addPrimaryKey(['id']).
        addIndex('idx_id', ['id'], false, lf.Order.ASC);
    return tableBuilder.getSchema();
  });

  // Testing multi column primary key.
  lf.testing.util.assertThrowsError(544, function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('id1', lf.Type.STRING).
        addColumn('id2', lf.Type.STRING).
        addPrimaryKey(['id1', 'id2']).
        addIndex('idx_id', ['id1', 'id2']);
    return tableBuilder.getSchema();
  });
}


function testIsUnique_CrossColumnPk() {
  var getSchema = function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('id1', lf.Type.NUMBER).
        addColumn('id2', lf.Type.NUMBER).
        addColumn('email', lf.Type.STRING).
        addColumn('maxSalary', lf.Type.NUMBER).
        addPrimaryKey(['id1', 'id2']);
    return tableBuilder.getSchema();
  };

  var tableSchema = getSchema();
  assertFalse(tableSchema['id1'].isUnique());
  assertFalse(tableSchema['id2'].isUnique());
}


function testAddDuplicateIndexOnFK() {
  var getSchema = function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('employeeId', lf.Type.INTEGER).
        addForeignKey('fkemployeeId', {
          local: 'employeeId',
          ref: 'Employee.id'
        }).
        addIndex('idx_employeeId', ['employeeId'], false, lf.Order.ASC);
    return tableBuilder.getSchema();
  };
  var indexNames = lf.structs.set.create();
  getSchema().getIndices().forEach(
      function(index) {
        indexNames.add(index.name);
      });
  assertTrue(indexNames.has('fkemployeeId'));
  assertTrue(indexNames.has('idx_employeeId'));
}


function testFkChildColumnIndex_Unique() {
  // Case1: addUnique called before addForeignKey.
  var getSchema1 = function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('employeeId', lf.Type.INTEGER).
        addUnique('uq_employeeId', ['employeeId']).
        addForeignKey('fkEmployeeId', {
          local: 'employeeId',
          ref: 'Employee.id'
        });
    return tableBuilder.getSchema();
  };
  var fkIndexSchema = getSchema1()['employeeId'].getIndices()[1];
  assertEquals('fkEmployeeId', fkIndexSchema.name);
  assertTrue(fkIndexSchema.isUnique);

  // Case2: addUnique called after addForeignKey.
  var getSchema2 = function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('employeeId', lf.Type.INTEGER).
        addForeignKey('fkEmployeeId', {
          local: 'employeeId',
          ref: 'Employee.id'
        }).
        addUnique('uq_employeeId', ['employeeId']);
    return tableBuilder.getSchema();
  };
  fkIndexSchema = getSchema2()['employeeId'].getIndices()[0];
  assertEquals('fkEmployeeId', fkIndexSchema.name);
  assertTrue(fkIndexSchema.isUnique);
}


function testFkChildColumnIndex_NonUnique() {
  // Case: Foreign key child column is not unique.
  var getSchema = function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('employeeId', lf.Type.INTEGER).
        addForeignKey('fkEmployeeId', {
          local: 'employeeId',
          ref: 'Employee.id'
        });
    return tableBuilder.getSchema();
  };
  var fkIndexSchema = getSchema()['employeeId'].getIndices()[0];
  assertEquals('fkEmployeeId', fkIndexSchema.name);
  assertFalse(fkIndexSchema.isUnique);
}


/**
 * Tests that the generated createRow() function produces the correct default
 * values for each column, based on the column's type and whether the column is
 * nullable by default.
 */
function testCreateRow_DefaultValues() {
  var getSchema = function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('integer', lf.Type.INTEGER).
        addColumn('number', lf.Type.NUMBER).
        addColumn('string', lf.Type.STRING).
        addColumn('boolean', lf.Type.BOOLEAN).
        addColumn('datetime', lf.Type.DATE_TIME).
        addColumn('arraybuffer', lf.Type.ARRAY_BUFFER).
        addColumn('object', lf.Type.OBJECT);
    return tableBuilder.getSchema();
  };

  var tableSchema = getSchema();
  var row = tableSchema.createRow();
  assertTrue(row instanceof lf.Row);

  var payload = row.payload();
  assertNull(payload['arraybuffer']);
  assertFalse(payload['boolean']);
  assertEquals(0, payload['datetime'].getTime());
  assertEquals(0, payload['integer']);
  assertEquals(0, payload['number']);
  assertNull(payload['object']);
  assertEquals('', payload['string']);
}


function testCreateRow_DefaultValues_Nullable() {
  var getSchema = function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('integer', lf.Type.INTEGER).
        addColumn('number', lf.Type.NUMBER).
        addColumn('string', lf.Type.STRING).
        addColumn('boolean', lf.Type.BOOLEAN).
        addColumn('datetime', lf.Type.DATE_TIME).
        addColumn('arraybuffer', lf.Type.ARRAY_BUFFER).
        addColumn('object', lf.Type.OBJECT).
        addNullable([
          'integer', 'number', 'string', 'boolean', 'datetime',
          'arraybuffer', 'object'
        ]);
    return tableBuilder.getSchema();
  };

  var tableSchema = getSchema();
  var row = tableSchema.createRow();
  assertTrue(row instanceof lf.Row);

  var expectedPayload = {
    integer: null,
    number: null,
    string: null,
    boolean: null,
    datetime: null,
    arraybuffer: null,
    object: null
  };
  assertObjectEquals(expectedPayload, row.payload());
}


/**
 * Tests that keyOfIndex() method returns the expected keys, for the case of
 * single column indices.
 */
function testKeyOfIndex_SingleKey() {
  var getSchema = function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('datetime', lf.Type.DATE_TIME).
        addColumn('integer', lf.Type.INTEGER).
        addColumn('number', lf.Type.NUMBER).
        addColumn('string', lf.Type.STRING).
        addIndex('idx_datetime', ['datetime']).
        addIndex('idx_integer', ['integer']).
        addIndex('idx_number', ['number']).
        addIndex('idx_string', ['string']);
    return tableBuilder.getSchema();
  };

  var tableSchema = getSchema();
  var row = tableSchema.createRow({
    'datetime': new Date(999),
    'integer': 2,
    'number': 3,
    'string': 'bar'
  });
  assertEquals(999, row.keyOfIndex('Table.idx_datetime'));
  assertEquals(2, row.keyOfIndex('Table.idx_integer'));
  assertEquals(3, row.keyOfIndex('Table.idx_number'));
  assertEquals('bar', row.keyOfIndex('Table.idx_string'));
  assertEquals(row.id(), row.keyOfIndex('Table.#'));
}


/**
 * Tests that keyOfIndex() is correctly handling nullable fields.
 */
function testKeyOfIndex_NullableField() {
  var getSchema = function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
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
    return tableBuilder.getSchema();
  };
  var tableSchema = getSchema();
  var row = tableSchema.createRow();

  tableSchema.getIndices().forEach(function(indexSchema) {
    assertNull(row.keyOfIndex(indexSchema.getNormalizedName()));
  });
}


/**
 * Tests that keyOfIndex() method returns the expected keys, for the case of
 * cross-column indices.
 */
function testKeyOfIndex_CrossColumnKey() {
  var getSchema = function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
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
    return tableBuilder.getSchema();
  };

  var tableSchema = getSchema();
  var row = tableSchema.createRow({
    'boolean': true,
    'datetime': new Date(999),
    'integer': 2,
    'number': 3,
    'string': 'bar'
  });
  assertEquals(row.id(), row.keyOfIndex(tableSchema.getRowIdIndexName()));

  var indices = tableSchema.getIndices();
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


function testSerialization() {
  var getSchema = function() {
    var tableBuilder = new lf.schema.TableBuilder('Table');
    tableBuilder.
        addColumn('number', lf.Type.NUMBER).
        addColumn('string', lf.Type.STRING).
        addColumn('arraybuffer', lf.Type.ARRAY_BUFFER).
        addColumn('datetime', lf.Type.DATE_TIME).
        addColumn('object', lf.Type.OBJECT).
        addNullable(['datetime']);
    return tableBuilder.getSchema();
  };

  var tableSchema = getSchema();
  var row = tableSchema.createRow({
    number: 1,
    string: 'bar',
    arraybuffer: null
  });
  var expected = {
    number: 1,
    string: 'bar',
    arraybuffer: null,
    object: null,
    datetime: null
  };

  assertObjectEquals(expected, row.toDbPayload());
  assertObjectEquals(
      expected, tableSchema.deserializeRow(row.serialize()).payload());
}
