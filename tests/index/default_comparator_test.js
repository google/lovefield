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
goog.require('lf.index.MultiKeyComparator');
goog.require('lf.index.SimpleComparator');


function testSimpleComparator_ASC() {
  var comparator = new lf.index.SimpleComparator(lf.Order.ASC);
  var c = goog.bind(comparator.compare, comparator);

  assertEquals(0, c(0, 0));
  assertEquals(0, c('', ''));
  assertEquals(0, c(888.88, 888.88));
  assertEquals(0, c('ab', 'ab'));

  assertEquals(1, c(1, 0));
  assertEquals(-1, c(0, 1));
  assertEquals(1, c(888.88, 888.87));
  assertEquals(-1, c(888.87, 888.88));

  assertEquals(1, c('b', 'a'));
  assertEquals(-1, c('a', 'b'));
  assertEquals(1, c('bbb', 'bba'));
  assertEquals(-1, c('bba', 'bbb'));
}

function testSimpleComparator_DESC() {
  var comparator = new lf.index.SimpleComparator(lf.Order.DESC);
  var c = goog.bind(comparator.compare, comparator);

  assertEquals(0, c(0, 0));
  assertEquals(0, c('', ''));
  assertEquals(0, c(888.88, 888.88));
  assertEquals(0, c('ab', 'ab'));

  assertEquals(-1, c(1, 0));
  assertEquals(1, c(0, 1));
  assertEquals(-1, c(888.88, 888.87));
  assertEquals(1, c(888.87, 888.88));

  assertEquals(-1, c('b', 'a'));
  assertEquals(1, c('a', 'b'));
  assertEquals(-1, c('bbb', 'bba'));
  assertEquals(1, c('bba', 'bbb'));
}

function testMultiKeyComparator_DefaultOrder() {
  var orders = lf.index.MultiKeyComparator.createOrders(2, lf.Order.ASC);
  var comparator = new lf.index.MultiKeyComparator(orders);
  var c = goog.bind(comparator.compare, comparator);

  assertEquals(0, c([0, 0], [0, 0]));
  assertEquals(0, c(['', ''], ['', '']));
  assertEquals(0, c([99.99, 99.99], [99.99, 99.99]));
  assertEquals(0, c(['ab', 'ab'], ['ab', 'ab']));
  assertEquals(0, c([77, 'ab'], [77, 'ab']));

  assertEquals(1, c([7, 6], [5, 4]));
  assertEquals(1, c([7, 6], [7, 4]));
  assertEquals(-1, c([5, 4], [7, 6]));
  assertEquals(-1, c([5, 4], [5, 8]));

  assertEquals(1, c([9, 'abc'], [8, 'zzz']));
  assertEquals(1, c(['zzz', 8], ['abc', 12]));
  assertEquals(1, c(['zzz', 2], ['zzz', 1]));
  assertEquals(1, c([2, 'zzz'], [2, 'zza']));
  assertEquals(-1, c(['zzz', 1], ['zzz', 2]));
  assertEquals(-1, c([2, 'zza'], [2, 'zzz']));
}

function testMultiKeyComparator_CustomOrder() {
  var comparator =
      new lf.index.MultiKeyComparator([lf.Order.DESC, lf.Order.ASC]);
  var c = goog.bind(comparator.compare, comparator);

  assertEquals(0, c([0, 0], [0, 0]));
  assertEquals(0, c(['', ''], ['', '']));
  assertEquals(0, c([99.99, 99.99], [99.99, 99.99]));
  assertEquals(0, c(['ab', 'ab'], ['ab', 'ab']));
  assertEquals(0, c([77, 'ab'], [77, 'ab']));

  assertEquals(-1, c([7, 6], [5, 4]));
  assertEquals(1, c([7, 6], [7, 4]));
  assertEquals(1, c([5, 4], [7, 6]));
  assertEquals(-1, c([5, 4], [5, 8]));

  assertEquals(-1, c([9, 'abc'], [8, 'zzz']));
  assertEquals(-1, c(['zzz', 8], ['abc', 12]));
  assertEquals(1, c(['zzz', 2], ['zzz', 1]));
  assertEquals(1, c([2, 'zzz'], [2, 'zza']));
  assertEquals(-1, c(['zzz', 1], ['zzz', 2]));
  assertEquals(-1, c([2, 'zza'], [2, 'zzz']));
}
