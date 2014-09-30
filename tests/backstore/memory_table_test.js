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
goog.require('goog.array');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('lf.Row');
goog.require('lf.backstore.MemoryTable');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('MemoryTable');


/** @private {!lf.backstore.MemoryTable} */
var table;


function setUp() {
  table = new lf.backstore.MemoryTable();
}


function testGet_NonExisting() {
  asyncTestCase.waitForAsync('testGet_NonExisting');

  var nonExistingRowId = 10;
  table.get([nonExistingRowId]).then(
      function(results) {
        assertArrayEquals([], results);
        asyncTestCase.continueTesting();
      }, fail);
}


function testGet_AllValues() {
  asyncTestCase.waitForAsync('testGet_AllValues');

  var rowCount = 10;
  var rows = [];
  for (var i = 0; i < rowCount; i++) {
    rows.push(lf.Row.create());
  }

  table.put(rows).then(
      function() {
        return table.get([]);
      }).then(
      function(results) {
        assertEquals(rowCount, results.length);
        asyncTestCase.continueTesting();
      }, fail);
}


function testPut() {
  asyncTestCase.waitForAsync('testPut');

  var rows = [];
  var rowIds = [];

  for (var i = 0; i < 10; i++) {
    var row = lf.Row.create();
    rows.push(row);
    rowIds.push(row.id());
  }
  table.put(rows).then(
      function() {
        return table.get(rowIds);
      }).then(
      function(results) {
        var resultRowIds = results.map(function(row) {
          return row.id();
        });
        assertArrayEquals(rowIds, resultRowIds);
        asyncTestCase.continueTesting();
      }, fail);
}


function testRemove() {
  asyncTestCase.waitForAsync('testRemove');

  var rows = [];
  var rowIdsToDelete = [];

  for (var i = 0; i < 10; i++) {
    var row = lf.Row.create();
    rows.push(row);
    rowIdsToDelete.push(row.id());
  }

  for (var j = 0; j < 5; j++) {
    var row = lf.Row.create();
    rows.push(row);
  }

  table.put(rows).then(
      function() {
        return table.get([]);
      }).then(
      function(results) {
        assertEquals(rows.length, results.length);

        return table.remove(rowIdsToDelete);
      }).then(
      function() {
        return table.get([]);
      }).then(
      function(results) {
        assertEquals(rows.length - rowIdsToDelete.length, results.length);

        results.forEach(function(row) {
          assertFalse(goog.array.contains(rowIdsToDelete, row.id()));
        });
        asyncTestCase.continueTesting();
      }, fail);
}
