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
goog.require('goog.object');
goog.require('goog.testing.jsunit');
goog.require('lf.Row');
goog.require('lf.backstore.Page');
goog.require('lf.structs.map');


/** @const {number} */
var MAGIC = Math.pow(2, lf.backstore.Page.BUNDLE_EXPONENT);

function testToPageIds() {
  var rowIds = [0, MAGIC - 1, MAGIC, 2 * MAGIC - 1, 2 * MAGIC];
  var expected = [0, 1, 2];
  assertArrayEquals(expected, lf.backstore.Page.toPageIds(rowIds));
}

function testGetPageRange() {
  var expected0 = [0, MAGIC - 1];
  var expected1 = [MAGIC, 2 * MAGIC - 1];

  assertArrayEquals(expected0, lf.backstore.Page.getPageRange(0));
  assertArrayEquals(expected1, lf.backstore.Page.getPageRange(1));
}


/** @return {!Array<!lf.Row>} */
function createRows() {
  var rows = [];
  for (var i = 0; i <= (4 * MAGIC); i += (MAGIC / 2)) {
    rows.push(new lf.Row(i, {id: i}));
  }
  return rows;
}

function testSetRemoveRows() {
  var rows = createRows();
  var pages = lf.structs.map.create();
  for (var i = 0; i <= 4; ++i) {
    pages.set(i, new lf.backstore.Page(i));
  }
  rows.forEach(function(row) {
    var page = pages.get(lf.backstore.Page.toPageId(row.id()));
    page.setRows([row]);
  });

  for (var i = 0; i < 4; ++i) {
    assertEquals(2, goog.object.getKeys(pages.get(i).getPayload()).length);
  }
  assertEquals(1, goog.object.getKeys(pages.get(4).getPayload()).length);

  pages.get(4).removeRows([4 * MAGIC]);
  assertEquals(0, goog.object.getKeys(pages.get(4).getPayload()).length);

  pages.get(0).removeRows([MAGIC - 1]);
  assertEquals(2, goog.object.getKeys(pages.get(0).getPayload()).length);
}
