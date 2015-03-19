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
goog.provide('lf.query.UpdateContext');
goog.provide('lf.query.UpdateContext.Set');



/**
 * Internal representation of an UPDATE query.
 * @constructor
 */
lf.query.UpdateContext = function() {
  /** @type {!lf.schema.Table} */
  this.table;

  /** @type {!Array<!lf.query.UpdateContext.Set>} */
  this.set;

  /** @type {!lf.Predicate} */
  this.where;
};


/**
 * @typedef {{
 *     binding: number,
 *     column: !lf.schema.Column,
 *     value: *}}
 */
lf.query.UpdateContext.Set;
