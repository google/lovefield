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
goog.provide('lf.op');

goog.require('lf.pred.CombinedPredicate');
goog.require('lf.pred.Operator');


/**
 * @param {!lf.Predicate} lhs
 * @param {!lf.Predicate} rhs
 * @return {!lf.Predicate}
 */
lf.op.and = function(lhs, rhs) {
  var condition = new lf.pred.CombinedPredicate(lf.pred.Operator.AND);
  condition.addChild(/** @type {!lf.pred.PredicateNode} */ (lhs));
  condition.addChild(/** @type {!lf.pred.PredicateNode} */ (rhs));
  return condition;
};


/**
 * @param {!lf.Predicate} lhs
 * @param {!lf.Predicate} rhs
 * @return {!lf.Predicate}
 */
lf.op.or = function(lhs, rhs) {
  var condition = new lf.pred.CombinedPredicate(lf.pred.Operator.OR);
  condition.addChild(/** @type {!lf.pred.PredicateNode} */ (lhs));
  condition.addChild(/** @type {!lf.pred.PredicateNode} */ (rhs));
  return condition;
};


/**
 * @param {!lf.Predicate} operand
 * @return {!lf.Predicate}
 */
lf.op.not = function(operand) {
  operand.setComplement(true);
  return operand;
};
