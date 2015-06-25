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
goog.require('lf.proc.Relation');
goog.require('lf.proc.RelationEntry');
goog.require('lf.testing.getSchemaBuilder');


/** @type {!lf.schema.Database} */
var schema;


function setUpPage() {
  schema = lf.testing.getSchemaBuilder().getSchema();
}


function testFromRows() {
  var rows = [];
  for (var i = 0; i < 10; i++) {
    rows.push(lf.Row.create());
  }

  var table = 'dummyTable';
  var relation = lf.proc.Relation.fromRows(rows, [table]);

  assertTrue(relation.getTables().indexOf(table) != -1);
  relation.entries.forEach(function(entry, index) {
    assertEquals(rows[index], entry.row);
  });
}


/**
 * @param {!Array<!lf.schema.Table>} tables
 */
function checkGetSetValue_MultipleTables(tables) {
  var rows = new Array(10);
  for (var i = 0; i < rows.length; i++) {
    rows[i] = lf.Row.create();
  }

  var tableNames = tables.map(function(table) {
    return table.getEffectiveName();
  });

  var relation = lf.proc.Relation.fromRows(rows, tableNames);
  relation.entries.forEach(function(entry) {
    assertTrue(goog.object.isEmpty(entry.row.payload()));

    // Tests setting the value when no previous value is specified.
    var field1 = 'Hello';
    entry.setField(tables[0]['name'], field1);
    var field2 = 'World';
    entry.setField(tables[1]['name'], field2);
    assertPopulated(
        entry, tables[0]['name'], field1, /* isPrefixApplied */ true);
    assertPopulated(
        entry, tables[1]['name'], field2, /* isPrefixApplied */ true);

    // Tests setting the value when a previous value is specified.
    var field3 = 'olleH';
    entry.setField(tables[0]['name'], field3);
    var field4 = 'dlroW';
    entry.setField(tables[1]['name'], field4);
    assertPopulated(
        entry, tables[0]['name'], field3, /* isPrefixApplied */ true);
    assertPopulated(
        entry, tables[1]['name'], field4, /* isPrefixApplied */ true);
  });
}


function testGetSetValue_MultipleTables() {
  var tables = schema.tables().slice(0, 2);
  checkGetSetValue_MultipleTables(tables);
}


function testGetSetValue_MultipleTables_Alias() {
  var table0 = schema.table('tableA').as('table0');
  var table1 = schema.table('tableB').as('table1');
  checkGetSetValue_MultipleTables([table0, table1]);
}


function testGetSetValue_SingleTable() {
  var rows = new Array(10);
  for (var i = 0; i < rows.length; i++) {
    rows[i] = lf.Row.create();
  }

  var table = schema.table('tableA');

  var relation = lf.proc.Relation.fromRows(rows, [table.getName()]);
  relation.entries.forEach(function(entry) {
    assertTrue(goog.object.isEmpty(entry.row.payload()));

    var field1 = 'HelloWorld';
    entry.setField(table['name'], field1);
    assertPopulated(entry, table['name'], field1, /* isPrefixApplied */ false);

    var field2 = 'dlroWolleH';
    entry.setField(table['name'], field2);
    assertPopulated(entry, table['name'], field2, /* isPrefixApplied */ false);
  });
}


function testSetField_WithAlias() {
  var rows = new Array(10);
  for (var i = 0; i < rows.length; i++) {
    rows[i] = lf.Row.create();
  }

  var table = schema.table('tableA');
  var col = table['name'].as('nickName');

  var relation = lf.proc.Relation.fromRows(rows, [table.getName()]);
  relation.entries.forEach(function(entry) {
    assertTrue(goog.object.isEmpty(entry.row.payload()));

    var field1 = 'HelloWorld';
    entry.setField(col, field1);
    assertEquals(field1, entry.row.payload()[col.getAlias()]);
    assertEquals(field1, entry.getField(col));
  });
}


/**
 * Asserts that the given column is populated with the given value.
 * @param {!lf.proc.RelationEntry} entry The entry to be checked.
 * @param {!lf.schema.Column} column The column to be checked.
 * @param {string} expectedValue The expected value for the given column.
 * @param {boolean} isPrefixApplied Whether the values in the payload have been
 *     prefixed.
 */
function assertPopulated(entry, column, expectedValue, isPrefixApplied) {
  assertEquals(expectedValue, entry.getField(column));

  var tableName = column.getTable().getEffectiveName();
  var value = isPrefixApplied ?
      entry.row.payload()[tableName][column.getName()] :
      entry.row.payload()[column.getName()];
  assertEquals(expectedValue, value);
}


function testIntersection_Empty() {
  var relationEntries = [];
  for (var i = 0; i < 5; i++) {
    relationEntries.push(new lf.proc.RelationEntry(lf.Row.create(), false));
  }

  var relation1 = new lf.proc.Relation(relationEntries, ['tableA']);
  var relation2 = new lf.proc.Relation([], ['tableA']);

  var intersection = lf.proc.Relation.intersect([relation1, relation2]);
  assertEquals(0, intersection.entries.length);
}


function testIntersection() {
  var entries = new Array(6);
  for (var i = 0; i < entries.length; i++) {
    entries[i] = new lf.proc.RelationEntry(lf.Row.create(), false);
  }

  // Creating 3 relations that only have entry1 in common.
  var tableName = 'dummyTable';
  var relation1 = new lf.proc.Relation(
      [entries[0], entries[1], entries[2], entries[3]], [tableName]);
  var relation2 = new lf.proc.Relation(
      [entries[0], entries[3], entries[5]], [tableName]);
  var relation3 = new lf.proc.Relation(
      [entries[0], entries[4], entries[5]], [tableName]);

  var intersection = lf.proc.Relation.intersect(
      [relation1, relation2, relation3]);
  assertEquals(1, intersection.entries.length);
  assertTrue(intersection.isCompatible(relation1));
  assertEquals(entries[0].id, intersection.entries[0].id);
}


function testUnion() {
  var entries = new Array(6);
  for (var i = 0; i < entries.length; i++) {
    entries[i] = new lf.proc.RelationEntry(lf.Row.create(), false);
  }

  // Creating 3 relations.
  var tableName = 'dummyTable';
  var relation1 = new lf.proc.Relation(
      [entries[0], entries[1], entries[2], entries[3]], [tableName]);
  var relation2 = new lf.proc.Relation([entries[5]], [tableName]);
  var relation3 = new lf.proc.Relation([entries[4], entries[5]], [tableName]);

  var union = lf.proc.Relation.union(
      [relation1, relation2, relation3]);
  assertEquals(6, union.entries.length);
  assertTrue(union.isCompatible(relation1));
}


function testCombineEntries() {
  var row1 = new lf.Row(lf.Row.DUMMY_ID, {'foo': 'FOO'});
  var row2 = new lf.Row(lf.Row.DUMMY_ID, {'bar': 'BAR'});
  var row3 = new lf.Row(lf.Row.DUMMY_ID, {'baz': 'BAZ'});

  var entry1 = new lf.proc.RelationEntry(row1, false);
  var entry2 = new lf.proc.RelationEntry(row2, false);
  var entry3 = new lf.proc.RelationEntry(row3, false);

  // First combining two unprefixed entries.
  var combinedEntry12 = lf.proc.RelationEntry.combineEntries(
      entry1, ['Table1'], entry2, ['Table2']);

  assertEquals(2, goog.object.getCount(combinedEntry12.row.payload()));
  var table1Payload = combinedEntry12.row.payload()['Table1'];
  assertObjectEquals(row1.payload(), table1Payload);
  var table2Payload = combinedEntry12.row.payload()['Table2'];
  assertObjectEquals(row2.payload(), table2Payload);

  // Now combining an unprefixed and a prefixed entry.
  var combinedEntry123 = lf.proc.RelationEntry.combineEntries(
      combinedEntry12, ['Table1', 'Table2'], entry3, ['Table3']);
  assertEquals(3, goog.object.getCount(combinedEntry123.row.payload()));

  table1Payload = combinedEntry123.row.payload()['Table1'];
  assertObjectEquals(row1.payload(), table1Payload);
  table2Payload = combinedEntry123.row.payload()['Table2'];
  assertObjectEquals(row2.payload(), table2Payload);
  var table3Payload = combinedEntry123.row.payload()['Table3'];
  assertObjectEquals(row3.payload(), table3Payload);
}
