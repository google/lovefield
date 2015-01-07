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
goog.provide('lf.query.SelectContext');
goog.provide('lf.query.SelectContext.OrderBy');



/**
 * Internal representation of an SELECT query.
 * @constructor
 */
lf.query.SelectContext = function() {
  /** @type {!Array.<!lf.schema.Column>} */
  this.columns;

  /** @type {!Array.<!lf.schema.Table>} */
  this.from;

  /** @type {!lf.Predicate} */
  this.where;

  /** @type {number} */
  this.limit;

  /** @type {number} */
  this.skip;

  /** @type {!Array.<!lf.query.SelectContext.OrderBy>} */
  this.orderBy;

  /** @type {!lf.schema.Column} */
  this.groupBy;

  /**
   * The current version of this query context. Should be bumped up every time
   * parametrized values are bound to new literal values.
   * @type {number}
   */
  this.currentVersion = 0;
};


/**
 * @typedef {{
 *     column: !lf.schema.Column,
 *     order: !lf.Order}}
 */
lf.query.SelectContext.OrderBy;


/**
 * @param {!Array.<!lf.query.SelectContext.OrderBy>} orderBy
 * @return {string} A text representation of OrderBy instances, useful for
 *     testing.
 */
lf.query.SelectContext.orderByToString = function(orderBy) {
  var out = '';
  orderBy.forEach(function(orderByEl, index) {
    out += orderByEl.column.getNormalizedName();
    if (index > orderBy.length - 1) {
      out += ', ';
    }
  });

  return out;
};
