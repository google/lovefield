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

goog.require('lf.cache.TableDiff');
goog.require('lf.structs.map');
goog.require('lf.testing.getSchemaBuilder');


/** @type {!lf.schema.Table} */
var table;


function setUp() {
  var schema = lf.testing.getSchemaBuilder().getSchema();
  table = schema.table('tableA');
}


/**
 * Tests the behavior of the TableDiff class under mulitple
 * additions, modifications and deletions.
 */
function testMultipleOperations() {
  var diff = new lf.cache.TableDiff(table.getName());

  // Assuming that 1 and 2 are the only row IDs that reside in the table prior
  // to this diff.
  var row1Old = table.createRow(
      {'id': 'pk1', 'name': 'DummyName'});
  row1Old.assignRowId(1);
  var row1New = table.createRow(
      {'id': 'pk1', 'name': 'UpdatedDummyName'});
  row1New.assignRowId(1);

  var row2Old = table.createRow(
      {'id': 'pk2', 'name': 'DummyName'});
  row2Old.assignRowId(2);
  var row2New = table.createRow(
      {'id': 'pk2', 'name': 'UpdatedDummyName'});
  row2New.assignRowId(2);

  var row3 = table.createRow(
      {'id': 'pk3', 'name': 'DummyName'});
  row3.assignRowId(3);
  var row4 = table.createRow(
      {'id': 'pk4', 'name': 'DummyName'});
  row4.assignRowId(4);
  var row5Old = table.createRow(
      {'id': 'pk5', 'name': 'DummyName'});
  row5Old.assignRowId(5);
  var row5New = table.createRow(
      {'id': 'pk5', 'name': 'UpdatedDummyName'});
  row5New.assignRowId(5);

  // No changes have happened yet.
  assertEquals('[], [], []', diff.toString());

  // Adding a new row to the diff.
  diff.add(row3);
  assertEquals('[3], [], []', diff.toString());

  // Deleting the row that was added befdore. Testing that "delete" is taking
  // into account whether the row ID existed originally, and therefore expecting
  // an empty diff.
  diff.delete(row3);
  assertEquals('[], [], []', diff.toString());

  // Adding row3 and row4, modifying existing row1.
  diff.add(row4);
  diff.add(row5Old);
  diff.modify([row1Old, row1New]);
  assertEquals('[4,5], [1], []', diff.toString());

  // Deleting an existing rowID from the table.
  diff.delete(row2Old);
  assertEquals('[4,5], [1], [2]', diff.toString());

  // Adding the row that was deleted previously. Testing that "add" is converted
  // to "modify" if the row ID existed originally.
  diff.add(row2New);
  assertEquals('[4,5], [1,2], []', diff.toString());
  var modification = diff.getModified().get(2, null);
  assertNotNull(modification);
  assertEquals(
      row2Old.payload()['name'],
      modification[0].payload()['name']);
  assertEquals(
      row2New.payload()['name'],
      modification[1].payload()['name']);

  // Test that "modify" is preserved as "add" if the row ID has been previously
  // added.
  diff.modify([row5Old, row5New]);
  assertEquals('[4,5], [1,2], []', diff.toString());

  // Deleting an existing modified row. Checking that the original value is
  // recorded and not the one after the modification.
  diff.delete(row2New);
  assertEquals('[4,5], [1], [2]', diff.toString());
  var deletedRow = diff.getDeleted().get(row2New.id(), null);
  assertEquals(
      row2Old.payload()['name'],
      deletedRow.payload()['name']);
}


/**
 * Testing reversing an empty diff.
 */
function testGetReversed_Empty() {
  var original = new lf.cache.TableDiff(table.getName());
  assertTrue(original.isEmpty());
  var reverse = original.getReverse();
  assertTrue(reverse.isEmpty());
}


/**
 * Testing reversing a diff with only additions.
 */
function testGetReversed_Add() {
  var original = new lf.cache.TableDiff(table.getName());
  var row1 = table.createRow({'id': 'pk1', 'name': 'DummyName'});
  row1.assignRowId(1);
  var row2 = table.createRow({'id': 'pk2', 'name': 'DummyName'});
  row2.assignRowId(2);
  original.add(row1);
  original.add(row2);

  assertEquals(2, original.getAdded().size);
  assertEquals(0, original.getModified().size);
  assertEquals(0, original.getDeleted().size);

  var reverse = original.getReverse();
  assertEquals(0, reverse.getAdded().size);
  assertEquals(0, reverse.getModified().size);
  assertEquals(2, reverse.getDeleted().size);

  assertSameElements(
      lf.structs.map.keys(original.getAdded()),
      lf.structs.map.keys(reverse.getDeleted()));
}


/**
 * Testing reversing a diff with only deletions.
 */
function testGetReversed_Delete() {
  var original = new lf.cache.TableDiff(table.getName());
  var row1 = table.createRow({'id': 'pk1', 'name': 'DummyName'});
  row1.assignRowId(1);
  var row2 = table.createRow({'id': 'pk2', 'name': 'DummyName'});
  row2.assignRowId(2);
  original.delete(row1);
  original.delete(row2);

  assertEquals(0, original.getAdded().size);
  assertEquals(0, original.getModified().size);
  assertEquals(2, original.getDeleted().size);

  var reverse = original.getReverse();
  assertEquals(2, reverse.getAdded().size);
  assertEquals(0, reverse.getModified().size);
  assertEquals(0, reverse.getDeleted().size);

  assertSameElements(
      lf.structs.map.keys(original.getDeleted()),
      lf.structs.map.keys(reverse.getAdded()));
}


/**
 * Testing reversing a diff with only modifications.
 */
function testGetReversed_Modify() {
  var original = new lf.cache.TableDiff(table.getName());
  var rowOld = table.createRow({'id': 'pk1', 'name': 'DummyName'});
  rowOld.assignRowId(1);
  var rowNew = table.createRow({'id': 'pk1', 'name': 'OtherDummyName'});
  rowNew.assignRowId(1);
  original.modify([rowOld, rowNew]);

  assertEquals(0, original.getAdded().size);
  assertEquals(1, original.getModified().size);
  assertEquals(0, original.getDeleted().size);

  var reverse = original.getReverse();
  assertEquals(0, reverse.getAdded().size);
  assertEquals(1, reverse.getModified().size);
  assertEquals(0, reverse.getDeleted().size);

  assertSameElements(
      lf.structs.map.keys(original.getModified()),
      lf.structs.map.keys(reverse.getModified()));

  reverse.getModified().forEach(
      function(modification, rowId) {
        var originalModification = original.getModified().get(rowId, null);
        assertNotNull(originalModification);
        assertEquals(
            originalModification[0].payload()['name'],
            modification[1].payload()['name']);
      });
}


function testGetAsModifications() {
  var diff = new lf.cache.TableDiff(table.getName());

  var row1 = table.createRow({'id': 'pk1', 'name': 'DummyName'});
  row1.assignRowId(1);
  var row2 = table.createRow({'id': 'pk2', 'name': 'DummyName'});
  row2.assignRowId(2);
  var row3Before = table.createRow({'id': 'pk3', 'name': 'DummyName'});
  row3Before.assignRowId(3);
  var row3After = table.createRow({'id': 'pk3', 'name': 'OtherDummyName'});
  row3After.assignRowId(3);

  diff.add(row1);
  diff.modify([row3Before, row3After]);
  diff.delete(row2);

  var modifications = diff.getAsModifications();
  assertEquals(3, modifications.length);
  assertArrayEquals([null, row1], modifications[0]);
  assertArrayEquals([row3Before, row3After], modifications[1]);
  assertArrayEquals([row2, null], modifications[2]);
}
