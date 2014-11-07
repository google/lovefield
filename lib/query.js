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
goog.provide('lf.query.Context');
goog.provide('lf.query.Delete');
goog.provide('lf.query.Insert');
goog.provide('lf.query.Select');
goog.provide('lf.query.Update');

goog.forwardDeclare('lf.Order');
goog.forwardDeclare('lf.Type');



/** @interface */
lf.query.Context = function() {};


/**
 * Executes the query, all errors will be passed to the reject function as
 * DOMException.
 * @return {!IThenable}
 */
lf.query.Context.prototype.exec;


/** @return {?string} */
lf.query.Context.prototype.explain;



/**
 * @extends {lf.query.Context}
 * @interface
 */
lf.query.Select = function() {};


/**
 * @param {...lf.schema.Table} var_args
 * @return {!lf.query.Select}
 * @throws {DOMException}
 */
lf.query.Select.prototype.from;


/**
 * @param {!lf.Predicate} predicate
 * @return {!lf.query.Select}
 * @throws {DOMException}
 */
lf.query.Select.prototype.where;


/**
 * @param {!lf.schema.Table} table
 * @param {!lf.Predicate} predicate
 * @return {!lf.query.Select}
 * @throws {DOMException}
 */
lf.query.Select.prototype.innerJoin;


/**
 * @param {!lf.schema.Table} table
 * @return {!lf.query.Select}
 * @throws {DOMException}
 */
lf.query.Select.prototype.leftOuterJoin;


/**
 * @param {number} numberOfRows
 * @return {!lf.query.Select}
 */
lf.query.Select.prototype.limit;


/**
 * @param {number} numberOfRows
 * @return {!lf.query.Select}
 */
lf.query.Select.prototype.skip;


/**
 * @param {!lf.schema.Column} column
 * @param {lf.Order=} opt_order
 * @return {!lf.query.Select}
 * @throws {DOMException}
 */
lf.query.Select.prototype.orderBy;


/**
 * @param {!lf.schema.Column} column
 * @return {!lf.query.Select}
 * @throws {DOMException}
 */
lf.query.Select.prototype.groupBy;



/**
 * @extends {lf.query.Context}
 * @interface
 */
lf.query.Insert = function() {};


/**
 * @param {!lf.schema.Table} table
 * @return {!lf.query.Insert}
 */
lf.query.Insert.prototype.into;


/**
 * @param {!Array.<!lf.Row>} rows
 * @return {!lf.query.Insert}
 * @throws {DOMException}
 */
lf.query.Insert.prototype.values;



/**
 * @extends {lf.query.Context}
 * @interface
 */
lf.query.Update = function() {};


/**
 * @param {!lf.schema.Column} column
 * @param {*} value
 * @return {!lf.query.Update}
 * @throws {DOMException}
 */
lf.query.Update.prototype.set;


/**
 * @param {!lf.Predicate} predicate
 * @return {!lf.query.Update}
 * @throws {DOMException}
 */
lf.query.Update.prototype.where;



/**
 * @extends {lf.query.Context}
 * @interface
 */
lf.query.Delete = function() {};


/**
 * @param {!lf.schema.Table} table
 * @return {!lf.query.Delete}
 */
lf.query.Delete.prototype.from;


/**
 * @param {!lf.Predicate} predicate
 * @return {!lf.query.Delete}
 * @throws {DOMException}
 */
lf.query.Delete.prototype.where;
