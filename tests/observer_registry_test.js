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

goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('goog.userAgent.product');
goog.require('lf.proc.Relation');
goog.require('lf.query.SelectBuilder');
goog.require('lf.testing.MockEnv');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'ObserverRegistryTest');


/** @type {!lf.ObserverRegistry} */
var registry;


/** @type {!lf.testing.MockSchema} */
var schema;


function setUp() {
  asyncTestCase.waitForAsync('setUp');

  var env = new lf.testing.MockEnv();
  env.init().then(function() {
    // TODO(dpapad): Get the registry here.
    registry = env.observerRegistry;
    schema = env.schema;
    asyncTestCase.continueTesting();
  }, fail);
}


/**
 * Tests that addObserver() works as expected by checking that observers are
 * notified when the observable results are modified.
 */
function testAddObserver() {
  // TODO: Array.observe currently exists only in Chrome. Polyfiling mechanism
  // not ready yet, see b/18331726. Remove this once fixed.
  if (!goog.userAgent.product.CHROME) {
    return;
  }

  asyncTestCase.waitForAsync('testObserve');

  var builder = new lf.query.SelectBuilder([]);

  var callback = function() {
    asyncTestCase.continueTesting();
  };

  registry.addObserver(builder, callback);
  var table = schema.getTables()[0];
  var row = table.createRow({ 'id': 'dummyId', 'value': 'dummyValue'});
  var newResults = lf.proc.Relation.fromRows([row], [table.getName()]);
  assertTrue(registry.updateResultsForQuery(builder.getQuery(), newResults));
}


function testRemoveObserver() {
  if (!goog.userAgent.product.CHROME) {
    return;
  }

  var table = schema.getTables()[0];
  var builder = new lf.query.SelectBuilder([]);
  builder.from(table);

  var callback = function() { fail(new Error('Observer not removed')); };
  registry.addObserver(builder, callback);
  registry.removeObserver(builder, callback);
  var row = table.createRow({ 'id': 'dummyId', 'value': 'dummyValue'});
  var newResults = lf.proc.Relation.fromRows([row], [table.getName()]);
  assertFalse(registry.updateResultsForQuery(builder.getQuery(), newResults));
}


function testGetQueriesForTable() {
  if (!goog.userAgent.product.CHROME) {
    return;
  }

  var tables = schema.getTables();

  var builder1 = new lf.query.SelectBuilder([]);
  builder1.from(tables[0]);
  var builder2 = new lf.query.SelectBuilder([]);
  builder2.from(tables[0], tables[1]);
  var builder3 = new lf.query.SelectBuilder([]);
  builder3.from(tables[1]);

  var callback = function() {};

  registry.addObserver(builder1, callback);
  registry.addObserver(builder2, callback);
  registry.addObserver(builder3, callback);

  var queries = registry.getQueriesForTables([tables[0]]);
  assertArrayEquals([builder1.getQuery(), builder2.getQuery()], queries);
  queries = registry.getQueriesForTables([tables[1]]);
  assertArrayEquals([builder2.getQuery(), builder3.getQuery()], queries);
  queries = registry.getQueriesForTables([tables[0], tables[1]]);
  assertArrayEquals(
      [builder1.getQuery(), builder2.getQuery(), builder3.getQuery()],
      queries);
}
