/**
 * @license
 * Copyright 2014 Google Inc. All Rights Reserved.
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
goog.require('hr.db');


/** @type {!lf.schema.Database} */
var schema;


function setUpPage() {
  schema = hr.db.getSchema();
}


/**
 * Test an aliased version of a Table instance.
 */
function testAlias() {
  var noAliasTable = schema.getJob();
  var name = noAliasTable.getName();
  var alias = 'OtherJob';
  var aliasTable = noAliasTable.as(alias);

  assertTrue(noAliasTable != aliasTable);

  // Assertions about original instance.
  assertNull(noAliasTable.getAlias());
  assertEquals(name, noAliasTable.getName());
  assertEquals(name, noAliasTable.getEffectiveName());

  // Assertions about aliased instance.
  assertEquals(alias, aliasTable.getAlias());
  assertEquals(name, aliasTable.getName());
  assertEquals(alias, aliasTable.getEffectiveName());
  assertEquals(noAliasTable.constructor, aliasTable.constructor);
}
