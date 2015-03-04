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
goog.setTestOnly();
goog.require('goog.testing.jsunit');
goog.require('lf.Type');
goog.require('lf.eval.Registry');
goog.require('lf.eval.Type');


/** @type {!lf.eval.Registry} */
var registry;


function setUpPage() {
  registry = new lf.eval.Registry();
}


function testBetween() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.NUMBER, lf.eval.Type.BETWEEN);

  var number1 = 1;
  var number2 = 50;
  var number3 = 100;

  assertTrue(evaluationFn(number1, [number1, number3]));
  assertTrue(evaluationFn(number2, [number1, number3]));
  assertTrue(evaluationFn(number3, [number1, number3]));
  assertFalse(evaluationFn(number1, [number2, number3]));
  assertFalse(evaluationFn(number3, [number1, number2]));
}


function testEq() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.NUMBER, lf.eval.Type.EQ);

  var number1 = 100;
  var number2 = 100;
  var number3 = 200;

  assertTrue(evaluationFn(number1, number2));
  assertFalse(evaluationFn(number1, number3));
}


function testGte() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.NUMBER, lf.eval.Type.GTE);

  var number1 = 100;
  var number2 = 200;

  assertTrue(evaluationFn(number2, number1));
  assertTrue(evaluationFn(number2, number2));
  assertFalse(evaluationFn(number1, number2));
}


function testGt() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.NUMBER, lf.eval.Type.GT);

  var number1 = 100;
  var number2 = 200;

  assertTrue(evaluationFn(number2, number1));
  assertFalse(evaluationFn(number2, number2));
  assertFalse(evaluationFn(number1, number2));
}


function testIn() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.NUMBER, lf.eval.Type.IN);

  var number1 = 1;
  var number2 = 10;
  var number3 = 20;
  var number4 = 15;

  var values = [number1, number2, number3];

  assertTrue(evaluationFn(number1, values));
  assertTrue(evaluationFn(number2, values));
  assertTrue(evaluationFn(number3, values));
  assertFalse(evaluationFn(number4, values));
}


function testLte() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.NUMBER, lf.eval.Type.LTE);

  var number1 = 100;
  var number2 = 200;

  assertTrue(evaluationFn(number1, number2));
  assertTrue(evaluationFn(number1, number1));
  assertFalse(evaluationFn(number2, number1));
}


function testLt() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.NUMBER, lf.eval.Type.LT);

  var number1 = 100;
  var number2 = 200;

  assertTrue(evaluationFn(number1, number2));
  assertFalse(evaluationFn(number1, number1));
  assertFalse(evaluationFn(number2, number1));
}


function testNeq() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.NUMBER, lf.eval.Type.NEQ);

  var number1 = 100;
  var number2 = 200;

  assertTrue(evaluationFn(number1, number2));
  assertTrue(evaluationFn(number2, number1));
  assertFalse(evaluationFn(number1, number1));
}
