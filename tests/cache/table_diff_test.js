goog.setTestOnly();
goog.require('goog.testing.jsunit');

goog.require('lf.cache.TableDiff');
goog.require('lf.testing.MockSchema');


/**
 * Tests the behavior of the TableDiff class under mulitple
 * additions, modifications and deletions.
 */
function testMultipleOperations() {
  var diff = new lf.cache.TableDiff();

  // Assuming that 1 and 2 are the only row IDs that reside in the table prior
  // to this diff.
  var row1Old = new lf.testing.MockSchema.Row(
      1, {'id': 'pk1', 'name': 'DummyName'});
  var row1New = new lf.testing.MockSchema.Row(
      1, {'id': 'pk1', 'name': 'UpdatedDummyName'});

  var row2Old = new lf.testing.MockSchema.Row(
      2, {'id': 'pk2', 'name': 'DummyName'});
  var row2New = new lf.testing.MockSchema.Row(
      2, {'id': 'pk2', 'name': 'UpdatedDummyName'});

  var row3 = new lf.testing.MockSchema.Row(
      3, {'id': 'pk3', 'name': 'DummyName'});
  var row4 = new lf.testing.MockSchema.Row(
      4, {'id': 'pk4', 'name': 'DummyName'});
  var row5Old = new lf.testing.MockSchema.Row(
      5, {'id': 'pk5', 'name': 'DummyName'});
  var row5New = new lf.testing.MockSchema.Row(
      5, {'id': 'pk5', 'name': 'UpdatedDummyName'});

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
  var original = new lf.cache.TableDiff();
  var reverse = original.getReverse();
  assertEquals(0, reverse.getAdded().getCount());
  assertEquals(0, reverse.getModified().getCount());
  assertEquals(0, reverse.getDeleted().getCount());
}


/**
 * Testing reversing a diff with only additions.
 */
function testGetReversed_Add() {
  var original = new lf.cache.TableDiff();
  var row1 = new lf.testing.MockSchema.Row(
      1, {'id': 'pk1', 'name': 'DummyName'});
  var row2 = new lf.testing.MockSchema.Row(
      2, {'id': 'pk2', 'name': 'DummyName'});
  original.add(row1);
  original.add(row2);

  assertEquals(2, original.getAdded().getCount());
  assertEquals(0, original.getModified().getCount());
  assertEquals(0, original.getDeleted().getCount());

  var reverse = original.getReverse();
  assertEquals(0, reverse.getAdded().getCount());
  assertEquals(0, reverse.getModified().getCount());
  assertEquals(2, reverse.getDeleted().getCount());

  assertSameElements(
      original.getAdded().getKeys(),
      reverse.getDeleted().getKeys());
}


/**
 * Testing reversing a diff with only deletions.
 */
function testGetReversed_Delete() {
  var original = new lf.cache.TableDiff();
  var row1 = new lf.testing.MockSchema.Row(
      1, {'id': 'pk1', 'name': 'DummyName'});
  var row2 = new lf.testing.MockSchema.Row(
      2, {'id': 'pk2', 'name': 'DummyName'});
  original.delete(row1);
  original.delete(row2);

  assertEquals(0, original.getAdded().getCount());
  assertEquals(0, original.getModified().getCount());
  assertEquals(2, original.getDeleted().getCount());

  var reverse = original.getReverse();
  assertEquals(2, reverse.getAdded().getCount());
  assertEquals(0, reverse.getModified().getCount());
  assertEquals(0, reverse.getDeleted().getCount());

  assertSameElements(
      original.getDeleted().getKeys(),
      reverse.getAdded().getKeys());
}


/**
 * Testing reversing a diff with only modifications.
 */
function testGetReversed_Modify() {
  var original = new lf.cache.TableDiff();
  var rowOld = new lf.testing.MockSchema.Row(
      1, {'id': 'pk1', 'name': 'DummyName'});
  var rowNew = new lf.testing.MockSchema.Row(
      1, {'id': 'pk1', 'name': 'OtherDummyName'});
  original.modify([rowOld, rowNew]);

  assertEquals(0, original.getAdded().getCount());
  assertEquals(1, original.getModified().getCount());
  assertEquals(0, original.getDeleted().getCount());

  var reverse = original.getReverse();
  assertEquals(0, reverse.getAdded().getCount());
  assertEquals(1, reverse.getModified().getCount());
  assertEquals(0, reverse.getDeleted().getCount());

  assertSameElements(
      original.getModified().getKeys(),
      reverse.getModified().getKeys());

  reverse.getModified().forEach(
      function(modification, rowId) {
        var originalModification = original.getModified().get(rowId, null);
        assertNotNull(originalModification);
        assertEquals(
            originalModification[0].payload()['name'],
            modification[1].payload()['name']);
      });
}
