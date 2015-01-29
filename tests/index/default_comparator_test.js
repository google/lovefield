/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
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
goog.require('lf.Order');
goog.require('lf.index');
goog.require('lf.index.MultiKeyComparator');
goog.require('lf.index.SimpleComparator');


var favor = lf.index.FAVOR;

function testSimpleComparator_ASC() {
  var comparator = new lf.index.SimpleComparator(lf.Order.ASC);
  var c = goog.bind(comparator.compare, comparator);

  assertEquals(favor.TIE, c(0, 0));
  assertEquals(favor.TIE, c('', ''));
  assertEquals(favor.TIE, c(888.88, 888.88));
  assertEquals(favor.TIE, c('ab', 'ab'));

  assertEquals(favor.LHS, c(1, 0));
  assertEquals(favor.RHS, c(0, 1));
  assertEquals(favor.LHS, c(888.88, 888.87));
  assertEquals(favor.RHS, c(888.87, 888.88));

  assertEquals(favor.LHS, c('b', 'a'));
  assertEquals(favor.RHS, c('a', 'b'));
  assertEquals(favor.LHS, c('bbb', 'bba'));
  assertEquals(favor.RHS, c('bba', 'bbb'));
}

function testSimpleComparator_DESC() {
  var comparator = new lf.index.SimpleComparator(lf.Order.DESC);
  var c = goog.bind(comparator.compare, comparator);

  assertEquals(favor.TIE, c(0, 0));
  assertEquals(favor.TIE, c('', ''));
  assertEquals(favor.TIE, c(888.88, 888.88));
  assertEquals(favor.TIE, c('ab', 'ab'));

  assertEquals(favor.RHS, c(1, 0));
  assertEquals(favor.LHS, c(0, 1));
  assertEquals(favor.RHS, c(888.88, 888.87));
  assertEquals(favor.LHS, c(888.87, 888.88));

  assertEquals(favor.RHS, c('b', 'a'));
  assertEquals(favor.LHS, c('a', 'b'));
  assertEquals(favor.RHS, c('bbb', 'bba'));
  assertEquals(favor.LHS, c('bba', 'bbb'));
}

function testMultiKeyComparator_DefaultOrder() {
  var orders = lf.index.MultiKeyComparator.createOrders(2, lf.Order.ASC);
  var comparator = new lf.index.MultiKeyComparator(orders);
  var c = goog.bind(comparator.compare, comparator);

  assertEquals(favor.TIE, c([0, 0], [0, 0]));
  assertEquals(favor.TIE, c(['', ''], ['', '']));
  assertEquals(favor.TIE, c([99.99, 99.99], [99.99, 99.99]));
  assertEquals(favor.TIE, c(['ab', 'ab'], ['ab', 'ab']));
  assertEquals(favor.TIE, c([77, 'ab'], [77, 'ab']));

  assertEquals(favor.LHS, c([7, 6], [5, 4]));
  assertEquals(favor.LHS, c([7, 6], [7, 4]));
  assertEquals(favor.RHS, c([5, 4], [7, 6]));
  assertEquals(favor.RHS, c([5, 4], [5, 8]));

  assertEquals(favor.LHS, c([9, 'abc'], [8, 'zzz']));
  assertEquals(favor.LHS, c(['zzz', 8], ['abc', 12]));
  assertEquals(favor.LHS, c(['zzz', 2], ['zzz', 1]));
  assertEquals(favor.LHS, c([2, 'zzz'], [2, 'zza']));
  assertEquals(favor.RHS, c(['zzz', 1], ['zzz', 2]));
  assertEquals(favor.RHS, c([2, 'zza'], [2, 'zzz']));
}

function testMultiKeyComparator_CustomOrder() {
  var comparator =
      new lf.index.MultiKeyComparator([lf.Order.DESC, lf.Order.ASC]);
  var c = goog.bind(comparator.compare, comparator);

  assertEquals(favor.TIE, c([0, 0], [0, 0]));
  assertEquals(favor.TIE, c(['', ''], ['', '']));
  assertEquals(favor.TIE, c([99.99, 99.99], [99.99, 99.99]));
  assertEquals(favor.TIE, c(['ab', 'ab'], ['ab', 'ab']));
  assertEquals(favor.TIE, c([77, 'ab'], [77, 'ab']));

  assertEquals(favor.RHS, c([7, 6], [5, 4]));
  assertEquals(favor.LHS, c([7, 6], [7, 4]));
  assertEquals(favor.LHS, c([5, 4], [7, 6]));
  assertEquals(favor.RHS, c([5, 4], [5, 8]));

  assertEquals(favor.RHS, c([9, 'abc'], [8, 'zzz']));
  assertEquals(favor.RHS, c(['zzz', 8], ['abc', 12]));
  assertEquals(favor.LHS, c(['zzz', 2], ['zzz', 1]));
  assertEquals(favor.LHS, c([2, 'zzz'], [2, 'zza']));
  assertEquals(favor.RHS, c(['zzz', 1], ['zzz', 2]));
  assertEquals(favor.RHS, c([2, 'zza'], [2, 'zzz']));
}
