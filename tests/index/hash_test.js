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
goog.require('lf.index');


function testHashCode() {
  assertEquals(0, lf.index.hashCode(''));

  // Space char's ASCII code is 32.
  // Hash function is hash = hash * 31 + c, so hash code of 32 is 32,
  // and hash code of two 32's are 32 * 32 = 1024
  assertEquals(32, lf.index.hashCode(' '));
  assertEquals(1024, lf.index.hashCode('  '));
}

function testHashArray() {
  assertEquals('', lf.index.hashArray([]));
  assertEquals('', lf.index.hashArray([null]));
  assertEquals('0_', lf.index.hashArray(['', null]));
  assertEquals('10', lf.index.hashArray([' ']));
  assertEquals('10_10', lf.index.hashArray([' ', ' ']));
}
