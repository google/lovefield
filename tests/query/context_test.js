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
goog.require('lf.query.DeleteContext');
goog.require('lf.query.InsertContext');
goog.require('lf.query.UpdateContext');
goog.require('lf.testing.getSchemaBuilder');


/** @type {!lf.schema.Database} */
var schema;


function setUpPage() {
  schema = lf.testing.getSchemaBuilder().getSchema();
}

function testGetScope_Insert() {
  var context = new lf.query.InsertContext(schema);
  var tableG = schema.table('tableG');
  var row = tableG.createRow();
  context.values = [row];
  context.into = tableG;
  var scope = context.getScope();
  assertTrue(scope.has(tableG));
  assertEquals(2, scope.size);
  assertTrue(scope.has(schema.table('tableI')));
}

function testGetScope_InsertNoExpansion() {
  var context = new lf.query.InsertContext(schema);
  var tableC = schema.table('tableC');
  var row = tableC.createRow();
  context.values = [row];
  context.into = tableC;
  var scope = context.getScope();
  assertTrue(scope.has(tableC));
  assertEquals(1, scope.size);
}

function testGetScope_InsertOrReplace() {
  var context = new lf.query.InsertContext(schema);
  context.allowReplace = true;
  var tableG = schema.table('tableG');
  var tableI = schema.table('tableI');
  var tableH = schema.table('tableH');
  var row = tableG.createRow();
  context.values = [row];
  context.into = tableG;
  var scope = context.getScope();
  assertTrue(scope.has(tableG));
  assertEquals(3, scope.size);
  assertTrue(scope.has(tableI));
  assertTrue(scope.has(tableH));
}

function testGetScope_InsertOrReplaceNoExpansion() {
  var context = new lf.query.InsertContext(schema);
  context.allowReplace = true;
  var tableC = schema.table('tableC');
  var row = tableC.createRow();
  context.values = [row];
  context.into = tableC;
  var scope = context.getScope();
  assertTrue(scope.has(tableC));
  assertEquals(1, scope.size);
}

function testGetScope_Delete() {
  var context = new lf.query.DeleteContext(schema);
  var tableG = schema.table('tableG');
  var tableH = schema.table('tableH');
  context.from = tableG;
  var scope = context.getScope();
  assertTrue(scope.has(tableG));
  assertEquals(2, scope.size);
  assertTrue(scope.has(tableH));
}

function testGetScope_DeleteNoExpansion() {
  var context = new lf.query.DeleteContext(schema);
  var tableC = schema.table('tableC');
  context.from = tableC;
  var scope = context.getScope();
  assertTrue(scope.has(tableC));
  assertEquals(1, scope.size);
}

function testGetScope_UpdateOneColumn() {
  var context = new lf.query.UpdateContext(schema);
  var tableI = schema.table('tableI');
  var tableH = schema.table('tableH');
  context.table = tableI;
  context.set = [{column: tableI['id2'], value: 'test'}];
  var scope = context.getScope();
  assertEquals(2, scope.size);
  assertTrue(scope.has(tableI));
  assertTrue(scope.has(tableH));
}

function testGetScope_UpdateTwoColumns() {
  var context = new lf.query.UpdateContext(schema);
  var tableG = schema.table('tableG');
  var tableI = schema.table('tableI');
  var tableH = schema.table('tableH');
  context.table = tableI;
  context.set = [{column: tableI['id2'], value: 'test'},
                 {column: tableI['id'], value: 'test'}];
  var scope = context.getScope();
  assertEquals(3, scope.size);
  assertTrue(scope.has(tableG));
  assertTrue(scope.has(tableI));
  assertTrue(scope.has(tableH));
}

function testGetScope_UpdateReferredColumn() {
  var context = new lf.query.UpdateContext(schema);
  var tableG = schema.table('tableG');
  var tableH = schema.table('tableH');
  context.table = tableG;
  context.set = [{column: tableG['id2'], value: 'test'}];
  var scope = context.getScope();
  assertEquals(2, scope.size);
  assertTrue(scope.has(tableG));
  assertTrue(scope.has(tableH));
}

function testGetScope_UpdateReferredAndReferringColumn() {
  var context = new lf.query.UpdateContext(schema);
  var tableG = schema.table('tableG');
  var tableI = schema.table('tableI');
  var tableH = schema.table('tableH');
  context.table = tableG;
  context.set = [{column: tableG['id2'], value: 'test'},
                 {column: tableG['id'], value: 'test'}];
  var scope = context.getScope();
  assertEquals(3, scope.size);
  assertTrue(scope.has(tableG));
  assertTrue(scope.has(tableH));
  assertTrue(scope.has(tableI));
}

function testGetScope_UpdateNoExpansion() {
  var context = new lf.query.UpdateContext(schema);
  var tableC = schema.table('tableC');
  context.table = tableC;
  context.set = [{column: tableC['id'], value: 'test'}];
  var scope = context.getScope();
  assertTrue(scope.has(tableC));
  assertEquals(1, scope.size);
}
