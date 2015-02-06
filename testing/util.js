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
goog.provide('lf.testing.util');

goog.require('goog.Promise');
goog.require('lf.Exception');
goog.require('lf.TransactionType');
goog.require('lf.cache.Journal');
goog.require('lf.service');


/**
 * Executes a list of asynchronous functions in a serial manner, such that only
 * one function is being executed at any given time.
 * @param {!Array.<!function():!IThenable>} functions The functions to be
 *     executed.
 * @return {!IThenable} A deferred holding the results of each executed function
 *     in the same order.
 */
lf.testing.util.sequentiallyRun = function(functions) {
  var resolver = goog.Promise.withResolver();

  var results = new Array(functions.length);
  var i = 0;
  var runner = function() {
    functions[i]().then(function(result) {
      results[i] = result;
      if (i < functions.length - 1) {
        i++;
        runner();
      } else {
        resolver.resolve();
      }
    }, function(e) {
      resolver.reject(e);
    });
  };

  runner();
  return resolver.promise;
};


/**
 * Asserts that an lf.Exception.Type.SYNTAX error is thrown.
 * @param {!function()} fn The function to be checked.
 */
lf.testing.util.assertThrowsSyntaxError = function(fn) {
  var thrown = false;
  try {
    fn.call();
  } catch (e) {
    thrown = true;
    assertEquals(e.name, lf.Exception.Type.SYNTAX);
  }
  assertTrue(thrown);
};


/**
 * Selects all entries in the given table directly from the database (skips the
 * cache).
 * @param {!lf.Global} global
 * @param {!lf.schema.Table} tableSchema
 * @return {!IThenable}
 */
lf.testing.util.selectAll = function(global, tableSchema) {
  var backStore = global.getService(lf.service.BACK_STORE);

  var tx = backStore.createTx(
      lf.TransactionType.READ_ONLY,
      new lf.cache.Journal(global, [tableSchema]));
  var table = tx.getTable(tableSchema.getName(), tableSchema.deserializeRow);
  return table.get([]);
};
