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
goog.provide('lf.proc.Transaction');

goog.require('goog.Promise');
goog.require('lf.Exception');
goog.require('lf.Transaction');
goog.require('lf.proc.UserQueryTask');
goog.require('lf.service');



/**
 * @implements {lf.Transaction}
 * @constructor @struct @final
 *
 * @param {!lf.Global} global
 */
lf.proc.Transaction = function(global) {
  /** @private {!lf.Global} */
  this.global_ = global;

  /** @private {!lf.proc.Runner} */
  this.runner_ = global.getService(lf.service.RUNNER);

  /** @private {boolean} */
  this.completed_ = false;
};


/** @override */
lf.proc.Transaction.prototype.exec = function(queryBuilders) {
  if (this.completed_) {
    throw new lf.Exception(
        lf.Exception.Type.TRANSACTION,
        'Transaction already commited/failed');
  }

  var queries = [];
  try {
    queryBuilders.forEach(function(queryBuilder) {
      queryBuilder.assertExecPreconditions();
      var query = queryBuilder.getQuery();
      queries.push(query);
    }, this);
  } catch (e) {
    this.completed_ = true;
    return goog.Promise.reject(e);
  }

  var queryTask = new lf.proc.UserQueryTask(this.global_, queries);
  return this.runner_.scheduleTask(queryTask).then(
      goog.bind(function(results) {
        this.completed_ = true;
        return results.map(function(relation) {
          return relation.getPayloads();
        });
      }, this),
      goog.bind(function(e) {
        this.completed_ = true;
        throw e;
      }, this));
};


/** @override */
lf.proc.Transaction.prototype.begin = function(scope) {
  // TODO(dpapad): Implement
  return goog.Promise.reject();
};


/** @override */
lf.proc.Transaction.prototype.attach = function(query) {
  // TODO(dpapad): Implement
  return goog.Promise.reject();
};


/** @override */
lf.proc.Transaction.prototype.commit = function() {
  // TODO(dpapad): Implement
  return goog.Promise.reject();
};


/** @override */
lf.proc.Transaction.prototype.rollback = function() {
  // TODO(dpapad): Implement
  return goog.Promise.reject();
};
