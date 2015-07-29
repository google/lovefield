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
      lf.Type.STRING, lf.eval.Type.BETWEEN);

  var string1 = 'a';
  var string2 = 'ab';
  var string3 = 'abc';

  assertTrue(evaluationFn(string1, [string1, string3]));
  assertTrue(evaluationFn(string2, [string1, string3]));
  assertTrue(evaluationFn(string3, [string1, string3]));
  assertFalse(evaluationFn(string1, [string2, string3]));
  assertFalse(evaluationFn(string3, [string1, string2]));
}


function testBetween_Null() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.STRING, lf.eval.Type.BETWEEN);

  var string1 = 'a';
  var string2 = 'ab';
  var string3 = 'abc';
  var string4 = null;

  assertTrue(evaluationFn(string1, [string1, string3]));
  assertTrue(evaluationFn(string2, [string1, string3]));
  // null test.
  assertFalse(evaluationFn(string1, [string4, string3]));
  assertFalse(evaluationFn(string4, [string1, string3]));
  assertFalse(evaluationFn(string1, [string1, string4]));
  assertFalse(evaluationFn(string1, [string4, string1]));
  assertFalse(evaluationFn(string4, [string4, string4]));
  assertFalse(evaluationFn(string1, [string4, string4]));
}


function testEq() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.STRING, lf.eval.Type.EQ);

  var string1 = 'a';
  var string2 = 'a';
  var string3 = 'abc';

  assertTrue(evaluationFn(string1, string2));
  assertFalse(evaluationFn(string1, string3));
}


function testGte() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.STRING, lf.eval.Type.GTE);

  var string1 = 'a';
  var string2 = 'ab';

  assertTrue(evaluationFn(string2, string1));
  assertTrue(evaluationFn(string2, string2));
  assertFalse(evaluationFn(string1, string2));
}


function testGte_Null() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.STRING, lf.eval.Type.GTE);

  var string1 = 'a';
  var string2 = 'ab';
  var string3 = null;

  assertTrue(evaluationFn(string2, string1));
  assertTrue(evaluationFn(string2, string2));
  assertFalse(evaluationFn(string1, string2));
  // null test.
  assertFalse(evaluationFn(string3, string1));
  assertFalse(evaluationFn(string3, string2));
  assertFalse(evaluationFn(string1, string3));
  assertFalse(evaluationFn(string2, string3));
  assertFalse(evaluationFn(string3, string3));
}


function testGt() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.STRING, lf.eval.Type.GT);

  var string1 = 'a';
  var string2 = 'ab';

  assertTrue(evaluationFn(string2, string1));
  assertFalse(evaluationFn(string2, string2));
  assertFalse(evaluationFn(string1, string2));
}


function testGt_Null() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.STRING, lf.eval.Type.GT);

  var string1 = 'a';
  var string2 = 'ab';
  var string3 = null;

  assertTrue(evaluationFn(string2, string1));
  assertFalse(evaluationFn(string2, string2));
  assertFalse(evaluationFn(string1, string2));
  // null test.
  assertFalse(evaluationFn(string3, string1));
  assertFalse(evaluationFn(string3, string2));
  assertFalse(evaluationFn(string1, string3));
  assertFalse(evaluationFn(string2, string3));
  assertFalse(evaluationFn(string3, string3));
}


function testIn() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.STRING, lf.eval.Type.IN);

  var string1 = 'a';
  var string2 = 'ab';
  var string3 = 'abc';
  var string4 = 'abc';
  var string5 = 'abcd';

  var values = [string1, string2, string3];

  assertTrue(evaluationFn(string1, values));
  assertTrue(evaluationFn(string2, values));
  assertTrue(evaluationFn(string3, values));
  assertTrue(evaluationFn(string4, values));
  assertFalse(evaluationFn(string5, values));
}


function testLte() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.STRING, lf.eval.Type.LTE);

  var string1 = 'a';
  var string2 = 'ab';

  assertTrue(evaluationFn(string1, string2));
  assertTrue(evaluationFn(string1, string1));
  assertFalse(evaluationFn(string2, string1));
}


function testLte_Null() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.STRING, lf.eval.Type.LTE);

  var string1 = 'a';
  var string2 = 'ab';
  var string3 = null;

  assertTrue(evaluationFn(string1, string2));
  assertTrue(evaluationFn(string1, string1));
  assertFalse(evaluationFn(string2, string1));
  // null test.
  assertFalse(evaluationFn(string3, string1));
  assertFalse(evaluationFn(string3, string2));
  assertFalse(evaluationFn(string1, string3));
  assertFalse(evaluationFn(string2, string3));
  assertFalse(evaluationFn(string3, string3));
}


function testLt() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.STRING, lf.eval.Type.LT);

  var string1 = 'a';
  var string2 = 'ab';

  assertTrue(evaluationFn(string1, string2));
  assertFalse(evaluationFn(string1, string1));
  assertFalse(evaluationFn(string2, string1));
}


function testLt_Null() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.STRING, lf.eval.Type.LT);

  var string1 = 'a';
  var string2 = 'ab';
  var string3 = null;

  assertTrue(evaluationFn(string1, string2));
  assertFalse(evaluationFn(string1, string1));
  assertFalse(evaluationFn(string2, string1));
  // null test.
  assertFalse(evaluationFn(string3, string1));
  assertFalse(evaluationFn(string3, string2));
  assertFalse(evaluationFn(string1, string3));
  assertFalse(evaluationFn(string2, string3));
  assertFalse(evaluationFn(string3, string3));
}


function testNeq() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.STRING, lf.eval.Type.NEQ);

  var string1 = 'a';
  var string2 = 'ab';

  assertTrue(evaluationFn(string1, string2));
  assertTrue(evaluationFn(string2, string1));
  assertFalse(evaluationFn(string1, string1));
}


function testMatch() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.STRING, lf.eval.Type.MATCH);

  var string = 'sampleName';
  var pattern1 = /sampleName/;
  var pattern2 = /\bsample[A-Za-z]+\b/;
  var pattern3 = /SAMPLENAME/;

  assertTrue(evaluationFn(string, pattern1));
  assertTrue(evaluationFn(string, pattern2));
  assertFalse(evaluationFn(string, pattern3));
}


function testMatch_Null() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.STRING, lf.eval.Type.MATCH);

  var string = 'sampleName';
  var string2 = null;

  var pattern1 = /sampleName/;
  var pattern2 = /\bsample[A-Za-z]+\b/;
  var pattern3 = /SAMPLENAME/;
  var pattern4 = null;

  assertTrue(evaluationFn(string, pattern1));
  assertTrue(evaluationFn(string, pattern2));
  assertFalse(evaluationFn(string, pattern3));
  // null check.
  assertFalse(evaluationFn(string, pattern4));
  assertFalse(evaluationFn(string2, pattern1));
  assertFalse(evaluationFn(string2, pattern4));
}
