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
goog.provide('lf.proc.ObserverTask');

goog.require('goog.Promise');
goog.require('lf.Global');
goog.require('lf.TransactionType');
goog.require('lf.cache.Journal');
goog.require('lf.proc.PhysicalQueryPlan');
goog.require('lf.proc.Task');
goog.require('lf.service');



/**
 * A ObserverTask represents a collection of queries that should be executed as
 * part of a single transaction.
 * @implements {lf.proc.Task}
 * @constructor
 * @struct
 *
 * @param {!Array<!lf.query.SelectContext>} queries
 */
lf.proc.ObserverTask = function(queries) {
  /** @private {!Array<!lf.query.SelectContext>} */
  this.queries_ = queries;

  var queryEngine = /** @type {!lf.proc.QueryEngine} */ (
      lf.Global.get().getService(lf.service.QUERY_ENGINE));

  /** @private {!Array.<!lf.proc.PhysicalQueryPlan>} */
  this.plans_ = queries.map(
      function(query) {
        return queryEngine.getPlan(query);
      });

  /** @private {!lf.ObserverRegistry} */
  this.observerRegistry_ = lf.Global.get().getService(
      lf.service.OBSERVER_REGISTRY);

  /** @private {!goog.structs.Set.<!lf.schema.Table>} */
  this.combinedScope_ = lf.proc.PhysicalQueryPlan.getCombinedScope(this.plans_);

  /** @private {!goog.promise.Resolver.<!Array.<!lf.proc.Relation>>} */
  this.resolver_ = goog.Promise.withResolver();
};


/** @override */
lf.proc.ObserverTask.prototype.exec = function() {
  var journal = new lf.cache.Journal(this.combinedScope_.getValues());
  var results = [];

  var remainingPlans = this.plans_.slice();

  /** @return {!IThenable} */
  var sequentiallyExec = goog.bind(function() {
    var plan = remainingPlans.shift();
    if (plan) {
      return plan.getRoot().exec(journal).then(function(relation) {
        results.push(relation);
        return sequentiallyExec();
      });
    }
    return goog.Promise.resolve();
  }, this);

  return sequentiallyExec().then(goog.bind(function() {
    var backStore = /** @type {!lf.BackStore} */ (
        lf.Global.get().getService(lf.service.BACK_STORE));
    var tx = backStore.createTx(this.getType(), journal);
    return tx.commit();
  }, this)).then(goog.bind(function() {
    this.queries_.forEach(function(query, index) {
      var lastKnownResult = this.observerRegistry_.getResultsForQuery(query);

      // lastKnownResult can be null if user unobserved the query while this
      // ObserverTask was already in progress.
      if (!goog.isNull(lastKnownResult)) {
        lf.proc.ObserverTask.applyDiff_(
            query.columns, lastKnownResult, results[index]);
      }
    }, this);
    return results;
  }, this));
};


/** @override */
lf.proc.ObserverTask.prototype.getType = function() {
  return lf.TransactionType.READ_ONLY;
};


/** @override */
lf.proc.ObserverTask.prototype.getScope = function() {
  return this.combinedScope_;
};


/** @override */
lf.proc.ObserverTask.prototype.getResolver = function() {
  return this.resolver_;
};


/**
 * Detects changes (additions/modifications/deletions) and applies them to the
 * observed array.
 * @param {!Array<!lf.schema.Column>} columns The columns included in each
 *     entry.
 * @param {!Array<?>} observableResult The array holding the last results. This
 *     is the array that is directly being observed by observers.
 * @param {!lf.proc.Relation} newResult The new results.
 * @private
 */
lf.proc.ObserverTask.applyDiff_ = function(
    columns, observableResult, newResult) {
  // TODO(dpapad): This is a dummy implementation that
  //  1) Blindly removes any existing contents from the array.
  //  2) Adds all new results to the observed array.
  // Modify this logic to properly detect additions/modifications/deletions.
  observableResult.length = 0;

  for (var i = 0; i < newResult.entries.length; i++) {
    observableResult.push(newResult.entries[i].row.payload());
  }
};
