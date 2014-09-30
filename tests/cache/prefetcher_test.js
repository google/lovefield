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
goog.require('lf.cache.Prefetcher');
goog.require('lf.testing.MockEnv');
goog.require('lf.testing.MockSchema');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('Prefetcher');


/** @type {!lf.testing.MockEnv} */
var env;


function setUp() {
  env = new lf.testing.MockEnv();
  asyncTestCase.waitForAsync('init');
  env.init().then(goog.bind(asyncTestCase.continueTesting, asyncTestCase));
}


function testPrefetcher() {
  // Setup some data first.
  var rows = [];
  for (var i = 0; i < 10; i++) {
    rows.push(new lf.testing.MockSchema.Row(i + 2, {
      'id': 1000 + i,
      'name': 'name' + i
    }));
  }

  var table = env.store.getTableInternal(env.schema.getTables()[3].getName());
  var indices = env.indexStore.getTableIndices(
      env.schema.getTables()[3].getName());

  asyncTestCase.waitForAsync('testPrefetcher');
  table.put(rows).then(function() {
    assertEquals(0, env.cache.getCount());
    assertArrayEquals([], indices[0].get(1001));
    var prefetcher = new lf.cache.Prefetcher();
    return prefetcher.init(env.schema);
  }, fail).then(function() {
    assertEquals(10, env.cache.getCount());
    assertEquals(rows[1], env.cache.get([indices[1].get(1001)[0]])[0]);
    assertEquals(rows[1], env.cache.get([indices[3].get('1001_name1')[0]])[0]);
    asyncTestCase.continueTesting();
  });
}
