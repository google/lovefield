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
goog.provide('lf.testing.util');

goog.require('goog.Promise');
goog.require('lf.TransactionType');
goog.require('lf.backstore.TableType');
goog.require('lf.service');

goog.forwardDeclare('goog.testing.PropertyReplacer');
goog.forwardDeclare('lf.Global');
goog.forwardDeclare('lf.Row');
goog.forwardDeclare('lf.index.Stats');
goog.forwardDeclare('lf.schema.Index');


/**
 * Executes a list of asynchronous functions in a serial manner, such that only
 * one function is being executed at any given time.
 * @param {!Array<!function():!IThenable>} functions The functions to be
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
 * Asserts that the given exception type is thrown.
 * @param {number} exceptionCode The expected exception type.
 * @param {!function()} fn The function to be checked.
 */
lf.testing.util.assertThrowsError = function(exceptionCode, fn) {
  var thrown = false;
  try {
    fn.call();
  } catch (e) {
    thrown = true;
    assertEquals(exceptionCode, e.code);
  }
  assertTrue(thrown);
};


/**
 * Asserts that the given exception type is thrown asynchronounly.
 * @param {number} exceptionCode The expected exception type.
 * @param {!function(): !IThenable} fn The function to be checked.
 * @return {!IThenable}
 */
lf.testing.util.assertThrowsErrorAsync = function(exceptionCode, fn) {
  return fn.call().then(
      fail, function(e) {
        assertEquals(exceptionCode, e.code);
      });
};


/**
 * Selects all entries in the given table directly from the database (skips the
 * cache).
 * @param {!lf.Global} global
 * @param {!lf.schema.Table} tableSchema
 * @return {!IThenable<!Array<!lf.Row>>}
 */
lf.testing.util.selectAll = function(global, tableSchema) {
  var backStore = global.getService(lf.service.BACK_STORE);

  var tx = backStore.createTx(lf.TransactionType.READ_ONLY, [tableSchema]);
  var table = tx.getTable(
      tableSchema.getName(),
      tableSchema.deserializeRow.bind(tableSchema),
      lf.backstore.TableType.DATA);
  return table.get([]);
};


/**
 * Instruments the return value of lf.index.Index#cost().
 * @param {!goog.testing.PropertyReplacer} propertyReplacer
 * @param {!lf.index.IndexStore} indexStore
 * @param {!lf.schema.Index} indexSchema
 * @param {number} cost The cost to be used.
 */
lf.testing.util.simulateIndexCost = function(
    propertyReplacer, indexStore, indexSchema, cost) {
  var index = indexStore.get(indexSchema.getNormalizedName());
  propertyReplacer.replace(
      index, 'cost', function() { return cost; });
};


/**
 * Instruments the return value of lf.index.Index#stats().
 * @param {!goog.testing.PropertyReplacer} propertyReplacer
 * @param {!lf.index.IndexStore} indexStore
 * @param {string} indexName
 * @param {!lf.index.Stats} indexStats The stats to be used.
 */
lf.testing.util.simulateIndexStats = function(
    propertyReplacer, indexStore, indexName, indexStats) {
  var index = indexStore.get(indexName);
  propertyReplacer.replace(
      index, 'stats', function() { return indexStats; });
};
