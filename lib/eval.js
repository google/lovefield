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
goog.require('lf.Exception');
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


/**
 * @typedef {function(*, *):boolean}
 * @private
 */
lf.eval.ComparisonFunction_;


/**
 * @typedef {function((number|string|boolean|!Date|null)):(string|number|null)}
 * @private
 */
lf.eval.KeyOfIndexFunction_;



/**
 * @constructor
 * @struct
 */
lf.eval.Registry = function() {
  /**
   * A map holding functions used for converting a value of a given type to the
   * equivalent index key. NOTE: No functions exist in this map for
   * lf.Type.ARRAY_BUFFER and lf.Type.OBJECT, since columns of such types are
   * not indexable.
   * @private {!lf.structs.Map<!lf.Type, !lf.eval.KeyOfIndexFunction_>}
   */
  this.keyOfIndexConversionMap_ = lf.eval.buildKeyOfIndexConversionMap_();

  var numberOrIntegerEvalMap = lf.eval.buildNumberEvaluatorMap_();

  /**
   * A two-level map, associating a column type to the corresponding evaluation
   * functions map.
   * NOTE: No evaluation map exists for lf.Type.ARRAY_BUFFER since predicates
   * involving such a column do not make sense.
   *
   * @private {!lf.structs.Map<
   *     !lf.Type, !lf.structs.Map<!lf.eval.Type,
   *     !lf.eval.ComparisonFunction_>>}
   */
  this.evalMaps_ = lf.structs.map.create();
  this.evalMaps_.set(lf.Type.BOOLEAN, lf.eval.buildBooleanEvaluatorMap_());
  this.evalMaps_.set(lf.Type.DATE_TIME, lf.eval.buildDateEvaluatorMap_());
  this.evalMaps_.set(lf.Type.NUMBER, numberOrIntegerEvalMap);
  this.evalMaps_.set(lf.Type.INTEGER, numberOrIntegerEvalMap);
  this.evalMaps_.set(lf.Type.STRING, lf.eval.buildStringEvaluatorMap_());
  this.evalMaps_.set(lf.Type.OBJECT, lf.eval.buildObjectEvaluatorMap_());
};


/** @private {!lf.eval.Registry} */
lf.eval.Registry.instance_;


/** @return {!lf.eval.Registry} */
lf.eval.Registry.get = function() {
  if (!goog.isDefAndNotNull(lf.eval.Registry.instance_)) {
    lf.eval.Registry.instance_ = new lf.eval.Registry();
  }
  return lf.eval.Registry.instance_;
};


/**
 * @param {!lf.Type} columnType
 * @param {!lf.eval.Type} evaluatorType
 * @return {!lf.eval.ComparisonFunction_} The evaluator corresponding to the
 *     given type.
 * @throws {!lf.Exception}
 */
lf.eval.Registry.prototype.getEvaluator = function(columnType, evaluatorType) {
  /** @type {!lf.structs.Map<!lf.eval.Type, !lf.eval.ComparisonFunction_>} */
  var evaluationMap = this.evalMaps_.get(columnType) || null;
  if (goog.isNull(evaluationMap)) {
    // 550: where() clause includes an invalid predicate. Could not find
    // evaluation map for the given column type.
    throw new lf.Exception(550);
  }

  var evaluatorFn = evaluationMap.get(evaluatorType) || null;
  if (goog.isNull(evaluatorFn)) {
    // 550: where() clause includes an invalid predicate. Could not find
    // evaluation map for the given column type and evaluation type combination.
    throw new lf.Exception(550);
  }
  return evaluatorFn;
};


/**
 * @param {!lf.Type} columnType
 * @return {!lf.eval.KeyOfIndexFunction_} The keyOfIndex evaluator
 *     corresponding to the given type.
 */
lf.eval.Registry.prototype.getKeyOfIndexEvaluator = function(columnType) {
  var fn = this.keyOfIndexConversionMap_.get(columnType) || null;
  goog.asserts.assert(
      !goog.isNull(fn),
      'Could not find keyOfIndex evaluation function for ' + columnType);
  return fn;
};


/**
 * Builds a map associating lf.Type with corresponding keyOfIndex evaluator
 * functions.
 * @return {!lf.structs.Map<!lf.Type, !lf.eval.KeyOfIndexFunction_>}
 * @private
 */
lf.eval.buildKeyOfIndexConversionMap_ = function() {
  var map = lf.structs.map.create();
  map.set(lf.Type.BOOLEAN, function(value) {
    return goog.isNull(value) ? null : (value ? 1 : 0);
  });
  map.set(lf.Type.DATE_TIME, function(value) {
    return goog.isNull(value) ? null : value.getTime();
  });
  var identityFn = function(value) { return value; };
  map.set(lf.Type.INTEGER, identityFn);
  map.set(lf.Type.NUMBER, identityFn);
  map.set(lf.Type.STRING, identityFn);
  return map;
};


/**
 * Builds a map associating evaluator types with the evaluator functions, for
 * the case of a column of type 'boolean'.
 * NOTE: lf.eval.Type.BETWEEN, MATCH, GTE, GT, LTE, LT, are not available for
 * boolean objects.
 *
 * @return {!lf.structs.Map<!lf.eval.Type, !lf.eval.ComparisonFunction_>}
 * @private
 */
lf.eval.buildBooleanEvaluatorMap_ = function() {
  var map = lf.structs.map.create();
  map.set(lf.eval.Type.EQ, function(a, b) { return a == b; });
  map.set(lf.eval.Type.NEQ, function(a, b) { return a != b; });
  return map;
};


/**
 * Builds a common evaluator map.
 * @return {!lf.structs.Map<!lf.eval.Type, !lf.eval.ComparisonFunction_>}
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
 * @return {!lf.structs.Map<!lf.eval.Type, !lf.eval.ComparisonFunction_>}
 * @private
 */
lf.eval.buildNumberEvaluatorMap_ = function() {
  return lf.eval.buildCommonEvaluatorMap_();
};


/**
 * Builds a map associating evaluator types with the evaluator functions, for
 * the case of a column of type 'string'.
 * @return {!lf.structs.Map<!lf.eval.Type, !lf.eval.ComparisonFunction_>}
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
/**
 * Builds a map associating evaluator types with the evaluator functions, for
 * the case of a column of type 'Object'.
 * NOTE: Only lf.eval.Type.EQ and NEQ are available for objects.
 *
 * @return {!lf.structs.Map<!lf.eval.Type, !lf.eval.ComparisonFunction_>}
 * @private
 */
lf.eval.buildObjectEvaluatorMap_ = function() {
  var map = lf.structs.map.create();

  var checkNull = function(value) {
    if (!goog.isNull(value)) {
      // 550: where() clause includes an invalid predicate, can't compare
      // lf.Type.OBJECT to anything other than null.
      throw new lf.Exception(550);
    }
  };

  map.set(lf.eval.Type.EQ, function(a, b) {
    checkNull(b);
    return goog.isNull(a);
  });
  map.set(lf.eval.Type.NEQ, function(a, b) {
    checkNull(b);
    return !goog.isNull(a);
  });
  return map;
};


/**
 * Builds a map associating evaluator types with the evaluator functions, for
 * the case of a column of type 'Date'.
 * NOTE: lf.eval.Type.MATCH is not available for Date objects.
 *
 * @return {!lf.structs.Map<!lf.eval.Type, !lf.eval.ComparisonFunction_>}
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
