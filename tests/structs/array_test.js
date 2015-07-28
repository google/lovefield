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
function testBinaryInsertRemove() {
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
