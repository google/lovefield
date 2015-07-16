/**
 * @license
 * Copyright 2015 The Lovefield Project Authors. All Rights Reserved.
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
goog.require('lf.index.BTree');
goog.require('lf.index.NullableIndex');
goog.require('lf.index.SimpleComparator');
goog.require('lf.index.SingleKeyRange');
goog.require('lf.testing.index.TestSingleRowNumericalKey');
goog.require('lf.testing.index.TestSingleRowStringKey');


/** @type {!lf.index.NullableIndex} */
var index;


function setUp() {
  index = new lf.index.NullableIndex(
      new lf.index.BTree(
          'test',
          new lf.index.SimpleComparator(lf.Order.ASC),
          /* opt_unique */ false));
}


function testIndex() {
  assertEquals('test', index.getName());

  index.add(1, 2);
  index.add(1, 3);
  index.add(2, 4);
  index.add(3, 5);
  index.add(null, 7);
  index.add(null, 8);

  assertArrayEquals([2, 3], index.get(1));
  assertArrayEquals([7, 8], index.get(null));

  assertEquals(1, index.min()[0]);
  assertEquals(3, index.max()[0]);

  assertEquals(4, index.cost());

  assertArrayEquals([4, 5], index.getRange(
      [new lf.index.SingleKeyRange(2, 3, false, false)]));
  assertArrayEquals([2, 3, 4, 5, 7, 8], index.getRange());

  index.remove(2);
  assertArrayEquals([], index.get(2));
  index.remove(null, 7);
  assertArrayEquals([8], index.get(null));

  index.set(1, 10);
  assertArrayEquals([10], index.get(1));
  index.set(null, 9);
  assertArrayEquals([9], index.get(null));

  assertTrue(index.containsKey(1));
  assertTrue(index.containsKey(null));

  index.remove(null);
  assertFalse(index.containsKey(null));
  assertArrayEquals([10, 5], index.getRange());

  index.set(null, 9);
  assertArrayEquals([9], index.get(null));

  index.clear();

  assertFalse(index.containsKey(1));
  assertFalse(index.containsKey(null));
}


function testSingleRow_NumericalKey() {
  var test = new lf.testing.index.TestSingleRowNumericalKey(function() {
    return new lf.index.NullableIndex(
        new lf.index.BTree(
        'test',
        new lf.index.SimpleComparator(lf.Order.ASC),
        /* opt_unique */ false));
  });
  test.run();
}


function testSingleRow_StringKey() {
  var test = new lf.testing.index.TestSingleRowStringKey(function() {
    return new lf.index.NullableIndex(
        new lf.index.BTree(
        'test',
        new lf.index.SimpleComparator(lf.Order.ASC),
        /* opt_unique */ false));
  });
  test.run();
}


function testSerialize() {
  var deserializeFn = lf.index.BTree.deserialize.bind(
      undefined,
      new lf.index.SimpleComparator(lf.Order.ASC),
      'test',
      false);

  index.add(null, 1);
  index.add(null, 2);
  index.add(1, 3);
  index.add(1, 4);
  index.add(2, 5);
  var rows = index.serialize();

  var index2 = lf.index.NullableIndex.deserialize(deserializeFn, rows);
  assertArrayEquals([3, 4, 5, 1, 2], index2.getRange());
  assertArrayEquals([1, 2], index2.get(null));
  assertArrayEquals([3, 4], index2.get(1));
  assertArrayEquals([5], index2.get(2));
}


/**
 * Tests that a unique nullable index allows multiple nullable keys (this
 * matches the behavior of other SQL engines).
 */
function testUnique() {
  index = new lf.index.NullableIndex(
      new lf.index.BTree(
      'test',
      new lf.index.SimpleComparator(lf.Order.ASC),
      /* opt_unique */ true));
  index.add(null, 1);
  index.add(1, 2);
  index.add(null, 3);

  assertArrayEquals([1, 3], index.get(null));
}


function testStats() {
  index.add(null, 1);
  index.add(null, 2);
  index.add(null, 7);
  index.add(1, 3);
  index.add(1, 4);
  index.add(1, 8);
  index.add(2, 5);
  assertEquals(7, index.stats().totalRows);

  index.remove(null, 2);
  assertEquals(6, index.stats().totalRows);
  index.remove(null);
  assertEquals(4, index.stats().totalRows);
  index.set(null, 22);
  assertEquals(5, index.stats().totalRows);
  index.add(null, 33);
  assertEquals(6, index.stats().totalRows);
  index.remove(null);
  assertEquals(4, index.stats().totalRows);
  index.remove(1, 3);
  assertEquals(3, index.stats().totalRows);
  index.remove(1);
  assertEquals(1, index.stats().totalRows);
  index.clear();
  assertEquals(0, index.stats().totalRows);
}
