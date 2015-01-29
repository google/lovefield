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
goog.require('lf.index.Map');
goog.require('lf.testing.index.TestMultiRowNumericalKey');
goog.require('lf.testing.index.TestSingleRowNumericalKey');
goog.require('lf.testing.index.TestSingleRowStringKey');


/** @type {!lf.index.Map} */
var mapIndex;


function setUp() {
  mapIndex = new lf.index.Map('test');
}


function testSingleRow_NumericalKey() {
  var test = new lf.testing.index.TestSingleRowNumericalKey(function() {
    return new lf.index.Map('test');
  });
  test.run();
}


function testSingleRow_StringKey() {
  var test = new lf.testing.index.TestSingleRowStringKey(function() {
    return new lf.index.Map('test');
  });
  test.run();
}


function testMultiRow_NumericalKey() {
  var test = new lf.testing.index.TestMultiRowNumericalKey(function() {
    return new lf.index.Map('test');
  });
  test.run();
}
