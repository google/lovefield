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
goog.provide('lf.eval.Registry');
goog.provide('lf.eval.Type');

goog.require('goog.asserts');
goog.require('lf.Type');
goog.require('lf.structs.map');


/**
 * An enum holding all evaluator types.
 * @enum {string}
 */
lf.eval.Type = {
  BETWEEN: 'between',
  EQ: 'eq',
  GTE: 'gte',
  GT: 'gt',
  IN: 'in',
  LTE: 'lte',
  LT: 'lt',
  MATCH: 'match',
  NEQ: 'neq'
};


/** @typedef {function(*, *):boolean} */
lf.eval.EvalFunction_;



/**
 * @constructor
 * @struct
 */
lf.eval.Registry = function() {
  var numberOrIntegerEvalMap = lf.eval.buildNumberEvaluatorMap_();

  /**
   * A two-level map, associating a column type to the corresponding evaluation
   * functions map.
   * NOTE: No evaluation map exists for lf.Type.ARRAY_BUFFER since predicates
   * involving such a column do not make sense.
   *
   * @private {!lf.structs.Map<
   *     !lf.Type, !lf.structs.Map<!lf.eval.Type, !lf.eval.EvalFunction_>>}
   */
  this.evalMaps_ = lf.structs.map.create();
  this.evalMaps_.set(lf.Type.BOOLEAN, lf.eval.buildBooleanEvaluatorMap_());
  this.evalMaps_.set(lf.Type.DATE_TIME, lf.eval.buildDateEvaluatorMap_());
  this.evalMaps_.set(lf.Type.NUMBER, numberOrIntegerEvalMap);
  this.evalMaps_.set(lf.Type.INTEGER, numberOrIntegerEvalMap);
  this.evalMaps_.set(lf.Type.STRING, lf.eval.buildStringEvaluatorMap_());
};
goog.addSingletonGetter(lf.eval.Registry);


/**
 * @param {!lf.Type} columnType
 * @param {!lf.eval.Type} evaluatorType
 * @return {!lf.eval.EvalFunction_} The evaluator corresponding to the given
 *     type.
 */
lf.eval.Registry.prototype.getEvaluator = function(columnType, evaluatorType) {
  // TODO(dpapad): Throw lf.Exception instead of goog.asserting here.
  /** @type {!lf.structs.Map<!lf.eval.Type, !lf.eval.EvalFunction_>} */
  var evaluationMap = this.evalMaps_.get(columnType) || null;
  goog.asserts.assert(
      !goog.isNull(evaluationMap),
      'Could not find evaluation map for ' + columnType);
  var evaluatorFn = evaluationMap.get(evaluatorType) || null;
  goog.asserts.assert(
      !goog.isNull(evaluatorFn),
      'Could not find evaluator for ' + columnType + ', ' + evaluatorType);
  return evaluatorFn;
};


/**
 * Builds a map associating evaluator types with the evaluator functions, for
 * the case of a column of type 'boolean'.
 * NOTE: lf.eval.Type.BETWEEN, MATCH, GTE, GT, LTE, LT, are not available for
 * boolean objects.
 *
 * @return {!lf.structs.Map<!lf.eval.Type, !lf.eval.EvalFunction_>}
 * @private
 */
lf.eval.buildBooleanEvaluatorMap_ = function() {
  var map = lf.structs.map.create();
  map.set(lf.eval.Type.EQ, function(a, b) { return a == b; });
  map.set(lf.eval.Type.NEQ, function(a, b) { return a != b });
  return map;
};


/**
 * Builds a common evaluator map.
 * @return {!lf.structs.Map<!lf.eval.Type, !lf.eval.EvalFunction_>}
 * @private
 */
lf.eval.buildCommonEvaluatorMap_ = function() {
  var map = lf.eval.buildBooleanEvaluatorMap_();
  map.set(lf.eval.Type.BETWEEN, function(a, range) {
    return (goog.isNull(a) || goog.isNull(range[0]) || goog.isNull(range[1])) ?
        false :
        (a >= range[0] && a <= range[1]);
  });
  map.set(lf.eval.Type.GTE, function(a, b) {
    return (goog.isNull(a) || goog.isNull(b)) ? false : a >= b;
  });
  map.set(lf.eval.Type.GT, function(a, b) {
    return (goog.isNull(a) || goog.isNull(b)) ? false : a > b;
  });
  map.set(lf.eval.Type.IN, function(rowValue, values) {
    return values.indexOf(rowValue) != -1;
  });
  map.set(lf.eval.Type.LTE, function(a, b) {
    return (goog.isNull(a) || goog.isNull(b)) ? false : a <= b;
  });
  map.set(lf.eval.Type.LT, function(a, b) {
    return (goog.isNull(a) || goog.isNull(b)) ? false : a < b;
  });
  return map;
};


/**
 * Builds a map associating evaluator types with the evaluator functions, for
 * the case of a column of type 'number'.
 * NOTE: lf.eval.Type.MATCH is not available for numbers.
 *
 * @return {!lf.structs.Map<!lf.eval.Type, !lf.eval.EvalFunction_>}
 * @private
 */
lf.eval.buildNumberEvaluatorMap_ = function() {
  return lf.eval.buildCommonEvaluatorMap_();
};


/**
 * Builds a map associating evaluator types with the evaluator functions, for
 * the case of a column of type 'string'.
 * @return {!lf.structs.Map<!lf.eval.Type, !lf.eval.EvalFunction_>}
 * @private
 */
lf.eval.buildStringEvaluatorMap_ = function() {
  var map = lf.eval.buildCommonEvaluatorMap_();
  map.set(lf.eval.Type.MATCH, function(value, regex) {
    if (goog.isNull(value) || goog.isNull(regex)) {
      return false;
    }
    var re = new RegExp(regex);
    return re.test(value);
  });
  return map;
};


/**
 * Builds a map associating evaluator types with the evaluator functions, for
 * the case of a column of type 'Date'.
 * NOTE: lf.eval.Type.MATCH is not available for Date objects.
 *
 * @return {!lf.structs.Map<!lf.eval.Type, !lf.eval.EvalFunction_>}
 * @private
 */
lf.eval.buildDateEvaluatorMap_ = function() {
  var map = lf.structs.map.create();
  map.set(lf.eval.Type.BETWEEN, function(a, range) {
    return (goog.isNull(a) || goog.isNull(range[0]) || goog.isNull(range[1])) ?
        false :
        (a.getTime() >= range[0].getTime() &&
        a.getTime() <= range[1].getTime());
  });
  map.set(lf.eval.Type.EQ, function(a, b) {
    var aTime = goog.isNull(a) ? -1 : a.getTime();
    var bTime = goog.isNull(b) ? -1 : b.getTime();
    return aTime == bTime;
  });
  map.set(lf.eval.Type.GTE, function(a, b) {
    return (goog.isNull(a) || goog.isNull(b)) ?
        false :
        a.getTime() >= b.getTime();
  });
  map.set(lf.eval.Type.GT, function(a, b) {
    return (goog.isNull(a) || goog.isNull(b)) ?
        false :
        a.getTime() > b.getTime();
  });
  map.set(lf.eval.Type.IN, function(targetValue, values) {
    return values.some(function(value) {
      return value.getTime() == targetValue.getTime();
    });
  });
  map.set(lf.eval.Type.LTE, function(a, b) {
    return (goog.isNull(a) || goog.isNull(b)) ?
        false :
        a.getTime() <= b.getTime();
  });
  map.set(lf.eval.Type.LT, function(a, b) {
    return (goog.isNull(a) || goog.isNull(b)) ?
        false :
        a.getTime() < b.getTime();
  });
  map.set(lf.eval.Type.NEQ, function(a, b) {
    var aTime = goog.isNull(a) ? -1 : a.getTime();
    var bTime = goog.isNull(b) ? -1 : b.getTime();
    return aTime != bTime;
  });
  return map;
};
