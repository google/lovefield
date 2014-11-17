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
goog.provide('lf.ObserverRegistry');

goog.require('goog.asserts');
goog.require('goog.labs.structs.Multimap');
goog.require('goog.structs.Map');
goog.require('goog.structs.Set');

goog.forwardDeclare('lf.query.Select');
goog.forwardDeclare('lf.query.SelectBuilder');



/**
 * A class responsible for keeping track of all observers as well as all arrays
 * that are being observed.
 * @constructor
 */
lf.ObserverRegistry = function() {
  /**
   * A map associating a query with the last known query results.
   * @private {!goog.structs.Map.<string, !Array>}
   */
  this.resultMap_ = new goog.structs.Map();

  /**
   * A map associating a query with observers for that query.
   * @private {!goog.labs.structs.Multimap.<string, !Function>}
   */
  this.observerMap_ = new goog.labs.structs.Multimap();

  /**
   * @private {!goog.structs.Set.<!lf.query.SelectContext>}
   */
  this.queries_ = new goog.structs.Set();
};


/**
 * @param {!lf.query.SelectContext} query
 * @return {string} A unique ID of the given query.
 * @private
 */
lf.ObserverRegistry.prototype.getQueryId_ = function(query) {
  return goog.getUid(query).toString();
};


/**
 * Registers an observer for the given query.
 * @param {!lf.query.Select} builder The query to be observed.
 * @param {!Function} callback The callback to be called whenever the results of
 *     the given query are modified.
 */
lf.ObserverRegistry.prototype.addObserver = function(builder, callback) {
  var query = /** @type {!lf.query.SelectBuilder} */ (builder).getQuery();
  var queryId = this.getQueryId_(query);

  var result = this.resultMap_.get(queryId, null);
  if (goog.isNull(result)) {
    this.queries_.add(query);
    result = [];
    this.resultMap_.set(queryId, result);
  }

  Array.observe(result, callback);
  this.observerMap_.add(queryId, callback);
};


/**
 * Unregisters an observer for the given query.
 * @param {!lf.query.Select} builder The query to be unobserved.
 * @param {!Function} callback The callback to be unregistered.
 */
lf.ObserverRegistry.prototype.removeObserver = function(builder, callback) {
  var query = /** @type {!lf.query.SelectBuilder} */ (builder).getQuery();
  var queryId = this.getQueryId_(query);
  var result = this.resultMap_.get(queryId, null);

  goog.asserts.assert(
      goog.isDefAndNotNull(result),
      'Attempted to unobserve a query that was not observed.');

  Array.unobserve(result, callback);
  var didRemove = this.observerMap_.remove(queryId, callback);
  goog.asserts.assert(
      didRemove,
      'removeObserver: Inconsistent state detected.');

  if (this.observerMap_.get(queryId).length == 0) {
    this.resultMap_.remove(queryId);
    this.queries_.remove(query);
  }
};


/**
 * Finds all the observed queries that reference at least one of the given
 * tables.
 * @param {!Array.<!lf.schema.Table>} tables
 * @return {!Array.<!lf.query.SelectContext>}
 */
lf.ObserverRegistry.prototype.getQueriesForTables = function(tables) {
  var tableSet = new goog.structs.Set();
  tables.forEach(function(table) {
    tableSet.add(table.getName());
  });

  return this.queries_.getValues().filter(
      function(query) {
        return query.from.some(
            function(table) {
              return tableSet.contains(table.getName());
            });
      });
};


/**
 * @param {!lf.query.SelectContext} query
 * @return {Array} The observable results corresponding to the given query.
 */
lf.ObserverRegistry.prototype.getResultsForQuery = function(query) {
  var queryId = this.getQueryId_(query);
  return this.resultMap_.get(queryId, null);
};
