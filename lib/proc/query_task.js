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
goog.provide('lf.proc.QueryTask');

goog.require('goog.Promise');
goog.require('lf.Global');
goog.require('lf.TransactionType');
goog.require('lf.cache.Journal');
goog.require('lf.proc.ObserverTask');
goog.require('lf.proc.PhysicalQueryPlan');
goog.require('lf.proc.ProjectStep');
goog.require('lf.proc.Task');
goog.require('lf.service');



/**
 * A QueryTask represents a collection of queries that should be executed as
 * part of a single transaction.
 * @implements {lf.proc.Task}
 * @constructor
 * @struct
 *
 * @param {!Array.<!lf.proc.PhysicalQueryPlan>} plans
 */
lf.proc.QueryTask = function(plans) {
  /** @private {!lf.BackStore} */
  this.backStore_ = lf.Global.get().getService(lf.service.BACK_STORE);

  /** @private {!lf.ObserverRegistry} */
  this.observerRegistry_ = lf.Global.get().getService(
      lf.service.OBSERVER_REGISTRY);

  /** @private {!lf.proc.Runner} */
  this.runner_ = lf.Global.get().getService(lf.service.RUNNER);

  /** @private {!Array.<!lf.proc.PhysicalQueryPlan>} */
  this.plans_ = plans;

  /** @private {!goog.structs.Set.<!lf.schema.Table>} */
  this.combinedScope_ = lf.proc.PhysicalQueryPlan.getCombinedScope(plans);

  /** @private {!lf.TransactionType} */
  this.txType_ = this.detectType_();

  /** @private {!goog.promise.Resolver.<!Array.<!lf.proc.Relation>>} */
  this.resolver_ = goog.Promise.withResolver();
};


/**
 * @return {!lf.TransactionType}
 * @private
 */
lf.proc.QueryTask.prototype.detectType_ = function() {
  var txType = this.plans_.some(
      function(plan) {
        return !(plan.getRoot() instanceof lf.proc.ProjectStep);
      }) ? lf.TransactionType.READ_WRITE : lf.TransactionType.READ_ONLY;
  return txType;
};


/** @override */
lf.proc.QueryTask.prototype.exec = function() {
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
    var tx = this.backStore_.createTx(this.txType_, journal);
    return tx.commit();
  }, this)).then(goog.bind(function() {
    this.scheduleObserverTask_();
    return results;
  }, this), goog.bind(function(e) {
    journal.rollback();
    throw e;
  }, this));
};


/** @override */
lf.proc.QueryTask.prototype.getType = function() {
  return this.txType_;
};


/** @override */
lf.proc.QueryTask.prototype.getScope = function() {
  return this.combinedScope_;
};


/** @override */
lf.proc.QueryTask.prototype.getResolver = function() {
  return this.resolver_;
};


/**
 * Schedules an ObserverTask if necessary.
 * @private
 */
lf.proc.QueryTask.prototype.scheduleObserverTask_ = function() {
  if (this.txType_ == lf.TransactionType.READ_ONLY) {
    return;
  }

  var queries = this.observerRegistry_.getQueriesForTables(
      this.combinedScope_.getValues());

  if (queries.length == 0) {
    return;
  }

  var observerTask = new lf.proc.ObserverTask(queries);
  this.runner_.scheduleTask(observerTask, true /* opt_prioritize */);
};
