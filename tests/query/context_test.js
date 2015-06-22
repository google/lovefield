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
goog.require('lf.testing.MockSchema');


/** @type {!lf.testing.MockSchema} */
var schema;


function setUpPage() {
  schema = new lf.testing.MockSchema();
}

function testGetScope_Insert() {
  var context = new lf.query.InsertContext(schema);
  var tableG = schema.table('tableG');
  var row = tableG.createRow();
  context.values = [row];
  context.into = tableG;
  var scope = context.getScope();
  assertTrue(scope.contains(tableG));
  assertEquals(2, scope.getCount());
  assertTrue(scope.contains(schema.table('tableF')));
}

function testGetScope_InsertNoExpansion() {
  var context = new lf.query.InsertContext(schema);
  var tableC = schema.table('tableC');
  var row = tableC.createRow();
  context.values = [row];
  context.into = tableC;
  var scope = context.getScope();
  assertTrue(scope.contains(tableC));
  assertEquals(1, scope.getCount());
}

function testGetScope_InsertOrReplace() {
  var context = new lf.query.InsertContext(schema);
  context.allowReplace = true;
  var tableG = schema.table('tableG');
  var tableF = schema.table('tableF');
  var tableH = schema.table('tableH');
  var row = tableG.createRow();
  context.values = [row];
  context.into = tableG;
  var scope = context.getScope();
  assertTrue(scope.contains(tableG));
  assertEquals(3, scope.getCount());
  assertTrue(scope.contains(tableF));
  assertTrue(scope.contains(tableH));
}

function testGetScope_InsertOrReplaceNoExpansion() {
  var context = new lf.query.InsertContext(schema);
  context.allowReplace = true;
  var tableC = schema.table('tableC');
  var row = tableC.createRow();
  context.values = [row];
  context.into = tableC;
  var scope = context.getScope();
  assertTrue(scope.contains(tableC));
  assertEquals(1, scope.getCount());
}

function testGetScope_Delete() {
  var context = new lf.query.DeleteContext(schema);
  var tableG = schema.table('tableG');
  var tableH = schema.table('tableH');
  context.from = tableG;
  var scope = context.getScope();
  assertTrue(scope.contains(tableG));
  assertEquals(2, scope.getCount());
  assertTrue(scope.contains(tableH));
}

function testGetScope_DeleteNoExpansion() {
  var context = new lf.query.DeleteContext(schema);
  var tableC = schema.table('tableC');
  context.from = tableC;
  var scope = context.getScope();
  assertTrue(scope.contains(tableC));
  assertEquals(1, scope.getCount());
}
