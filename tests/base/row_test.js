/**
 * @license
 * Copyright 2014 The Lovefield Project Authors. All Rights Reserved.
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
goog.require('lf.Row');


function testCreate() {
  var row1 = lf.Row.create();
  var row2 = lf.Row.create();

  assertTrue(row1.id() < row2.id());
}


function testGetId() {
  var id = 10;
  var row = new lf.Row(id, {});

  assertEquals(id, row.id());
}


function testGetPayload() {
  var payload = {'fieldA': 'valueA'};
  var row = lf.Row.create(payload);

  assertObjectEquals(payload, row.payload());
}


function testBinHexConversion() {
  var buffer = new ArrayBuffer(24);
  var uint8Array = new Uint8Array(buffer);
  for (var i = 0; i < 24; i++) {
    uint8Array[i] = i;
  }

  var expected = '000102030405060708090a0b0c0d0e0f1011121314151617';
  assertNull(lf.Row.hexToBin(''));
  assertNull(lf.Row.hexToBin(null));
  assertEquals(null, lf.Row.binToHex(null));
  assertEquals(expected, lf.Row.binToHex(buffer));
  assertEquals(expected, lf.Row.binToHex(lf.Row.hexToBin(expected)));
}
