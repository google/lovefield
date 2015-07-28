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
goog.provide('lf.ObserverRegistry');

goog.require('goog.asserts');
goog.require('lf.DiffCalculator');
goog.require('lf.structs.map');
goog.require('lf.structs.set');

goog.forwardDeclare('lf.query.Select');
goog.forwardDeclare('lf.query.SelectBuilder');



/**
 * A class responsible for keeping track of all observers as well as all arrays
 * that are being observed.
 * @constructor @struct
 */
lf.ObserverRegistry = function() {
  /**
   * A map where each entry represents an observed query.
   * @private {!lf.structs.Map<string, !lf.ObserverRegistry.Entry_>}
   */
  this.entries_ = lf.structs.map.create();
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
 * @param {!lf.query.Select} rawBuilder The query to be observed.
 * @param {!Function} callback The callback to be called whenever the results of
 *     the given query are modified.
 */
lf.ObserverRegistry.prototype.addObserver = function(rawBuilder, callback) {
  var builder = /** @type {!lf.query.SelectBuilder} */ (rawBuilder);
  var queryId = this.getQueryId_(builder.getObservableQuery());

  var entry = this.entries_.get(queryId) || null;
  if (goog.isNull(entry)) {
    entry = new lf.ObserverRegistry.Entry_(builder);
    this.entries_.set(queryId, entry);
  }
  entry.addObserver(callback);
};


/**
 * Unregisters an observer for the given query.
 * @param {!lf.query.Select} builder The query to be unobserved.
 * @param {!Function} callback The callback to be unregistered.
 */
lf.ObserverRegistry.prototype.removeObserver = function(builder, callback) {
  var query =
      /** @type {!lf.query.SelectBuilder} */ (builder).getObservableQuery();
  var queryId = this.getQueryId_(query);

  var entry = this.entries_.get(queryId) || null;
  goog.asserts.assert(
      goog.isDefAndNotNull(entry),
      'Attempted to unobserve a query that was not observed.');
  var didRemove = entry.removeObserver(callback);
  goog.asserts.assert(
      didRemove,
      'removeObserver: Inconsistent state detected.');

  if (!entry.hasObservers()) {
    this.entries_.delete(queryId);
  }
};


/**
 * Finds all the observed queries that reference at least one of the given
 * tables.
 * @param {!lf.structs.Set<!lf.schema.Table>} tables
 * @return {!Array<!lf.proc.TaskItem>}
 */
lf.ObserverRegistry.prototype.getTaskItemsForTables = function(tables) {
  var tableSet = lf.structs.set.create();
  tables.forEach(function(table) {
    tableSet.add(table.getName());
  });

  var items = [];
  this.entries_.forEach(function(entry, key) {
    var item = entry.getTaskItem();
    var refersToTables = item.context.from.some(function(table) {
      return tableSet.has(table.getName());
    });
    if (refersToTables) {
      items.push(item);
    }
  });
  return items;
};


/**
 * Updates the results of a given query. It is ignored if the query is no longer
 * being observed.
 * @param {!lf.query.SelectContext} query
 * @param {!lf.proc.Relation} results The new results.
 * @return {boolean} Whether any results were updated.
 */
lf.ObserverRegistry.prototype.updateResultsForQuery = function(query, results) {
  var queryId = this.getQueryId_(
      goog.isDefAndNotNull(query.clonedFrom) ?
      /** @type {!lf.query.SelectContext} */ (query.clonedFrom) : query);
  var entry = this.entries_.get(queryId) || null;

  if (!goog.isNull(entry)) {
    entry.updateResults(results);
    return true;
  }

  return false;
};



/**
 * @constructor @struct
 * @private
 *
 * @param {!lf.query.SelectBuilder} builder
 */
lf.ObserverRegistry.Entry_ = function(builder) {
  /** @private {!lf.query.SelectBuilder} */
  this.builder_ = builder;

  /** @private {!lf.structs.Set<!Function>} */
  this.observers_ = lf.structs.set.create();

  /** @private {!Array<?>} */
  this.observable_ = [];

  /** @private {?lf.proc.Relation} */
  this.lastResults_ = null;

  /** @private {!lf.DiffCalculator} */
  this.diffCalculator_ = new lf.DiffCalculator(
      builder.getObservableQuery(), this.observable_);
};


/**
 * @param {!Function} callback
 */
lf.ObserverRegistry.Entry_.prototype.addObserver = function(callback) {
  if (this.observers_.has(callback)) {
    goog.asserts.fail('Attempted to register observer twice.');
    return;
  }

  this.observers_.add(callback);
};


/**
 * @param {!Function} callback
 * @return {boolean} Whether the callback was found and removed.
 */
lf.ObserverRegistry.Entry_.prototype.removeObserver = function(callback) {
  return this.observers_.delete(callback);
};


/** @return {!lf.proc.TaskItem} */
lf.ObserverRegistry.Entry_.prototype.getTaskItem = function() {
  return this.builder_.getObservableTaskItem();
};


/**
 * @return {boolean} Whether this query has any registered observers.
 */
lf.ObserverRegistry.Entry_.prototype.hasObservers = function() {
  return this.observers_.size > 0;
};


/**
 * Updates the results for this query, which causes observes to be notified.
 * @param {!lf.proc.Relation} newResults The new results.
 */
lf.ObserverRegistry.Entry_.prototype.updateResults = function(newResults) {
  var changeRecords = this.diffCalculator_.applyDiff(
      this.lastResults_, newResults);
  this.lastResults_ = newResults;

  if (changeRecords.length > 0) {
    this.observers_.forEach(function(observerFn) {
      observerFn(changeRecords);
    });
  }
};
