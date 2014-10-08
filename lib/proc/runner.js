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
goog.provide('lf.proc.Runner');

goog.require('goog.Promise');
goog.require('goog.structs.Set');
goog.require('lf.Global');
goog.require('lf.TransactionType');
goog.require('lf.cache.Journal');
goog.require('lf.proc.PhysicalQueryPlan');
goog.require('lf.proc.ProjectStep');
goog.require('lf.service');



/**
 * Query/Transaction runner which actually runs the query in a transaction
 * (either implicit or explict) on the back store.
 * @constructor
 * @struct
 * @final
 */
lf.proc.Runner = function() {
  /**
   * The scopes that are currently used by an in-flight query execution
   * operation. Any other queries with overlapping scopes will be queued until
   * their scopes are free.
   * @private {!goog.structs.Set.<!lf.schema.Table>}
   */
  this.usedScopes_ = new goog.structs.Set();

  /** @private {!Array.<!lf.proc.RunnerTask_>} */
  this.queue_ = [];
};


/**
 * Schedules a RunnerTask_. If there is no scope conflict with any other
 * in-flight task, this task will be executed immediately, otherwise it will be
 * queued.
 * @param {!lf.proc.RunnerTask_} task
 * @return {!IThenable.<!Array.<!lf.proc.Relation>>}
 * @private
 */
lf.proc.Runner.prototype.scheduleTask_ = function(task) {
  var overlapScope = this.usedScopes_.intersection(task.combinedScope);
  if (!overlapScope.isEmpty()) {
    this.queue_.push(task);
    return task.resolver.promise;
  }

  return this.execTask_(task);
};


/**
 * Examines the queue and executes as many tasks as possible taking into account
 * the scope of each task and the currently occupied scopes.
 * @private
 */
lf.proc.Runner.prototype.consumePending_ = function() {
  var queue = this.queue_.slice();

  for (var i = 0; i < queue.length; i++) {
    // Note: Iterating on a shallow copy of this.queue_, because this.queue_
    // will be modified during iteration and therefore it is not correct
    // iterating on this.queue_, as it can't guarantee that every task in the
    // queue will be traversed.
    var task = queue[i];
    if (this.usedScopes_.intersection(task.combinedScope).isEmpty()) {
      // Removing from this.queue_, not queue which is a copy used for
      // iteration.
      this.queue_.splice(i, /* howMany */ 1);
      this.scheduleTask_(task);
    }
  }
};


/**
 * Executes a RunnerTask_. Callers of this method should have already checked
 * that no other running task is using any table within the combined scope of
 * this task.
 * @param {!lf.proc.RunnerTask_} task
 * @return {!IThenable.<!Array.<!lf.proc.Relation>>}
 * @private
 */
lf.proc.Runner.prototype.execTask_ = function(task) {
  if (task.txType == lf.TransactionType.READ_WRITE) {
    this.usedScopes_.addAll(task.combinedScope);
  }

  var journal = new lf.cache.Journal(task.combinedScope.getValues());
  var results = [];

  var remainingPlans = task.plans.slice();

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

  var releaseScope = goog.bind(function() {
    if (task.txType == lf.TransactionType.READ_WRITE) {
      this.usedScopes_.removeAll(task.combinedScope);
    }
  }, this);

  return sequentiallyExec().then(function() {
    var backStore = /** @type {!lf.BackStore} */ (
        lf.Global.get().getService(lf.service.BACK_STORE));
    var tx = backStore.createTx(task.txType, journal);
    return tx.commit();
  }).then(goog.bind(function() {
    releaseScope();
    task.resolver.resolve(results);
    this.consumePending_();
    return task.resolver.promise;
  }, this), goog.bind(function(e) {
    journal.rollback();
    releaseScope();
    this.consumePending_();
    task.resolver.reject(e);
    return task.resolver.promise;
  }, this));
};


/**
 * Executes given physical query plans in the order specified within one single
 * transaction.
 * @param {!Array.<!lf.proc.PhysicalQueryPlan>} plans The plans to be executed
 *     in the order given within the array.
 * @param {!lf.TransactionType=} opt_txType
 * @return {!IThenable.<!Array.<!lf.proc.Relation>>}
 */
lf.proc.Runner.prototype.exec = function(plans, opt_txType) {
  var combinedScope = lf.proc.PhysicalQueryPlan.getCombinedScope(plans);
  var txType = opt_txType || this.getTxType_(plans);
  var runnerTask = new lf.proc.RunnerTask_(plans, combinedScope, txType);
  return this.scheduleTask_(runnerTask);
};


/**
 * @param {!Array.<!lf.proc.PhysicalQueryPlan>} plans
 * @return {!lf.TransactionType}
 * @private
 */
lf.proc.Runner.prototype.getTxType_ = function(plans) {
  var txType = plans.some(function(plan) {
    return !(plan.getRoot() instanceof lf.proc.ProjectStep);
  }) ? lf.TransactionType.READ_WRITE : lf.TransactionType.READ_ONLY;
  return txType;
};



/**
 * A RunnerTask_ represents a collection of queries that should be executed as
 * part of a single transaction.
 * @constructor
 * @struct
 *
 * @param {!Array.<!lf.proc.PhysicalQueryPlan>} plans
 * @param {!goog.structs.Set.<!lf.schema.Table>} combinedScope
 * @param {!lf.TransactionType} txType
 * @private
 */
lf.proc.RunnerTask_ = function(plans, combinedScope, txType) {
  /** @type {!Array.<!lf.proc.PhysicalQueryPlan>} */
  this.plans = plans;

  /** @type {!goog.structs.Set.<!lf.schema.Table>} */
  this.combinedScope = combinedScope;

  /** @type {!lf.TransactionType} */
  this.txType = txType;

  /** @type {!goog.promise.Resolver.<!Array.<!lf.proc.Relation>>} */
  this.resolver = goog.Promise.withResolver();
};
