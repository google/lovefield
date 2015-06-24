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
goog.provide('lf.testing.backstore.TableTester');

goog.require('goog.Promise');
goog.require('goog.testing.jsunit');
goog.require('lf.Row');



/**
 * @constructor @struct
 * @param {!function():!lf.Table} tableCreator
 */
lf.testing.backstore.TableTester = function(tableCreator) {
  /** @private {!function():!lf.Table} */
  this.creator_ = tableCreator;
};


/** @return {!IThenable} */
lf.testing.backstore.TableTester.prototype.run = function() {
  return goog.Promise.all([
    this.testGet_NonExisting_(),
    this.testGet_AllValues_(),
    this.testPut_(),
    this.testRemove_()
  ]);
};


/**
 * @return {!IThenable}
 * @private
 */
lf.testing.backstore.TableTester.prototype.testGet_NonExisting_ = function() {
  var resolver = goog.Promise.withResolver();

  var table = this.creator_();
  var nonExistingRowId = 10;
  table.get([nonExistingRowId]).then(
      function(results) {
        assertArrayEquals([], results);
        resolver.resolve();
      }, fail);
  return resolver.promise;
};


/**
 * @return {!IThenable}
 * @private
 */
lf.testing.backstore.TableTester.prototype.testGet_AllValues_ = function() {
  var rowCount = 10;
  var rows = [];
  for (var i = 0; i < rowCount; i++) {
    rows.push(lf.Row.create());
  }

  var resolver = goog.Promise.withResolver();
  var table = this.creator_();
  table.put(rows).then(
      goog.bind(function() {
        return table.get([]);
      }, this)).then(
      function(results) {
        assertEquals(rowCount, results.length);
        resolver.resolve();
      }, fail);

  return resolver.promise;
};


/**
 * @return {!IThenable}
 * @private
 */
lf.testing.backstore.TableTester.prototype.testPut_ = function() {
  var rows = [];
  var rowIds = [];

  for (var i = 0; i < 10; i++) {
    var row = lf.Row.create();
    rows.push(row);
    rowIds.push(row.id());
  }

  var resolver = goog.Promise.withResolver();
  var table = this.creator_();
  table.put(rows).then(
      goog.bind(function() {
        return table.get(rowIds);
      }, this)).then(
      function(results) {
        var resultRowIds = results.map(function(row) {
          return row.id();
        });
        assertArrayEquals(rowIds, resultRowIds);
        resolver.resolve();
      }, fail);

  return resolver.promise;
};


/**
 * @return {!IThenable}
 * @private
 */
lf.testing.backstore.TableTester.prototype.testRemove_ = function() {
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

  var resolver = goog.Promise.withResolver();
  var table = this.creator_();
  table.put(rows).then(
      goog.bind(function() {
        return table.get([]);
      }, this)).then(
      function(results) {
        assertEquals(rows.length, results.length);

        return table.remove(rowIdsToDelete);
      }).then(
      goog.bind(function() {
        return table.get([]);
      }, this)).then(
      function(results) {
        assertEquals(rows.length - rowIdsToDelete.length, results.length);

        results.forEach(function(row) {
          assertTrue(rowIdsToDelete.indexOf(row.id()) == -1);
        });
        resolver.resolve();
      }, fail);

  return resolver.promise;
};
