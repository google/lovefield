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

/**
 * @fileoverview This test should actually be part of local_storage_test.
 * However, it needs to create an iframe in test HTML, and thus implemented
 * sepearately.
 */
goog.setTestOnly();
goog.require('goog.Promise');
goog.require('goog.dom.iframe');
goog.require('goog.html.testing');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('lf.Capability');
goog.require('lf.Row');
goog.require('lf.backstore.LocalStorage');
goog.require('lf.testing.getSchemaBuilder');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('LocalStorage');


/** @type {!lf.schema.Database} */
var schema;


/** @type {!goog.promise.Resolver} */
var resolver;


function setUp() {
  if (!lf.Capability.get().localStorageEvent) {
    return;
  }

  schema = lf.testing.getSchemaBuilder('mock_schema').getSchema();
  window.localStorage.clear();
  resolver = goog.Promise.withResolver();
}


/** @param {!Array<lf.cache.TableDiff>} diffs */
function sampleHandler(diffs) {
  var diff = diffs[0];
  if (diff.getName().indexOf('tableC') == -1) {
    // Not what we care.
    return;
  }

  assertEquals(2, diff.getAdded().size);
  assertEquals(2, diff.getDeleted().size);
  assertEquals(2, diff.getModified().size);
  resolver.resolve();
}


function testSubscribe() {
  if (!lf.Capability.get().localStorageEvent) {
    return;
  }

  asyncTestCase.waitForAsync('testSubscribe');

  // Set up database, create 6 rows in tableC.
  var db = new lf.backstore.LocalStorage(schema);
  db.initSync();
  var tableC = db.getTableInternal('tableC');
  tableC.put([
    new lf.Row(1, {'id': '101', 'name': 'A101'}),
    new lf.Row(2, {'id': '102', 'name': 'B102'}),
    new lf.Row(3, {'id': '103', 'name': 'C103'}),
    new lf.Row(4, {'id': '104', 'name': 'D104'}),
    new lf.Row(5, {'id': '105', 'name': 'E105'}),
    new lf.Row(6, {'id': '106', 'name': 'F106'})
  ]);
  db.commit();

  // Workaround the case IE will fire events resulted from same tab.
  db.subscribe(sampleHandler);

  var iframeContents = goog.html.testing.newSafeHtmlForTest(
      '<script>' +
      '  window.localStorage.setItem("mock_schema.tableC",' +
      '"{\\"1\\":{\\"id\\":\\"101\\",\\"name\\":\\"A101\\"},' +
      '\\"2\\":{\\"id\\":\\"102\\",\\"name\\":\\"B102\\"},' +
      '\\"5\\":{\\"id\\":\\"103\\",\\"name\\":\\"C105\\"},' +
      '\\"6\\":{\\"id\\":\\"104\\",\\"name\\":\\"D106\\"},' +
      '\\"7\\":{\\"id\\":\\"105\\",\\"name\\":\\"G107\\"},' +
      '\\"8\\":{\\"id\\":\\"106\\",\\"name\\":\\"H108\\"}}");' +
      '</script>');
  goog.dom.iframe.createWithContent(
      /** @type {!HTMLBodyElement} */ (window.document.body),
      /* opt_headContents */ undefined,
      iframeContents);

  resolver.promise.then(asyncTestCase.continueTesting.bind(asyncTestCase));
}
