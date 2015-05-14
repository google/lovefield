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
goog.provide('lf.op');

goog.require('lf.pred.CombinedPredicate');
goog.require('lf.pred.Operator');


/**
 * @export
 * @param {...!lf.Predicate} var_args
 * @return {!lf.Predicate}
 */
lf.op.and = function(var_args) {
  var args = Array.prototype.slice.call(arguments);
  return lf.op.createPredicate_(lf.pred.Operator.AND, args);
};


/**
 * @export
 * @param {...!lf.Predicate} var_args
 * @return {!lf.Predicate}
 */
lf.op.or = function(var_args) {
  var args = Array.prototype.slice.call(arguments);
  return lf.op.createPredicate_(lf.pred.Operator.OR, args);
};


/**
 * @param {!lf.pred.Operator} operator
 * @param {!Array<!lf.pred.PredicateNode>} predicates
 * @return {!lf.Predicate}
 * @private
 */
lf.op.createPredicate_ = function(operator, predicates) {
  var condition = new lf.pred.CombinedPredicate(operator);

  predicates.forEach(function(predicate) {
    condition.addChild(predicate);
  });
  return condition;
};


/**
 * @export
 * @param {!lf.Predicate} operand
 * @return {!lf.Predicate}
 */
lf.op.not = function(operand) {
  operand.setComplement(true);
  return operand;
};
