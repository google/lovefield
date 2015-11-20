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
goog.provide('lf.proc.Transaction');

goog.require('goog.Promise');
goog.require('lf.Exception');
goog.require('lf.Transaction');
goog.require('lf.proc.TransactionTask');
goog.require('lf.proc.UserQueryTask');
goog.require('lf.service');
goog.require('lf.structs.map');
goog.require('lf.structs.set');



/**
 * @implements {lf.Transaction}
 * @constructor @struct @final
 * @export
 *
 * @param {!lf.Global} global
 */
lf.proc.Transaction = function(global) {
  /** @private {!lf.Global} */
  this.global_ = global;

  /** @private {!lf.proc.Runner} */
  this.runner_ = global.getService(lf.service.RUNNER);

  /** @private {?lf.proc.TransactionTask|?lf.proc.UserQueryTask} */
  this.task_ = null;

  /** @private {!lf.proc.TransactionState_} */
  this.state_ = lf.proc.TransactionState_.CREATED;

  if (lf.proc.StateTransitions_.size == 0) {
    this.initStateTransitions_();
  }
};


/**
 * The following states represent the lifecycle of a transaction. These states
 * are exclusive meaning that a tx can be only on one state at a given time.
 * @enum {number}
 * @private
 */
lf.proc.TransactionState_ = {
  CREATED: 0,
  ACQUIRING_SCOPE: 1,
  ACQUIRED_SCOPE: 2,
  EXECUTING_QUERY: 3,
  EXECUTING_AND_COMMITTING: 4,
  COMMITTING: 5,
  ROLLING_BACK: 6,
  FINALIZED: 7
};


/**
 * The transaction lifecycle is a finite state machine. The following map holds
 * all valid state transitions. Every state transition that does not exist in
 * this map is invalid and should result in a lf.Exception.TRANSACTION error.
 * @private {!lf.structs.Map<
 *     !lf.proc.TransactionState_,
 *     !lf.structs.Set<!lf.proc.TransactionState_>>}
 */
lf.proc.StateTransitions_ = lf.structs.map.create();


/** @private */
lf.proc.Transaction.prototype.initStateTransitions_ = function() {
  lf.proc.StateTransitions_.set(
      lf.proc.TransactionState_.CREATED,
      lf.structs.set.create([
        lf.proc.TransactionState_.ACQUIRING_SCOPE,
        lf.proc.TransactionState_.EXECUTING_AND_COMMITTING
      ]));

  lf.proc.StateTransitions_.set(
      lf.proc.TransactionState_.ACQUIRING_SCOPE,
      lf.structs.set.create([
        lf.proc.TransactionState_.ACQUIRED_SCOPE
      ]));

  lf.proc.StateTransitions_.set(
      lf.proc.TransactionState_.ACQUIRED_SCOPE,
      lf.structs.set.create([
        lf.proc.TransactionState_.EXECUTING_QUERY,
        lf.proc.TransactionState_.COMMITTING,
        lf.proc.TransactionState_.ROLLING_BACK
      ]));

  lf.proc.StateTransitions_.set(
      lf.proc.TransactionState_.EXECUTING_QUERY,
      lf.structs.set.create([
        lf.proc.TransactionState_.ACQUIRED_SCOPE,
        lf.proc.TransactionState_.FINALIZED
      ]));

  lf.proc.StateTransitions_.set(
      lf.proc.TransactionState_.EXECUTING_AND_COMMITTING,
      lf.structs.set.create([
        lf.proc.TransactionState_.FINALIZED
      ]));

  lf.proc.StateTransitions_.set(
      lf.proc.TransactionState_.COMMITTING,
      lf.structs.set.create([
        lf.proc.TransactionState_.FINALIZED
      ]));

  lf.proc.StateTransitions_.set(
      lf.proc.TransactionState_.ROLLING_BACK,
      lf.structs.set.create([
        lf.proc.TransactionState_.FINALIZED
      ]));
};


/**
 * Transitions this transaction from its current state to the given one.
 * @param {!lf.proc.TransactionState_} newState
 * @private
 */
lf.proc.Transaction.prototype.stateTransition_ = function(newState) {
  var nextStates = lf.proc.StateTransitions_.get(this.state_) || null;
  if (goog.isNull(nextStates) || !nextStates.has(newState)) {
    // 107: Invalid transaction state transition: {0} -> {1}.
    throw new lf.Exception(107, this.state_, newState);
  } else {
    this.state_ = newState;
  }
};


/** @export @override */
lf.proc.Transaction.prototype.exec = function(queryBuilders) {
  this.stateTransition_(
      lf.proc.TransactionState_.EXECUTING_AND_COMMITTING);

  var taskItems = [];
  try {
    queryBuilders.forEach(function(queryBuilder) {
      queryBuilder.assertExecPreconditions();
      taskItems.push(queryBuilder.getTaskItem());
    }, this);
  } catch (e) {
    this.stateTransition_(lf.proc.TransactionState_.FINALIZED);
    return goog.Promise.reject(e);
  }

  this.task_ = new lf.proc.UserQueryTask(this.global_, taskItems);
  return this.runner_.scheduleTask(this.task_).then(
      function(results) {
        this.stateTransition_(lf.proc.TransactionState_.FINALIZED);
        return results.map(function(relation) {
          return relation.getPayloads();
        });
      }.bind(this),
      function(e) {
        this.stateTransition_(lf.proc.TransactionState_.FINALIZED);
        throw e;
      }.bind(this));
};


/** @export @override */
lf.proc.Transaction.prototype.begin = function(scope) {
  this.stateTransition_(lf.proc.TransactionState_.ACQUIRING_SCOPE);

  this.task_ =
      new lf.proc.TransactionTask(this.global_, scope);
  return this.task_.acquireScope().then(
      function() {
        this.stateTransition_(lf.proc.TransactionState_.ACQUIRED_SCOPE);
      }.bind(this));
};


/** @export @override */
lf.proc.Transaction.prototype.attach = function(query) {
  this.stateTransition_(lf.proc.TransactionState_.EXECUTING_QUERY);

  return this.task_.attachQuery(query).then(
      function(result) {
        this.stateTransition_(lf.proc.TransactionState_.ACQUIRED_SCOPE);
        return result;
      }.bind(this),
      function(e) {
        this.stateTransition_(lf.proc.TransactionState_.FINALIZED);
        throw e;
      }.bind(this));
};


/** @export @override */
lf.proc.Transaction.prototype.commit = function() {
  this.stateTransition_(lf.proc.TransactionState_.COMMITTING);
  return this.task_.commit().then(
      function() {
        this.stateTransition_(lf.proc.TransactionState_.FINALIZED);
      }.bind(this));
};


/** @export @override */
lf.proc.Transaction.prototype.rollback = function() {
  this.stateTransition_(lf.proc.TransactionState_.ROLLING_BACK);
  return this.task_.rollback().then(
      function() {
        this.stateTransition_(lf.proc.TransactionState_.FINALIZED);
      }.bind(this));
};


/** @export @override */
lf.proc.Transaction.prototype.stats = function() {
  if (this.state_ != lf.proc.TransactionState_.FINALIZED) {
    // 105: Attempt to access in-flight transaction states.
    throw new lf.Exception(105);
  }
  return this.task_.stats();
};
