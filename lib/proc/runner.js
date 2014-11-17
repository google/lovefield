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

goog.require('goog.structs.Set');
goog.require('lf.TransactionType');

goog.forwardDeclare('lf.proc.Task');



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

  /** @private {!Array.<!lf.proc.Task>} */
  this.queue_ = [];
};


/**
 * Schedules a task for this runner.
 * @param {!lf.proc.Task} task The task to be scheduled.
 * @param {boolean=} opt_prioritize Whether the task should be added at the
 *     front of the queue, defaults to false.
 * @return {!IThenable.<!Array.<!lf.proc.Relation>>}
 */
lf.proc.Runner.prototype.scheduleTask = function(task, opt_prioritize) {
  var prioritize = opt_prioritize || false;
  prioritize ? this.queue_.unshift(task) : this.queue_.push(task);
  this.consumePending_();
  return task.getResolver().promise;
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
    if (this.usedScopes_.intersection(task.getScope()).isEmpty()) {
      // Removing from this.queue_, not queue which is a copy used for
      // iteration.
      this.queue_.splice(i, /* howMany */ 1);
      this.execTask_(task);
    }
  }
};


/**
 * Executes a QueryTask. Callers of this method should have already checked
 * that no other running task is using any table within the combined scope of
 * this task.
 * @param {!lf.proc.Task} task
 * @private
 */
lf.proc.Runner.prototype.execTask_ = function(task) {
  this.acquireScope_(task);

  task.exec().then(
      goog.bind(this.onTaskSuccess_, this, task),
      goog.bind(
          /** @type {function(*)} */ (this.onTaskError_), this, task));
};


/**
 * Acquires the necessary scope for the given task.
 * @param {!lf.proc.Task} task
 * @private
 */
lf.proc.Runner.prototype.acquireScope_ = function(task) {
  if (task.getType() == lf.TransactionType.READ_WRITE) {
    this.usedScopes_.addAll(task.getScope());
  }
};


/**
 * Releases the scope that was held by the given task.
 * @param {!lf.proc.Task} task
 * @private
 */
lf.proc.Runner.prototype.releaseScope_ = function(task) {
  if (task.getType() == lf.TransactionType.READ_WRITE) {
    this.usedScopes_.removeAll(task.getScope());
  }
};


/**
 * Executes when a task finishes successfully.
 * @param {!lf.proc.Task} task The task that finished.
 * @param {!Array.<!lf.proc.Relation>} results The result produced by the task.
 * @private
 */
lf.proc.Runner.prototype.onTaskSuccess_ = function(task, results) {
  this.releaseScope_(task);
  task.getResolver().resolve(results);
  this.consumePending_();
};


/**
 * Executes when a task finishes with an error.
 * @param {!lf.proc.Task} task The task that finished.
 * @param {!Error} error The error that caused the failure.
 * @private
 */
lf.proc.Runner.prototype.onTaskError_ = function(task, error) {
  this.releaseScope_(task);
  task.getResolver().reject(error);
  this.consumePending_();
};
