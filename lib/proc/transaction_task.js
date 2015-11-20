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
goog.provide('lf.proc.TransactionTask');

goog.require('goog.Promise');
goog.require('lf.TransactionStats');
goog.require('lf.TransactionType');
goog.require('lf.cache.Journal');
goog.require('lf.proc.ObserverQueryTask');
goog.require('lf.proc.Task');
goog.require('lf.proc.TaskPriority');
goog.require('lf.service');
goog.require('lf.structs.set');



/**
 * A TransactionTask is used when the user explicitly starts a transaction and
 * can execute queries within this transaction at will. A TransactionTask is
 * posted to the lf.proc.Runner to ensure that all required locks have been
 * acquired before any queries are executed. Any queries that are performed as
 * part of a TransactionTask will not be visible to lf.proc.Runner at all (no
 * corresponding QueryTask will be posted). Once the transaction is finalized,
 * it will appear to the lf.proc.Runner that this task finished and all locks
 * will be released, exactly as is done for any type of lf.proc.Task.
 *
 * @implements {lf.proc.Task}
 * @constructor
 * @struct
 *
 * @param {!lf.Global} global
 * @param {!Array<!lf.schema.Table>} scope
 */
lf.proc.TransactionTask = function(global, scope) {
  /** @private {!lf.Global} */
  this.global_ = global;

  /** @private {!lf.BackStore} */
  this.backStore_ = global.getService(lf.service.BACK_STORE);

  /** @private {!lf.proc.Runner} */
  this.runner_ = global.getService(lf.service.RUNNER);

  /** @private {!lf.ObserverRegistry} */
  this.observerRegistry_ = global.getService(lf.service.OBSERVER_REGISTRY);

  /** @private {!lf.structs.Set<!lf.schema.Table>} */
  this.scope_ = lf.structs.set.create(scope);

  /** @private {!lf.cache.Journal} */
  this.journal_ = new lf.cache.Journal(this.global_, this.scope_);

  /** @private {!goog.promise.Resolver.<!Array<!lf.proc.Relation>>} */
  this.resolver_ = goog.Promise.withResolver();

  /** @private {!goog.promise.Resolver.<!Array<!lf.proc.Relation>>} */
  this.execResolver_ = goog.Promise.withResolver();

  /** @private {!goog.promise.Resolver} */
  this.acquireScopeResolver_ = goog.Promise.withResolver();

  /** @private {!lf.backstore.Tx} */
  this.tx_;
};


/** @override */
lf.proc.TransactionTask.prototype.exec = function() {
  this.acquireScopeResolver_.resolve();
  return this.execResolver_.promise;
};


/** @override */
lf.proc.TransactionTask.prototype.getType = function() {
  return lf.TransactionType.READ_WRITE;
};


/** @override */
lf.proc.TransactionTask.prototype.getScope = function() {
  return this.scope_;
};


/** @override */
lf.proc.TransactionTask.prototype.getResolver = function() {
  return this.resolver_;
};


/** @override */
lf.proc.TransactionTask.prototype.getId = function() {
  return goog.getUid(this);
};


/** @override */
lf.proc.TransactionTask.prototype.getPriority = function() {
  return lf.proc.TaskPriority.TRANSACTION_TASK;
};


/**
 * Acquires all locks required such that this task can execute queries.
 * @return {!IThenable}
 */
lf.proc.TransactionTask.prototype.acquireScope = function() {
  this.runner_.scheduleTask(this);
  return this.acquireScopeResolver_.promise;
};


/**
 * Executes the given query without flushing any changes to disk yet.
 * @param {!lf.query.Builder} queryBuilder
 * @return {!IThenable}
 */
lf.proc.TransactionTask.prototype.attachQuery = function(queryBuilder) {
  var taskItem = queryBuilder.getTaskItem();

  return taskItem.plan.getRoot().exec(this.journal_, taskItem.context).then(
      function(relations) {
        return relations[0].getPayloads();
      },
      function(e) {
        this.journal_.rollback();

        // Need to reject execResolver here such that all locks acquired by this
        // transaction task are eventually released.
        // NOTE: Using a CancellationError to prevent the Promise framework to
        // consider this.execResolver_.promise an unhandled rejected promise,
        // which ends up in an unwanted exception showing up in the console.
        var error = new goog.Promise.CancellationError(e.name);
        this.execResolver_.reject(error);
        throw e;
      }.bind(this));
};


/** @return {!IThenable} */
lf.proc.TransactionTask.prototype.commit = function() {
  this.tx_ = this.backStore_.createTx(
      this.getType(),
      lf.structs.set.values(this.scope_),
      this.journal_);
  this.tx_.commit().then(
      function() {
        this.scheduleObserverTask_();
        this.execResolver_.resolve();
      }.bind(this),
      function(e) {
        this.journal_.rollback();
        this.execResolver_.reject(e);
      }.bind(this));

  return this.resolver_.promise;
};


/** @return {!IThenable} */
lf.proc.TransactionTask.prototype.rollback = function() {
  this.journal_.rollback();
  this.execResolver_.resolve();
  return this.resolver_.promise;
};


/**
 * Schedules an ObserverTask for any observed queries that need to be
 * re-executed, if any.
 * @private
 */
lf.proc.TransactionTask.prototype.scheduleObserverTask_ = function() {
  var items = this.observerRegistry_.getTaskItemsForTables(this.scope_);
  if (items.length != 0) {
    var observerTask = new lf.proc.ObserverQueryTask(this.global_, items);
    this.runner_.scheduleTask(observerTask);
  }
};


/** @return {!lf.TransactionStats} */
lf.proc.TransactionTask.prototype.stats = function() {
  var results = null;
  if (goog.isDefAndNotNull(this.tx_)) {
    results = this.tx_.stats();
  }
  return goog.isNull(results) ? lf.TransactionStats.getDefault() : results;
};
