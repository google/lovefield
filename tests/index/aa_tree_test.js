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

/**
 * @fileoverview The AA tree algorithm verification is based on
 * @see http://mypages.valdosta.edu/dgibson/courses/cs3410/notes/ch19_6.pdf
 */
goog.setTestOnly();
goog.require('goog.string');
goog.require('goog.structs.Set');
goog.require('goog.testing.jsunit');
goog.require('lf.Order');
goog.require('lf.index.AATree');
goog.require('lf.index.MultiKeyComparator');
goog.require('lf.index.SimpleComparator');
goog.require('lf.testing.index.TestMultiKeyIndex');
goog.require('lf.testing.index.TestSingleRowNumericalKey');
goog.require('lf.testing.index.TestSingleRowStringKey');


/** @const {string} */
var EXPECTED_TREE =
    '[30-15/70][70-50/85]\n' +
    '[15-5/20][50-35/60][60-55/65][85-80/90]\n' +
    '[5-0/10][10-0/0][20-0/0][35-0/40][40-0/0]' +
    '[55-0/0][65-0/0][80-0/0][90-0/0]\n';


/** @const {string} */
var EXPECTED_CASE1 =
    '[30-15/70][70-50/85]\n' +
    '[15-5/20][50-35/60][60-55/65][85-80/90]\n' +
    '[5-0/10][10-0/0][20-0/25][25-0/0][35-0/40]' +
    '[40-0/0][55-0/0][65-0/0][80-0/0][90-0/0]\n';


/** @const {string} */
var EXPECTED_CASE2 =
    '[30-15/70][70-50/85]\n' +
    '[15-5/17][50-35/60][60-55/65][85-80/90]\n' +
    '[5-0/10][10-0/0][17-0/20][20-0/0][35-0/40]' +
    '[40-0/0][55-0/0][65-0/0][80-0/0][90-0/0]\n';


/** @const {string} */
var EXPECTED_CASE3 =
    '[30-15/70][70-50/85]\n' +
    '[15-5/20][50-35/60][60-55/65][85-80/95][95-90/99]\n' +
    '[5-0/10][10-0/0][20-0/0][35-0/40][40-0/0]' +
    '[55-0/0][65-0/0][80-0/0][90-0/0][99-0/0]\n';


/** @const {string} */
var EXPECTED_CASE4 =
    '[50-30/70]\n' +
    '[30-15/40][70-60/85]\n' +
    '[15-5/20][40-35/45][60-55/65][85-80/90]\n' +
    '[5-0/10][10-0/0][20-0/0][35-0/0][45-0/0]' +
    '[55-0/0][65-0/0][80-0/0][90-0/0]\n';


/** @type {!lf.index.AATree} */
var tree;


function setUp() {
  var c = new lf.index.SimpleComparator(lf.Order.ASC);
  tree = new lf.index.AATree('test', c);

  // Construct the base tree.
  tree.add(10, 110);
  tree.add(85, 185);
  tree.add(15, 115);
  tree.add(70, 170);
  tree.add(20, 120);
  tree.add(60, 160);
  tree.add(30, 130);
  tree.add(50, 150);
  tree.add(65, 165);
  tree.add(80, 180);
  tree.add(90, 190);
  tree.add(40, 140);
  tree.add(5, 15);
  tree.add(55, 155);
  tree.add(35, 135);

  assertEquals(EXPECTED_TREE, tree.toString());
}

function testAATree_Algorithm() {
  // Case 1: insert at the same level as horizontal (right) link.
  tree.set(25, 125);
  assertEquals(EXPECTED_CASE1, tree.toString());
  tree.remove(25, 125);
  assertEquals(EXPECTED_TREE, tree.toString());

  // Case 2: insersion results in horizontal left link, need skew.
  tree.set(17, 117);
  assertEquals(EXPECTED_CASE2, tree.toString());
  tree.remove(17, 117);
  assertEquals(EXPECTED_TREE, tree.toString());

  // Case 3: grandparent at the same level, need split.
  tree.set(95, 195);
  tree.set(99, 199);
  assertEquals(EXPECTED_CASE3, tree.toString());
  tree.remove(99, 199);
  tree.remove(95, 195);
  assertEquals(EXPECTED_TREE, tree.toString());

  // Case 4: multiple violations
  tree.set(45, 145);
  assertEquals(EXPECTED_CASE4, tree.toString());
}

function testAATree_Throws() {
  assertThrows(function() {
    tree.add(10, 10);
  });
}

function testSingleRow_NumericalKey_Asc() {
  var test = new lf.testing.index.TestSingleRowNumericalKey(function() {
    return new lf.index.AATree(
        'test',
        new lf.index.SimpleComparator(lf.Order.ASC));
  });
  test.run();
}

function testSingleRow_NumericalKey_Desc() {
  var test = new lf.testing.index.TestSingleRowNumericalKey(function() {
    return new lf.index.AATree(
        'test',
        new lf.index.SimpleComparator(lf.Order.DESC));
  }, true);
  test.run();
}

function testSingleRow_StringKey_Asc() {
  var test = new lf.testing.index.TestSingleRowStringKey(function() {
    return new lf.index.AATree(
        'test',
        new lf.index.SimpleComparator(lf.Order.ASC));
  });
  test.run();
}

function testSingleRow_StringKey_Desc() {
  var test = new lf.testing.index.TestSingleRowStringKey(function() {
    return new lf.index.AATree(
        'test',
        new lf.index.SimpleComparator(lf.Order.DESC));
  }, true);
  test.run();
}

function testMultiKeyIndex() {
  var test = new lf.testing.index.TestMultiKeyIndex(function() {
    return new lf.index.AATree(
        'test',
        new lf.index.MultiKeyComparator([lf.Order.ASC, lf.Order.DESC]));
  });
  test.run();
}

function manualTestBenchmark() {
  var log = goog.bind(console['log'], console);
  var ROW_COUNT = 1000000;

  var rows = new goog.structs.Set();
  while (rows.getCount() < ROW_COUNT) {
    rows.add(Math.random() * ROW_COUNT);
  }

  var values = rows.getValues();
  var c = new lf.index.SimpleComparator(lf.Order.ASC);
  tree = new lf.index.AATree('test', c);
  var start = goog.global.performance.now();
  for (var i = 0; i < ROW_COUNT; i++) {
    tree.add(values[i], i);
  }
  var end = goog.global.performance.now();
  log('aatree, int: ', end - start);

  rows.clear();
  while (rows.getCount() < ROW_COUNT) {
    rows.add(goog.string.getRandomString());
  }

  values = rows.getValues();
  tree = new lf.index.AATree('test', c);
  start = goog.global.performance.now();
  for (var i = 0; i < ROW_COUNT; i++) {
    tree.add(values[i], i);
  }
  end = goog.global.performance.now();
  log('aatree, string: ', end - start);
}
