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

  var q = new lf.query.SelectBuilder([]);

  var callback = function() {
    asyncTestCase.continueTesting();
  };

  registry.addObserver(q, callback);
  var observableResults = registry.getResultsForQuery(q.getQuery());
  assertNotNull(observableResults);
  observableResults.push('hello');
}


function testRemoveObserver() {
  if (!goog.userAgent.product.CHROME) {
    return;
  }

  var tables = schema.getTables();
  var q = new lf.query.SelectBuilder([]);
  q.from(tables[0]);
  var query = q.getQuery();

  var callback = function() {};
  registry.addObserver(q, callback);
  var observableResults = registry.getResultsForQuery(query);
  assertNotNull(observableResults);
  assertArrayEquals([query], registry.getQueriesForTables([tables[0]]));

  registry.removeObserver(q, callback);
  observableResults = registry.getResultsForQuery(query);
  assertNull(observableResults);
  assertArrayEquals([], registry.getQueriesForTables([tables[0]]));
}


function testGetQueriesForTable() {
  if (!goog.userAgent.product.CHROME) {
    return;
  }

  var tables = schema.getTables();

  var q1 = new lf.query.SelectBuilder([]);
  q1.from(tables[0]);
  var q2 = new lf.query.SelectBuilder([]);
  q2.from(tables[0], tables[1]);
  var q3 = new lf.query.SelectBuilder([]);
  q3.from(tables[1]);

  var callback = function() {};

  registry.addObserver(q1, callback);
  registry.addObserver(q2, callback);
  registry.addObserver(q3, callback);

  var queries = registry.getQueriesForTables([tables[0]]);
  assertArrayEquals([q1.getQuery(), q2.getQuery()], queries);
  queries = registry.getQueriesForTables([tables[1]]);
  assertArrayEquals([q2.getQuery(), q3.getQuery()], queries);
  queries = registry.getQueriesForTables([tables[0], tables[1]]);
  assertArrayEquals([q1.getQuery(), q2.getQuery(), q3.getQuery()], queries);
}
