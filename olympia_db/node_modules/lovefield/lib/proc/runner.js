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

goog.require('lf.TransactionType');
goog.require('lf.proc.LockManager');
goog.require('lf.proc.LockType');

goog.forwardDeclare('lf.proc.Task');



/**
 * Query/Transaction runner which actually runs the query in a transaction
 * (either implicit or explict) on the back store.
 * @constructor
 * @struct
 * @final
 */
lf.proc.Runner = function() {
  /** @private {!Array.<!lf.proc.Task>} */
  this.queue_ = [];

  /** @private {!lf.proc.LockManager} */
  this.lockManager_ = new lf.proc.LockManager();
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
  if (prioritize) {
    this.lockManager_.clearReservedLocks(task.getScope().getValues());
    this.queue_.unshift(task);
  } else {
    this.queue_.push(task);
  }
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

    var acquiredLock = false;
    if (task.getType() == lf.TransactionType.READ_ONLY) {
      acquiredLock = this.lockManager_.requestLock(
          task.getId(), task.getScope().getValues(), lf.proc.LockType.SHARED);
    } else {
      var acquiredReservedLock = this.lockManager_.requestLock(
          task.getId(), task.getScope().getValues(), lf.proc.LockType.RESERVED);
      // Escalating the RESERVED lock to an EXCLUSIVE lock.
      if (acquiredReservedLock) {
        acquiredLock = this.lockManager_.requestLock(
            task.getId(), task.getScope().getValues(),
            lf.proc.LockType.EXCLUSIVE);
      }
    }

    if (acquiredLock) {
      // Removing from this.queue_, not queue which is a copy used for
      // iteration.
      this.queue_.splice(i, /* howMany */ 1);
      this.execTask_(task);
    }
  }
};


/**
 * Executes a QueryTask. Callers of this method should have already acquired a
 * lock according to the task that is about to be executed.
 * @param {!lf.proc.Task} task
 * @private
 */
lf.proc.Runner.prototype.execTask_ = function(task) {
  task.exec().then(
      goog.bind(this.onTaskSuccess_, this, task),
      goog.bind(
          /** @type {function(*)} */ (this.onTaskError_), this, task));
};


/**
 * Executes when a task finishes successfully.
 * @param {!lf.proc.Task} task The task that finished.
 * @param {!Array.<!lf.proc.Relation>} results The result produced by the task.
 * @private
 */
lf.proc.Runner.prototype.onTaskSuccess_ = function(task, results) {
  this.lockManager_.releaseLock(task.getId(), task.getScope().getValues());
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
  this.lockManager_.releaseLock(task.getId(), task.getScope().getValues());
  task.getResolver().reject(error);
  this.consumePending_();
};
