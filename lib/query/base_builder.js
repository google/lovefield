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
goog.provide('lf.query.BaseBuilder');

goog.require('goog.Promise');
goog.require('lf.proc.UserQueryTask');
goog.require('lf.query.Builder');
goog.require('lf.query.toSql');
goog.require('lf.service');
goog.require('lf.tree');



/**
 * @template Context
 * @constructor
 * @implements {lf.query.Builder}
 * @struct
 *
 * @param {!lf.Global} global
 * @param {!lf.query.Context} context
 */
lf.query.BaseBuilder = function(global, context) {
  /** @private {!lf.Global} */
  this.global_ = global;

  /** @private {!lf.proc.QueryEngine} */
  this.queryEngine_ = global.getService(lf.service.QUERY_ENGINE);

  /** @private {!lf.proc.Runner} */
  this.runner_ = global.getService(lf.service.RUNNER);

  /** @protected {!lf.query.Context} */
  this.query = context;
};


/**
 * @override
 * @export
 */
lf.query.BaseBuilder.prototype.exec = function() {
  try {
    this.assertExecPreconditions();
  } catch (e) {
    return goog.Promise.reject(e);
  }

  return new goog.Promise(function(resolve, reject) {
    var queryTask = new lf.proc.UserQueryTask(
        this.global_, [this.query.clone()]);
    this.runner_.scheduleTask(queryTask).then(
        function(results) {
          resolve(results[0].getPayloads());
        }, reject);
  }, this);
};


/**
 * @override
 * @export
 */
lf.query.BaseBuilder.prototype.explain = function() {
  var context = this.query;
  var stringFn = function(node) {
    return node.toContextString(context) + '\n';
  };
  return lf.tree.toString(
      this.queryEngine_.getPlan(context).getRoot(), stringFn);
};


/**
 * @override
 * @export
 */
lf.query.BaseBuilder.prototype.bind = function(values) {
  this.query.bind(values);
  return this;
};


/**
 * @override
 * @export
 */
lf.query.BaseBuilder.prototype.toSql = function(opt_stripValueInfo) {
  return lf.query.toSql(this, opt_stripValueInfo);
};


/**
 * Asserts whether the preconditions for executing this query are met. Should be
 * overriden by subclasses.
 * @throws {!lf.Exception}
 */
lf.query.BaseBuilder.prototype.assertExecPreconditions = function() {
  // No-op default implementation.
};


/** @return {!Context} */
lf.query.BaseBuilder.prototype.getQuery = function() {
  return this.query.clone();
};


/** @return {!Context} */
lf.query.BaseBuilder.prototype.getObservableQuery = function() {
  return this.query;
};
