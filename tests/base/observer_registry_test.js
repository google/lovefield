/**
 * @license
 * Copyright 2014 The Lovefield Project Authors. All Rights Reserved.
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
goog.require('lf.proc.Relation');
goog.require('lf.query.SelectBuilder');
goog.require('lf.structs.set');
goog.require('lf.testing.MockEnv');
goog.require('lf.testing.getSchemaBuilder');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'ObserverRegistryTest');


/** @type {!lf.ObserverRegistry} */
var registry;


/** @type {!lf.schema.Database} */
var schema;


function setUp() {
  asyncTestCase.waitForAsync('setUp');

  schema = lf.testing.getSchemaBuilder().getSchema();
  var env = new lf.testing.MockEnv(schema);
  env.init().then(function() {
    registry = env.observerRegistry;
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that addObserver() works as expected by checking that observers are
 * notified when the observable results are modified.
 */
function testAddObserver() {
  asyncTestCase.waitForAsync('testObserve');

  var table = schema.tables()[0];
  var builder = new lf.query.SelectBuilder(lf.Global.get(), []);
  builder.from(table);

  var callback = function(changes) {
    asyncTestCase.continueTesting();
  };

  registry.addObserver(builder, callback);
  var row1 = table.createRow({ 'id': 'dummyId1', 'value': 'dummyValue1'});
  var row2 = table.createRow({ 'id': 'dummyId2', 'value': 'dummyValue2'});

  var firstResults = lf.proc.Relation.fromRows([row1], [table.getName()]);
  assertTrue(registry.updateResultsForQuery(builder.getQuery(), firstResults));

  var secondResults = lf.proc.Relation.fromRows(
      [row1, row2], [table.getName()]);
  assertTrue(registry.updateResultsForQuery(builder.getQuery(), secondResults));
}


function testRemoveObserver() {
  var table = schema.tables()[0];
  var builder = new lf.query.SelectBuilder(lf.Global.get(), []);
  builder.from(table);

  var callback = function() { fail(new Error('Observer not removed')); };
  registry.addObserver(builder, callback);
  registry.removeObserver(builder, callback);
  var row = table.createRow({ 'id': 'dummyId', 'value': 'dummyValue'});
  var newResults = lf.proc.Relation.fromRows([row], [table.getName()]);
  assertFalse(registry.updateResultsForQuery(builder.getQuery(), newResults));
}


function testGetTaskItemsForTables() {
  var tables = schema.tables();

  var builder1 = new lf.query.SelectBuilder(lf.Global.get(), []);
  builder1.from(tables[0]);
  var builder2 = new lf.query.SelectBuilder(lf.Global.get(), []);
  builder2.from(tables[0], tables[1]);
  var builder3 = new lf.query.SelectBuilder(lf.Global.get(), []);
  builder3.from(tables[1]);

  var callback = function() {};

  registry.addObserver(builder1, callback);
  registry.addObserver(builder2, callback);
  registry.addObserver(builder3, callback);

  /**
   * @param {!lf.structs.Set<!lf.schema.Table>} targetSet
   * @return {!Array<!lf.query.SelectContext>}
   */
  var getQueriesForTables = function(targetSet) {
    return registry.getTaskItemsForTables(targetSet).map(function(item) {
      return item.context;
    });
  };

  var scope1 = lf.structs.set.create();
  scope1.add(tables[0]);
  var queries = getQueriesForTables(scope1);
  assertArrayEquals(
      [builder1.getObservableQuery(), builder2.getObservableQuery()], queries);

  var scope2 = lf.structs.set.create();
  scope2.add(tables[1]);
  queries = getQueriesForTables(scope2);
  assertArrayEquals(
      [builder2.getObservableQuery(), builder3.getObservableQuery()], queries);

  var scope3 = lf.structs.set.create();
  scope3.add(tables[0]);
  scope3.add(tables[1]);
  queries = getQueriesForTables(scope3);
  assertArrayEquals(
      [builder1.getObservableQuery(),
       builder2.getObservableQuery(),
       builder3.getObservableQuery()],
      queries);
}
