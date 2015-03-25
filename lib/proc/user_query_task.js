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
goog.provide('lf.proc.UserQueryTask');

goog.require('lf.TransactionType');
goog.require('lf.proc.ObserverQueryTask');
goog.require('lf.proc.QueryTask');
goog.require('lf.proc.TaskPriority');
goog.require('lf.query.SelectContext');
goog.require('lf.service');



/**
 * A UserQueryTask represents a collection of queries that need to be executed
 * within the same transaction, and were issued by the user.
 * @extends {lf.proc.QueryTask}
 * @constructor
 * @struct
 *
 * @param {!lf.Global} global
 * @param {!Array<lf.proc.QueryTask.QueryContext>} queries
 */
lf.proc.UserQueryTask = function(global, queries) {
  lf.proc.UserQueryTask.base(this, 'constructor', global, queries);

  /** @private {!lf.proc.Runner} */
  this.runner_ = global.getService(lf.service.RUNNER);

  /** @private {!lf.ObserverRegistry} */
  this.observerRegistry_ = global.getService(lf.service.OBSERVER_REGISTRY);
};
goog.inherits(lf.proc.UserQueryTask, lf.proc.QueryTask);


/** @override */
lf.proc.UserQueryTask.prototype.getPriority = function() {
  return lf.proc.TaskPriority.USER_QUERY_TASK;
};


/** @override */
lf.proc.UserQueryTask.prototype.onSuccess = function(results) {
  // Depending on the type of this QueryTask either notify observers directly,
  // or schedule on ObserverTask for queries that need to re-execute.
  this.getType() == lf.TransactionType.READ_ONLY ?
      this.notifyObserversDirectly_(results) :
      this.scheduleObserverTask_();
};


/**
 * Notifies observers of queries that were run as part of this task, if any.
 * @param {!Array<!lf.proc.Relation>} results The results of all queries run by
 *     this task.
 * @private
 */
lf.proc.UserQueryTask.prototype.notifyObserversDirectly_ = function(results) {
  this.queries.forEach(function(query, index) {
    if (query instanceof lf.query.SelectContext) {
      this.observerRegistry_.updateResultsForQuery(query, results[index]);
    }
  }, this);
};


/**
 * Schedules an ObserverTask for any observed queries that need to be
 * re-executed, if any.
 * @private
 */
lf.proc.UserQueryTask.prototype.scheduleObserverTask_ = function() {
  var queries = this.observerRegistry_.getQueriesForTables(
      this.getScope().getValues());
  if (queries.length != 0) {
    var observerTask = new lf.proc.ObserverQueryTask(this.global, queries);
    this.runner_.scheduleTask(observerTask);
  }
};
