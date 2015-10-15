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
goog.provide('lf.Predicate');
goog.provide('lf.PredicateProvider');

goog.forwardDeclare('lf.Binder');



/**
 * @interface
 */
lf.Predicate = function() {};


/**
 * @param {!lf.proc.Relation} relation The relation to be checked.
 * @return {!lf.proc.Relation} A relation that holds only the entries that
 *     satisfy the predicate.
 */
lf.Predicate.prototype.eval;


/**
 * Reverses this predicate.
 * @param {boolean} isComplement Whether the original predicate should be
 *     reversed. Reversing a predicate means that the predicate evaluates to
 *     true where before it was evaluating to false, and vice versa.
 */
lf.Predicate.prototype.setComplement;


/**
 * @return {!lf.Predicate} A clone of this predicate.
 */
lf.Predicate.prototype.copy;


/**
 * @param {!Array<!lf.schema.Column>=} opt_results An optional array holding
 *     previous results, given that this function is called recursively. If
 *     provided any columns will be added on that array. If not provided a new
 *     array will be allocated.
 * @return {!Array<!lf.schema.Column>} An array of all columns involved in this
 *     predicate.
 */
lf.Predicate.prototype.getColumns;


/**
 * @param {!lf.structs.Set<!lf.schema.Table>=} opt_results  An optional Set
 *     holding previous results, given that this function is called recursively.
 *     If provided any tables will be added on that Set. If not provided a new
 *     Set will be allocated.
 * @return {!lf.structs.Set<!lf.schema.Table>} The set of all tables involved in
 *     this predicate.
 */
lf.Predicate.prototype.getTables;


/** @param {number} id */
lf.Predicate.prototype.setId;


/** @return {number} */
lf.Predicate.prototype.getId;



/**
 * @template T
 * @interface
 */
lf.PredicateProvider = function() {};


/**
 * Returns equality test predicate.
 * @param {(!lf.schema.Column|!lf.Binder|T)} operand
 * @return {!lf.Predicate}
 * @throws {!lf.Exception}
 */
lf.PredicateProvider.prototype.eq;


/**
 * Returns inequality test predicate.
 * @param {(!lf.schema.Column|!lf.Binder|T)} operand
 * @return {!lf.Predicate}
 * @throws {!lf.Exception}
 */
lf.PredicateProvider.prototype.neq;


/**
 * Returns less than test predicate.
 * @param {(!lf.schema.Column|!lf.Binder|T)} operand
 * @return {!lf.Predicate}
 * @throws {!lf.Exception}
 */
lf.PredicateProvider.prototype.lt;


/**
 * Returns less than or equals to test predicate.
 * @param {(!lf.schema.Column|!lf.Binder|T)} operand
 * @return {!lf.Predicate}
 * @throws {!lf.Exception}
 */
lf.PredicateProvider.prototype.lte;


/**
 * Returns greater than test predicate.
 * @param {(!lf.schema.Column|!lf.Binder|T)} operand
 * @return {!lf.Predicate}
 * @throws {!lf.Exception}
 */
lf.PredicateProvider.prototype.gt;


/**
 * Returns greater than or equals to test predicate.
 * @param {(!lf.schema.Column|!lf.Binder|T)} operand
 * @return {!lf.Predicate}
 * @throws {!lf.Exception}
 */
lf.PredicateProvider.prototype.gte;


/**
 * Returns JavaScript regex matching test predicate.
 * @param {(!lf.Binder|!RegExp)} regex
 * @return {!lf.Predicate}
 * @throws {!lf.Exception}
 */
lf.PredicateProvider.prototype.match;


/**
 * Returns between test predicate.
 * @param {(!lf.Binder|T)} from
 * @param {(!lf.Binder|T)} to Must be greater or equals to from.
 * @return {!lf.Predicate}
 * @throws {!lf.Exception}
 */
lf.PredicateProvider.prototype.between;


/**
 * Returns array finding test predicate.
 * @param {(!lf.Binder|!Array<T>)} values
 * @return {!lf.Predicate}
 */
lf.PredicateProvider.prototype.in;


/**
 * Returns nullity test predicate.
 * @return {!lf.Predicate}
 */
lf.PredicateProvider.prototype.isNull;


/**
 * Returns non-nullity test predicate.
 * @return {!lf.Predicate}
 */
lf.PredicateProvider.prototype.isNotNull;
