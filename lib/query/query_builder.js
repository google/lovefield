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
goog.provide('lf.query.Query');
goog.provide('lf.query.QueryBuilder');

goog.require('goog.Promise');
goog.require('lf.Global');
goog.require('lf.pred.ValuePredicate');
goog.require('lf.query.Context');
goog.require('lf.service');
goog.require('lf.tree');


/**
 * @typedef {
 *     !lf.query.DeleteContext|
 *     !lf.query.InsertContext|
 *     !lf.query.SelectContext|
 *     !lf.query.UpdateContext}
 */
lf.query.Query;



/**
 * @constructor
 * @implements {lf.query.Context}
 * @struct
 */
lf.query.QueryBuilder = function() {
  /** @private {!lf.proc.QueryEngine} */
  this.queryEngine_ = lf.Global.get().getService(lf.service.QUERY_ENGINE);

  /** @type {!lf.query.Query} */
  this.query;

  /** @protected {!Array.<*>} */
  this.boundValues;

  /** @private {!lf.proc.Runner} */
  this.runner_ = lf.Global.get().getService(lf.service.RUNNER);
};


/** @override */
lf.query.QueryBuilder.prototype.exec = function() {
  try {
    this.assertExecPreconditions();
  } catch (e) {
    return goog.Promise.reject(e);
  }

  return new goog.Promise(function(resolve, reject) {
    this.bindValues();
    this.runner_.exec([this.queryEngine_.getPlan(this.query)]).then(
        function(results) {
          resolve(results[0].getPayloads());
        }, reject);
  }, this);
};


/** @override */
lf.query.QueryBuilder.prototype.explain = function() {
  return lf.tree.toString(this.queryEngine_.getPlan(this.query).getRoot());
};


/** @override */
lf.query.QueryBuilder.prototype.bind = function(values) {
  this.boundValues = values;
  return this;
};


/**
 * Asserts whether the preconditions for executing this query are met. Should be
 * overriden by subclasses.
 * @throws {!lf.Exception}
 */
lf.query.QueryBuilder.prototype.assertExecPreconditions = function() {
  // No-op default implementation.
};


/**
 * @return {!lf.query.Query}
 */
lf.query.QueryBuilder.prototype.getQuery = function() {
  return this.query;
};


/** @protected */
lf.query.QueryBuilder.prototype.bindValues = function() {
};


/** @protected */
lf.query.QueryBuilder.prototype.bindValuesInSearchCondition = function() {
  var searchCondition =
      /** @type {?lf.pred.PredicateNode} */ (this.query.where);
  if (goog.isDefAndNotNull(searchCondition)) {
    searchCondition.traverse(function(node) {
      if (node instanceof lf.pred.ValuePredicate) {
        node.bind(this.boundValues);
      }
    }, this);
  }
};
