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
      lf.Type.DATE_TIME, lf.eval.Type.BETWEEN);

  var date1 = new Date();
  var date2 = new Date(date1.getTime() + 10);
  var date3 = new Date(date1.getTime() + 20);

  assertTrue(evaluationFn(date2, [date1, date3]));
  assertFalse(evaluationFn(date1, [date2, date3]));
  assertFalse(evaluationFn(date3, [date1, date2]));
}


function testEq() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.DATE_TIME, lf.eval.Type.EQ);

  var date1 = new Date();
  var date2 = new Date(date1.getTime());
  var date3 = new Date(date1.getTime() + 10);

  assertTrue(evaluationFn(date1, date2));
  assertFalse(evaluationFn(date1, date3));
}


function testGte() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.DATE_TIME, lf.eval.Type.GTE);

  var date1 = new Date();
  var date2 = new Date(date1.getTime() + 10);

  assertTrue(evaluationFn(date2, date1));
  assertTrue(evaluationFn(date2, date2));
  assertFalse(evaluationFn(date1, date2));
}


function testGt() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.DATE_TIME, lf.eval.Type.GT);

  var date1 = new Date();
  var date2 = new Date(date1.getTime() + 10);

  assertTrue(evaluationFn(date2, date1));
  assertFalse(evaluationFn(date2, date2));
  assertFalse(evaluationFn(date1, date2));
}


function testIn() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.DATE_TIME, lf.eval.Type.IN);

  var date1 = new Date();
  var date2 = new Date(date1.getTime() + 10);
  var date3 = new Date(date1.getTime() + 20);
  var date4 = new Date(date3.getTime());
  var date5 = new Date(date1.getTime() + 15);

  var values = [date1, date2, date3];

  assertTrue(evaluationFn(date1, values));
  assertTrue(evaluationFn(date2, values));
  assertTrue(evaluationFn(date3, values));
  assertTrue(evaluationFn(date4, values));
  assertFalse(evaluationFn(date5, values));
}


function testLte() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.DATE_TIME, lf.eval.Type.LTE);

  var date1 = new Date();
  var date2 = new Date(date1.getTime() + 10);

  assertTrue(evaluationFn(date1, date2));
  assertTrue(evaluationFn(date1, date1));
  assertFalse(evaluationFn(date2, date1));
}


function testLt() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.DATE_TIME, lf.eval.Type.LT);

  var date1 = new Date();
  var date2 = new Date(date1.getTime() + 10);

  assertTrue(evaluationFn(date1, date2));
  assertFalse(evaluationFn(date1, date1));
  assertFalse(evaluationFn(date2, date1));
}


function testNeq() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.DATE_TIME, lf.eval.Type.NEQ);

  var date1 = new Date();
  var date2 = new Date(date1.getTime() + 10);

  assertTrue(evaluationFn(date1, date2));
  assertTrue(evaluationFn(date2, date1));
  assertFalse(evaluationFn(date1, date1));
}
