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
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('lf.Global');
goog.require('lf.proc.NoOpStep');
goog.require('lf.proc.Relation');
goog.require('lf.proc.TableAccessByRowIdStep');
goog.require('lf.testing.MockEnv');
goog.require('lf.testing.getSchemaBuilder');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'TableAccessByRowIdStepTest');


/** @type {!lf.schema.Database} */
var schema;


function setUp() {
  asyncTestCase.waitForAsync('setUp');

  schema = lf.testing.getSchemaBuilder().getSchema();
  var env = new lf.testing.MockEnv(schema);
  env.init().then(function() {
    return env.addSampleData();
  }).then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}


function testTableAccessByRowId() {
  checkTableAccessByRowId('testTableAccessByRowId', schema.table('tableA'));
}


function testTableAccessByRowId_Alias() {
  checkTableAccessByRowId(
      'testTableAccessByRowId_Alias',
      schema.table('tableA').as('SomeTableAlias'));
}


/**
 * Checks that a TableAccessByRowIdStep that refers to the given table produces
 * the expected results.
 * @param {string} description
 * @param {!lf.schema.Table} table
 */
function checkTableAccessByRowId(description, table) {
  asyncTestCase.waitForAsync(description);

  var step = new lf.proc.TableAccessByRowIdStep(lf.Global.get(), table);

  // Creating a "dummy" child step that will return only two row IDs.
  var rows = [
    table.createRow({id: 1, name: 'a'}),
    table.createRow({id: 2, name: 'b'})
  ];
  rows[0].assignRowId(0);
  rows[1].assignRowId(1);
  step.addChild(new lf.proc.NoOpStep(
      [lf.proc.Relation.fromRows(rows, [table.getName()])]));

  step.exec().then(
      function(relations) {
        var relation = relations[0];
        assertFalse(relation.isPrefixApplied());
        assertArrayEquals([table.getEffectiveName()], relation.getTables());

        assertEquals(rows.length, relation.entries.length);
        relation.entries.forEach(function(entry, index) {
          var rowId = rows[index].id();
          assertEquals(rowId, entry.row.id());
          assertEquals('dummyName' + rowId, entry.row.payload().name);
        });

        asyncTestCase.continueTesting();
      }, fail);
}


function testTableAccessByRowId_Empty() {
  asyncTestCase.waitForAsync('testTableAccessByRowId_Empty');

  var table = schema.table('tableB');
  var step = new lf.proc.TableAccessByRowIdStep(lf.Global.get(), table);

  // Creating a "dummy" child step that will not return any row IDs.
  step.addChild(
      new lf.proc.NoOpStep([lf.proc.Relation.createEmpty()]));

  step.exec().then(
      function(relations) {
        assertEquals(0, relations[0].entries.length);
        asyncTestCase.continueTesting();
      }, fail);
}
