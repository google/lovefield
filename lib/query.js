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
goog.provide('lf.query.Builder');
goog.provide('lf.query.Delete');
goog.provide('lf.query.Insert');
goog.provide('lf.query.Select');
goog.provide('lf.query.Update');

goog.forwardDeclare('lf.Binder');
goog.forwardDeclare('lf.Order');
goog.forwardDeclare('lf.Type');



/** @interface */
lf.query.Builder = function() {};


/**
 * Executes the query, all errors will be passed to the reject function.
 * The resolve function may receive parameters as results of execution, for
 * example, select queries will return results.
 * @return {!IThenable}
 */
lf.query.Builder.prototype.exec;


/**
 * Returns string representation of query execution plan. Similar to EXPLAIN
 * in most SQL engines.
 * @return {string}
 */
lf.query.Builder.prototype.explain;


/**
 * Bind values to parameterized queries. Callers are responsible to make sure
 * the types of values match those specified in the query.
 * @param {!Array<*>} values
 * @return {!lf.query.Builder}
 */
lf.query.Builder.prototype.bind;


/**
 * @param {boolean=} opt_stripValueInfo Strip value, default to false. This is
 *     used to remove all PII.
 * @return {string}
 */
lf.query.Builder.prototype.toSql;



/**
 * Query Builder which constructs a SELECT query. The builder is stateful.
 * All member functions, except orderBy(), can only be called once. Otherwise
 * an exception will be thrown.
 * @extends {lf.query.Builder}
 * @interface
 */
lf.query.Select = function() {};


/**
 * Specifies the source of the SELECT query.
 * @param {...!lf.schema.Table} var_args Tables used as source of this SELECT.
 * @return {!lf.query.Select}
 * @throws {!lf.Exception}
 */
lf.query.Select.prototype.from;


/**
 * Defines search condition of the SELECT query.
 * @param {!lf.Predicate} predicate
 * @return {!lf.query.Select}
 * @throws {!lf.Exception}
 */
lf.query.Select.prototype.where;


/**
 * Explicit inner join target table with specified search condition.
 * @param {!lf.schema.Table} table
 * @param {!lf.Predicate} predicate
 * @return {!lf.query.Select}
 * @throws {!lf.Exception}
 */
lf.query.Select.prototype.innerJoin;


/**
 * Explicit left outer join target table with specified search condition.
 * @param {!lf.schema.Table} table
 * @param {!lf.Predicate} predicate
 * @return {!lf.query.Select}
 * @throws {!lf.Exception}
 */
lf.query.Select.prototype.leftOuterJoin;


/**
 * Limits the number of rows returned in select results. If there are fewer rows
 * than limit, all rows will be returned.
 * @param {number|!lf.Binder} numberOfRows
 * @return {!lf.query.Select}
 * @throws {!lf.Exception}
 */
lf.query.Select.prototype.limit;


/**
 * Skips the number of rows returned in select results from the beginning. If
 * there are fewer rows than skip, no row will be returned.
 * @param {number|!lf.Binder} numberOfRows
 * @return {!lf.query.Select}
 * @throws {!lf.Exception}
 */
lf.query.Select.prototype.skip;


/**
 * Specify sorting order of returned results.
 * @param {!lf.schema.Column} column
 * @param {lf.Order=} opt_order
 * @return {!lf.query.Select}
 * @throws {!lf.Exception}
 */
lf.query.Select.prototype.orderBy;


/**
 * Specify grouping of returned results.
 * @param {...!lf.schema.Column} var_args
 * @return {!lf.query.Select}
 * @throws {!lf.Exception}
 */
lf.query.Select.prototype.groupBy;



/**
 * @extends {lf.query.Builder}
 * @interface
 */
lf.query.Insert = function() {};


/**
 * @param {!lf.schema.Table} table
 * @return {!lf.query.Insert}
 */
lf.query.Insert.prototype.into;


/**
 * @param {!Array<!lf.Row>|!lf.Binder|!Array<!lf.Binder>} rows
 * @return {!lf.query.Insert}
 * @throws {DOMException}
 */
lf.query.Insert.prototype.values;



/**
 * @extends {lf.query.Builder}
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
 * @extends {lf.query.Builder}
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
