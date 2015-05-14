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


function testEq() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.BOOLEAN, lf.eval.Type.EQ);

  var boolean1 = true;
  var boolean2 = true;
  var boolean3 = false;

  assertTrue(evaluationFn(boolean1, boolean2));
  assertFalse(evaluationFn(boolean1, boolean3));
}


function testNeq() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.BOOLEAN, lf.eval.Type.NEQ);

  var boolean1 = true;
  var boolean2 = false;

  assertTrue(evaluationFn(boolean1, boolean2));
  assertTrue(evaluationFn(boolean2, boolean1));
  assertFalse(evaluationFn(boolean1, boolean1));
}
