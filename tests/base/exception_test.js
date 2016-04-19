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
goog.require('lf.Exception');


function testException() {
  var BASE_URL =
      'http://google.github.io/lovefield/error_lookup/src/error_lookup.html?c=';

  var e0 = new lf.Exception(0);
  assertEquals(BASE_URL + '0', e0.message);

  var e1 = new lf.Exception(101, 'Album 1');
  assertEquals(BASE_URL + '101&p0=Album%201', e1.message);

  var e2 = new lf.Exception(107, 2, 8);
  assertEquals(BASE_URL + '107&p0=2&p1=8', e2.message);

  var e3 = new lf.Exception(999, 'a', 'b', 'c', 'd', 'e', 'f', 'g');
  assertEquals(BASE_URL + '999&p0=a&p1=b&p2=c&p3=d', e3.message);

  var hex = '0123456789abcdef';
  var longString = '';
  var expected = '';
  for (var i = 0; i < 10; i++) {
    if (i < 4) {
      expected += hex;
    }
    longString += hex;
  }

  var e4 = new lf.Exception(999, longString);
  assertEquals(BASE_URL + '999&p0=' + expected, e4.message);

  var e5 = new lf.Exception(999, 3, undefined);
  assertEquals(BASE_URL + '999&p0=3&p1=undefined', e5.message);
}
