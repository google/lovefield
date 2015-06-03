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
goog.require('goog.structs.Map');
goog.require('goog.structs.Set');
goog.require('lf.Exception');
goog.require('lf.Transaction');
goog.require('lf.proc.TransactionTask');
goog.require('lf.proc.UserQueryTask');
goog.require('lf.service');



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

  /** @private {?lf.proc.TransactionTask} */
  this.transactionTask_ = null;

  /** @private {!lf.proc.TransactionState_} */
  this.state_ = lf.proc.TransactionState_.CREATED;
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
 * @private {!goog.structs.Map<
 *     !lf.proc.TransactionState_,
 *     !goog.structs.Set<!lf.proc.TransactionState_>>}
 */
lf.proc.StateTransitions_ = new goog.structs.Map(
    lf.proc.TransactionState_.CREATED,
    new goog.structs.Set([
      lf.proc.TransactionState_.ACQUIRING_SCOPE,
      lf.proc.TransactionState_.EXECUTING_AND_COMMITTING
    ]),

    lf.proc.TransactionState_.ACQUIRING_SCOPE,
    new goog.structs.Set([
      lf.proc.TransactionState_.ACQUIRED_SCOPE
    ]),

    lf.proc.TransactionState_.ACQUIRED_SCOPE,
    new goog.structs.Set([
      lf.proc.TransactionState_.EXECUTING_QUERY,
      lf.proc.TransactionState_.COMMITTING,
      lf.proc.TransactionState_.ROLLING_BACK
    ]),

    lf.proc.TransactionState_.EXECUTING_QUERY,
    new goog.structs.Set([
      lf.proc.TransactionState_.ACQUIRED_SCOPE,
      lf.proc.TransactionState_.FINALIZED
    ]),

    lf.proc.TransactionState_.EXECUTING_AND_COMMITTING,
    new goog.structs.Set([
      lf.proc.TransactionState_.FINALIZED
    ]),

    lf.proc.TransactionState_.COMMITTING,
    new goog.structs.Set([
      lf.proc.TransactionState_.FINALIZED
    ]),

    lf.proc.TransactionState_.ROLLING_BACK,
    new goog.structs.Set([
      lf.proc.TransactionState_.FINALIZED
    ]));


/**
 * Transitions this transaction from its current state to the given one.
 * @param {!lf.proc.TransactionState_} newState
 * @private
 */
lf.proc.Transaction.prototype.stateTransition_ = function(newState) {
  var nextStates = lf.proc.StateTransitions_.get(this.state_, null);
  if (goog.isNull(nextStates) || !nextStates.contains(newState)) {
    throw new lf.Exception(
        lf.Exception.Type.TRANSACTION,
        'Invalid transaction state transition, from ' + this.state_ +
        ' to ' + newState + '.');
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

  var queryTask = new lf.proc.UserQueryTask(this.global_, taskItems);
  return this.runner_.scheduleTask(queryTask).then(
      goog.bind(function(results) {
        this.stateTransition_(lf.proc.TransactionState_.FINALIZED);
        return results.map(function(relation) {
          return relation.getPayloads();
        });
      }, this),
      goog.bind(function(e) {
        this.stateTransition_(lf.proc.TransactionState_.FINALIZED);
        throw e;
      }, this));
};


/** @export @override */
lf.proc.Transaction.prototype.begin = function(scope) {
  this.stateTransition_(lf.proc.TransactionState_.ACQUIRING_SCOPE);

  this.transactionTask_ =
      new lf.proc.TransactionTask(this.global_, scope);
  return this.transactionTask_.acquireScope().then(goog.bind(
      function() {
        this.stateTransition_(lf.proc.TransactionState_.ACQUIRED_SCOPE);
      }, this));
};


/** @export @override */
lf.proc.Transaction.prototype.attach = function(query) {
  this.stateTransition_(lf.proc.TransactionState_.EXECUTING_QUERY);

  return this.transactionTask_.attachQuery(query).then(goog.bind(
      function(result) {
        this.stateTransition_(lf.proc.TransactionState_.ACQUIRED_SCOPE);
        return result;
      }, this), goog.bind(
      function(e) {
        this.stateTransition_(lf.proc.TransactionState_.FINALIZED);
        throw e;
      }, this));
};


/** @export @override */
lf.proc.Transaction.prototype.commit = function() {
  this.stateTransition_(lf.proc.TransactionState_.COMMITTING);
  return this.transactionTask_.commit().then(goog.bind(
      function() {
        this.stateTransition_(lf.proc.TransactionState_.FINALIZED);
      }, this));
};


/** @export @override */
lf.proc.Transaction.prototype.rollback = function() {
  this.stateTransition_(lf.proc.TransactionState_.ROLLING_BACK);
  return this.transactionTask_.rollback().then(goog.bind(
      function() {
        this.stateTransition_(lf.proc.TransactionState_.FINALIZED);
      }, this));
};
