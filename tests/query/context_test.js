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
goog.require('lf.Type');
goog.require('lf.query.DeleteContext');
goog.require('lf.query.InsertContext');
goog.require('lf.query.UpdateContext');
goog.require('lf.schema');


/**
 * @return {!lf.schema.Database} A schema where TableC refers to TableB, and
 *     TableB refers to tableA.
 */
function getSchemaWithTableChain() {
  var schemaBuilder = lf.schema.create('contexttest', 1);
  schemaBuilder.createTable('TableA').
      addColumn('id', lf.Type.STRING).
      addPrimaryKey(['id']);
  schemaBuilder.createTable('TableB').
      addColumn('id', lf.Type.STRING).
      addColumn('foreignKey', lf.Type.STRING).
      addPrimaryKey(['id']).
      addForeignKey('fk_tableA', {
        local: 'foreignKey',
        ref: 'TableA.id'
      });
  schemaBuilder.createTable('TableC').
      addColumn('id', lf.Type.STRING).
      addColumn('foreignKey', lf.Type.STRING).
      addForeignKey('fk_tableB', {
        local: 'foreignKey',
        ref: 'TableB.id'
      });
  return schemaBuilder.getSchema();
}


/**
 * @return {!lf.schema.Database} A schema where table Child refers to Parent.
 */
function getSchemaWithOneForeignKey() {
  var schemaBuilder = lf.schema.create('contexttest', 1);
  schemaBuilder.createTable('Child').
      addColumn('id', lf.Type.STRING).
      addForeignKey('fk_Id', {
        local: 'id',
        ref: 'Parent.id'
      });
  schemaBuilder.createTable('Parent').
      addColumn('id', lf.Type.STRING).
      addPrimaryKey(['id']);
  return schemaBuilder.getSchema();
}


/**
 * @return {!lf.schema.Database} A schema where TableB1 and TableB2 both refer
 *     to TableA.
 */
function getSchemaWithTwoForeignKeys() {
  var schemaBuilder = lf.schema.create('contexttest', 1);
  schemaBuilder.createTable('TableA').
      addColumn('id1', lf.Type.STRING).
      addColumn('id2', lf.Type.STRING).
      addUnique('uq_id1', ['id1']).
      addUnique('uq_id2', ['id2']);
  schemaBuilder.createTable('TableB1').
      addColumn('id', lf.Type.STRING).
      addColumn('foreignKey', lf.Type.STRING).
      addForeignKey('fk_tableA', {
        local: 'foreignKey',
        ref: 'TableA.id1'
      });
  schemaBuilder.createTable('TableB2').
      addColumn('id', lf.Type.STRING).
      addColumn('foreignKey', lf.Type.STRING).
      addForeignKey('fk_tableA', {
        local: 'foreignKey',
        ref: 'TableA.id2'
      });
  return schemaBuilder.getSchema();
}


/**
 * @return {!lf.schema.Database} A schema where no foreign keys exist.
 */
function getSchemaWithoutForeignKeys() {
  var schemaBuilder = lf.schema.create('contexttest', 1);
  schemaBuilder.createTable('TableA').
      addColumn('id', lf.Type.STRING);
  schemaBuilder.createTable('TableB').
      addColumn('id', lf.Type.STRING);
  return schemaBuilder.getSchema();
}


function testGetScope_Insert() {
  var schema = getSchemaWithOneForeignKey();
  var context = new lf.query.InsertContext(schema);
  var childTable = schema.table('Child');
  var parentTable = schema.table('Parent');
  var row = childTable.createRow();
  context.values = [row];
  context.into = childTable;
  var scope = context.getScope();
  assertTrue(scope.has(childTable));
  assertEquals(2, scope.size);
  assertTrue(scope.has(parentTable));
}


function testGetScope_InsertNoExpansion() {
  var schema = getSchemaWithoutForeignKeys();
  var context = new lf.query.InsertContext(schema);
  var tableA = schema.table('TableA');
  var row = tableA.createRow();
  context.values = [row];
  context.into = tableA;
  var scope = context.getScope();
  assertTrue(scope.has(tableA));
  assertEquals(1, scope.size);
}


function testGetScope_InsertOrReplace() {
  var schema = getSchemaWithTableChain();
  var context = new lf.query.InsertContext(schema);
  context.allowReplace = true;
  var tableA = schema.table('TableA');
  var tableB = schema.table('TableB');
  var tableC = schema.table('TableC');
  var row = tableB.createRow();
  context.values = [row];
  context.into = tableB;
  var scope = context.getScope();
  assertEquals(3, scope.size);
  assertTrue(scope.has(tableA));
  assertTrue(scope.has(tableB));
  assertTrue(scope.has(tableC));
}


function testGetScope_InsertOrReplaceNoExpansion() {
  var schema = getSchemaWithoutForeignKeys();
  var context = new lf.query.InsertContext(schema);
  context.allowReplace = true;
  var tableA = schema.table('TableA');
  var row = tableA.createRow();
  context.values = [row];
  context.into = tableA;
  var scope = context.getScope();
  assertEquals(1, scope.size);
  assertTrue(scope.has(tableA));
}


function testGetScope_Delete() {
  var schema = getSchemaWithOneForeignKey();
  var context = new lf.query.DeleteContext(schema);
  var parentTable = schema.table('Parent');
  var childTable = schema.table('Child');
  context.from = parentTable;
  var scope = context.getScope();
  assertEquals(2, scope.size);
  assertTrue(scope.has(parentTable));
  assertTrue(scope.has(childTable));
}


function testGetScope_DeleteNoExpansion() {
  var schema = getSchemaWithoutForeignKeys();
  var context = new lf.query.DeleteContext(schema);
  var tableA = schema.table('TableA');
  context.from = tableA;
  var scope = context.getScope();
  assertEquals(1, scope.size);
  assertTrue(scope.has(tableA));
}


function testGetScope_UpdateOneColumn() {
  var schema = getSchemaWithTwoForeignKeys();
  var context = new lf.query.UpdateContext(schema);
  var tableA = schema.table('TableA');
  var tableB1 = schema.table('TableB1');
  context.table = tableA;
  context.set = [{column: tableA['id1'], value: 'test1'}];
  var scope = context.getScope();
  assertEquals(2, scope.size);
  assertTrue(scope.has(tableA));
  assertTrue(scope.has(tableB1));
}


function testGetScope_UpdateTwoColumns() {
  var schema = getSchemaWithTwoForeignKeys();
  var context = new lf.query.UpdateContext(schema);
  var tableA = schema.table('TableA');
  var tableB1 = schema.table('TableB1');
  var tableB2 = schema.table('TableB2');
  context.table = tableA;
  context.set = [
    {column: tableA['id1'], value: 'test1'},
    {column: tableA['id2'], value: 'test2'},
  ];
  var scope = context.getScope();
  assertEquals(3, scope.size);
  assertTrue(scope.has(tableA));
  assertTrue(scope.has(tableB1));
  assertTrue(scope.has(tableB2));
}


function testGetScope_UpdateReferredColumn() {
  var schema = getSchemaWithTableChain();
  var context = new lf.query.UpdateContext(schema);
  var tableB = schema.table('TableB');
  var tableC = schema.table('TableC');
  context.table = tableB;
  context.set = [{column: tableB['id'], value: 'test'}];
  var scope = context.getScope();
  assertEquals(2, scope.size);
  assertTrue(scope.has(tableB));
  assertTrue(scope.has(tableC));
}

function testGetScope_UpdateReferredAndReferringColumn() {
  var schema = getSchemaWithTableChain();
  var context = new lf.query.UpdateContext(schema);

  var tableA = schema.table('TableA');
  var tableB = schema.table('TableB');
  var tableC = schema.table('TableC');
  context.table = tableB;
  context.set = [
    {column: tableB['id'], value: 'test'},
    {column: tableB['foreignKey'], value: 'test'}
  ];
  var scope = context.getScope();
  assertEquals(3, scope.size);
  assertTrue(scope.has(tableA));
  assertTrue(scope.has(tableB));
  assertTrue(scope.has(tableC));
}

function testGetScope_UpdateNoExpansion() {
  var schema = getSchemaWithoutForeignKeys();
  var context = new lf.query.UpdateContext(schema);
  var tableA = schema.table('TableA');
  context.table = tableA;
  context.set = [{column: tableA['id'], value: 'test'}];
  var scope = context.getScope();
  assertEquals(1, scope.size);
  assertTrue(scope.has(tableA));
}
