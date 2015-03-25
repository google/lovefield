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
goog.provide('lf.proc.ObserverQueryTask');

goog.require('lf.proc.QueryTask');
goog.require('lf.proc.TaskPriority');
goog.require('lf.service');



/**
 * An ObserverTask represents a collection of SELECT queries that should be
 * executed because their results might have changed and therefore observers
 * should be notified.
 * @extends {lf.proc.QueryTask}
 * @constructor
 * @struct
 *
 * @param {!lf.Global} global
 * @param {!Array<!lf.query.SelectContext>} queries
 */
lf.proc.ObserverQueryTask = function(global, queries) {
  lf.proc.ObserverQueryTask.base(this, 'constructor', global, queries);

  /** @private {!lf.ObserverRegistry} */
  this.observerRegistry_ = global.getService(lf.service.OBSERVER_REGISTRY);
};
goog.inherits(lf.proc.ObserverQueryTask, lf.proc.QueryTask);


/** @override */
lf.proc.ObserverQueryTask.prototype.getPriority = function() {
  return lf.proc.TaskPriority.OBSERVER_QUERY_TASK;
};


/** @override */
lf.proc.ObserverQueryTask.prototype.onSuccess = function(results) {
  var queries = /** @type {!Array<!lf.query.SelectContext>} */ (
      this.queries);

  queries.forEach(
      function(query, index) {
        this.observerRegistry_.updateResultsForQuery(query, results[index]);
      }, this);
};
