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

goog.require('goog.array');
goog.require('lf.TransactionType');
goog.require('lf.proc.LockManager');
goog.require('lf.proc.LockType');
goog.require('lf.proc.TaskPriority');

goog.forwardDeclare('lf.proc.Task');



/**
 * Query/Transaction runner which actually runs the query in a transaction
 * (either implicit or explict) on the back store.
 * @constructor
 * @struct
 * @final
 */
lf.proc.Runner = function() {
  /** @private {!lf.proc.Runner.TaskQueue_} */
  this.queue_ = new lf.proc.Runner.TaskQueue_();

  /** @private {!lf.proc.LockManager} */
  this.lockManager_ = new lf.proc.LockManager();
};


/**
 * Schedules a task for this runner.
 * @param {!lf.proc.Task} task The task to be scheduled.
 * @return {!IThenable<!Array<!lf.proc.Relation>>}
 */
lf.proc.Runner.prototype.scheduleTask = function(task) {
  if (task.getPriority() < lf.proc.TaskPriority.USER_QUERY_TASK ||
      task.getPriority() < lf.proc.TaskPriority.TRANSACTION_TASK) {
    // Any priority that is higher than USER_QUERY_TASK or TRANSACTION_TASK is
    // considered a "high" priority task and all held reserved locks should be
    // cleared to allow it to execute.
    this.lockManager_.clearReservedLocks(task.getScope().getValues());
  }

  this.queue_.insert(task);
  this.consumePending_();
  return task.getResolver().promise;
};


/**
 * Examines the queue and executes as many tasks as possible taking into account
 * the scope of each task and the currently occupied scopes.
 * @private
 */
lf.proc.Runner.prototype.consumePending_ = function() {
  var queue = this.queue_.getValues();

  for (var i = 0; i < queue.length; i++) {
    // Note: Iterating on a shallow copy of this.queue_, because this.queue_
    // will be modified during iteration and therefore iterating on this.queue_
    // would not guarantee that every task in the queue will be traversed.
    var task = queue[i];

    var acquiredLock = false;
    if (task.getType() == lf.TransactionType.READ_ONLY) {
      acquiredLock = this.requestTwoPhaseLock_(
          task,
          lf.proc.LockType.RESERVED_READ_ONLY,
          lf.proc.LockType.SHARED);
    } else {
      acquiredLock = this.requestTwoPhaseLock_(
          task,
          lf.proc.LockType.RESERVED_READ_WRITE,
          lf.proc.LockType.EXCLUSIVE);
    }

    if (acquiredLock) {
      // Removing task from the task queue and executing it.
      this.queue_.remove(task);
      this.execTask_(task);
    }
  }
};


/**
 * Performs a two-phase lock acquisition. The 1st lock is requested first. If
 * it is granted, the 2nd lock is requested.
 * @param {!lf.proc.Task} task The task that requests the locks.
 * @param {!lf.proc.LockType} lockType1
 * @param {!lf.proc.LockType} lockType2
 * @return {boolean} Whether two-phase locking was successfull. If false, either
 *     the 2nd lock was not granted or both 1st and 2nd were not granted.
 * @private
 */
lf.proc.Runner.prototype.requestTwoPhaseLock_ = function(
    task, lockType1, lockType2) {
  var acquiredLock = false;
  var scope = task.getScope().getValues();
  var acquiredFirstLock = this.lockManager_.requestLock(
      task.getId(), scope, lockType1);

  if (acquiredFirstLock) {
    // Escalating the first lock to the second lock.
    acquiredLock = this.lockManager_.requestLock(
        task.getId(), scope, lockType2);
  }

  return acquiredLock;
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
 * @param {!Array<!lf.proc.Relation>} results The result produced by the task.
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



/**
 * @constructor
 * @private
 */
lf.proc.Runner.TaskQueue_ = function() {
  /** @private {!Array<!lf.proc.Task>} */
  this.queue_ = [];
};


/**
 * Inserts a task in the queue.
 * @param {!lf.proc.Task} task
 */
lf.proc.Runner.TaskQueue_.prototype.insert = function(task) {
  goog.array.binaryInsert(
      this.queue_, task,
      function(t1, t2) {
        var priorityDiff = t1.getPriority() - t2.getPriority();
        return priorityDiff == 0 ? t1.getId() - t2.getId() : priorityDiff;
      });
};


/**
 * @return {!Array<!lf.proc.Task>} A shallow-copy of this queue.
 */
lf.proc.Runner.TaskQueue_.prototype.getValues = function() {
  return this.queue_.slice();
};


/**
 * Removes the given task from the queue.
 * @param {!lf.proc.Task} task The task to be removed.
 * @return {boolean} Whether the task was removed, false if the task was not
 *     found.
 */
lf.proc.Runner.TaskQueue_.prototype.remove = function(task) {
  return goog.array.remove(this.queue_, task);
};
