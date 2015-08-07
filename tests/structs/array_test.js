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
goog.require('lf.structs.array');


/**
 * Tests copied from Closure library's array_test.js.
 */
function testBinaryInsertRemove_DefaultComparator() {
  var makeChecker = function(array, fn) {
    return function(value, expectResult, expectArray) {
      var result = fn(array, value);
      assertEquals(expectResult, result);
      assertArrayEquals(expectArray, array);
    }
  };

  var a = [];
  var check = makeChecker(a, lf.structs.array.binaryInsert);
  check(3, true, [3]);
  check(3, false, [3]);
  check(1, true, [1, 3]);
  check(5, true, [1, 3, 5]);
  check(2, true, [1, 2, 3, 5]);
  check(2, false, [1, 2, 3, 5]);

  check = makeChecker(a, lf.structs.array.binaryRemove);
  check(0, false, [1, 2, 3, 5]);
  check(3, true, [1, 2, 5]);
  check(1, true, [2, 5]);
  check(5, true, [2]);
  check(2, true, []);
  check(2, false, []);
}


function testBinaryInsertRemove_CustomComparator() {
  var comparator = function(lhs, rhs) { return lhs.id - rhs.id; };
  var makeChecker = function(array, fn) {
    return function(value, expectResult, expectArray) {
      var result = fn(array, value, comparator);
      assertEquals(expectResult, result);
      assertArrayEquals(expectArray, array);
    }
  };

  /**
   * @constructor
   * @param {number} id
   */
  var Class = function(id) {
    this.id = id;
  };

  var a = [];
  var obj0 = new Class(0);
  var obj1 = new Class(1);
  var obj2 = new Class(2);
  var obj3 = new Class(3);
  var obj5 = new Class(5);

  var check = makeChecker(a, lf.structs.array.binaryInsert);
  check(obj3, true, [obj3]);
  check(obj3, false, [obj3]);
  check(obj1, true, [obj1, obj3]);
  check(obj5, true, [obj1, obj3, obj5]);
  check(obj2, true, [obj1, obj2, obj3, obj5]);
  check(obj2, false, [obj1, obj2, obj3, obj5]);

  check = makeChecker(a, lf.structs.array.binaryRemove);
  check(obj0, false, [obj1, obj2, obj3, obj5]);
  check(obj3, true, [obj1, obj2, obj5]);
  check(obj1, true, [obj2, obj5]);
  check(obj5, true, [obj2]);
  check(obj2, true, []);
  check(obj2, false, []);
}
