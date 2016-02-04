/**
 * @license
 * Copyright 2016 The Lovefield Project Authors. All Rights Reserved.
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
goog.require('lf.testing.util');


/** @type {!lf.eval.Registry} */
var registry;


function setUpPage() {
  registry = new lf.eval.Registry();
}


function testEq() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.OBJECT, lf.eval.Type.EQ);

  var obj1 = null;
  var obj2 = {};
  assertTrue(evaluationFn(obj1, null));
  assertFalse(evaluationFn(obj2, null));

  // 550: where() clause includes an invalid predicate.
  lf.testing.util.assertThrowsError(550, function() {
    evaluationFn({}, {});
  });
}


function testNeq() {
  var evaluationFn = registry.getEvaluator(
      lf.Type.OBJECT, lf.eval.Type.NEQ);

  var obj1 = null;
  var obj2 = {};
  assertFalse(evaluationFn(obj1, null));
  assertTrue(evaluationFn(obj2, null));

  // 550: where() clause includes an invalid predicate.
  lf.testing.util.assertThrowsError(550, function() {
    evaluationFn({}, {});
  });
}
