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
goog.provide('lf.pred');

goog.require('lf.pred.JoinPredicate');
goog.require('lf.pred.ValuePredicate');


/**
 * @template T
 * @param {!lf.schema.Column} leftOperand
 * @param {!lf.schema.Column | T} rightOperand
 * @param {!lf.eval.Type} evaluatorType
 *
 * @return {!lf.Predicate}
 */
lf.pred.createPredicate = function(
    leftOperand, rightOperand, evaluatorType) {
  // For the case of .eq(null).
  if (goog.isNull(rightOperand)) {
    return new lf.pred.ValuePredicate(leftOperand, rightOperand, evaluatorType);
  }

  // Using the existence of "getNormalizedName" as a signal on whether the
  // rightOperand is a literal value or another lf.schema.Column.
  if (goog.isDef(rightOperand.getNormalizedName)) {
    return new lf.pred.JoinPredicate(leftOperand, rightOperand, evaluatorType);
  }

  // Value predicate, which can be bounded or not.
  return new lf.pred.ValuePredicate(leftOperand, rightOperand, evaluatorType);
};
