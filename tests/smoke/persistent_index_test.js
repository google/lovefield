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
goog.require('goog.Promise');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.Row');
goog.require('lf.TransactionType');
goog.require('lf.cache.Journal');
goog.require('lf.index.BTree');
goog.require('lf.index.ComparatorFactory');
goog.require('lf.index.IndexMetadata');
goog.require('lf.index.RowId');
goog.require('lf.schema.DataStoreType');
goog.require('lf.service');
goog.require('lf.structs.set');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'PersistentIndexTest');


/** @type {!goog.testing.PropertyReplacer} */
var propertyReplacer;


/** @type {!lf.Database} */
var db;


/** @type {!lf.schema.Table} */
var table;


/** @type {!lf.BackStore} */
var backStore;


/** @type {!Array<!lf.Row>} */
var sampleRows;


function setUpPage() {
  propertyReplacer = new goog.testing.PropertyReplacer();
}


function instrumentBTree() {
  var maxCount = 4;
  propertyReplacer.replace(
      goog.getObjectByName('lf.index.BTreeNode_'),
      'MAX_COUNT_', maxCount);
  propertyReplacer.replace(
      goog.getObjectByName('lf.index.BTreeNode_'),
      'MAX_KEY_LEN_', maxCount - 1);
  propertyReplacer.replace(
      goog.getObjectByName('lf.index.BTreeNode_'),
      'MIN_KEY_LEN_', maxCount >> 1);
}


function setUp() {
  asyncTestCase.waitForAsync('setUp');

  instrumentBTree();

  hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(
      function(database) {
        db = database;
        backStore = hr.db.getGlobal().getService(lf.service.BACK_STORE);
        table = db.getSchema().getHoliday();
        sampleRows = generateSampleRows();

        asyncTestCase.continueTesting();
      }, fail);
}


function tearDown() {
  propertyReplacer.reset();
}


/**
 * Performs insert, update, replace, delete operations and verifies that
 * persisted indices are being updated appropriately on disk.
 */
function testPersistedIndices() {
  asyncTestCase.waitForAsync('testPersistedIndices');

  /**
   * Inserts 5 records to the database.
   * @return {!IThenable}
   */
  var insertFn = function() {
    return db.
        insert().
        into(table).
        values(generateSampleRows()).
        exec();
  };

  /**
   * Upadates the 'name' field of rows 1 and 3.
   * @return {!IThenable}
   */
  var updateFn = function() {
    var updatedDate = new Date(0);
    sampleRows[1].setBegin(updatedDate);
    sampleRows[3].setBegin(updatedDate);

    return db.
        update(table).
        where(table.name.in(
            [sampleRows[1].getName(), sampleRows[3].getName()])).
        set(table.begin, updatedDate).
        exec();
  };

  /**
   * Replaces rows 1 and 3.
   * @return {!IThenable}
   */
  var replaceFn = function() {
    var sampleRow1 = sampleRows[1];
    sampleRow1.setBegin(new Date(2015, 0, 20));
    sampleRow1.setEnd(new Date(2015, 0, 21));

    var sampleRow3 = sampleRows[1];
    sampleRow3.setBegin(new Date(2015, 6, 3));
    sampleRow3.setEnd(new Date(2015, 6, 5));

    var replacedRow1 = table.createRow({
      name: sampleRow1.getName(),
      begin: sampleRow1.getBegin(),
      end: sampleRow1.getEnd()
    });
    var replacedRow3 = table.createRow({
      name: sampleRow3.getName(),
      begin: sampleRow3.getBegin(),
      end: sampleRow3.getEnd()
    });

    return db.
        insertOrReplace().
        into(table).
        values([replacedRow1, replacedRow3]).
        exec();
  };

  /**
   * Deletes rows 2 and 3.
   * @return {!IThenable}
   */
  var deleteFn = function() {
    // Removing 'Holiday2' and 'Holiday3' rows.
    var removedRows = sampleRows.splice(2, 2);

    return db.
        delete().
        from(table).
        where(table.name.in(
            [removedRows[0].getName(), removedRows[1].getName()])).
        exec();
  };


  /**
   * Deletes all remaining rows.
   * @return {!IThenable}
   */
  var deleteAllFn = function() {
    sampleRows.length = 0;

    return db.
        delete().
        from(table).
        exec();
  };

  insertFn().then(
      function() {
        return assertAllIndicesPopulated(sampleRows);
      }).then(
      function() {
        return updateFn();
      }).then(
      function() {
        return assertAllIndicesPopulated(sampleRows);
      }).then(
      function() {
        return replaceFn();
      }).then(
      function() {
        return assertAllIndicesPopulated(sampleRows);
      }).then(
      function() {
        return deleteFn();
      }).then(
      function() {
        return assertAllIndicesPopulated(sampleRows);
      }).then(
      function() {
        return deleteAllFn();
      }).then(
      function() {
        return assertAllIndicesPopulated(sampleRows);
      }).then(
      function() {
        asyncTestCase.continueTesting();
      }, fail);
}


/**
 * Generates sample records to be used for testing.
 * @return {!Array<!lf.Row>}
 */
function generateSampleRows() {
  return [
    table.createRow({
      name: 'Holiday0',
      begin: new Date(2014, 0, 20),
      end: new Date(2014, 0, 21)
    }),
    table.createRow({
      name: 'Holiday1',
      begin: new Date(2014, 6, 3),
      end: new Date(2014, 6, 5)
    }),
    table.createRow({
      name: 'Holiday2',
      begin: new Date(2014, 11, 25),
      end: new Date(2014, 11, 26)
    }),
    table.createRow({
      name: 'Holiday3',
      begin: new Date(2014, 0, 1),
      end: new Date(2014, 0, 2)
    }),
    table.createRow({
      name: 'Holiday4',
      begin: new Date(2014, 10, 26),
      end: new Date(2014, 10, 28)
    })
  ];
}


/**
 * Asserts that all indices are populated with the given rows.
 * @param {!Array<!lf.Row>} rows The only rows that should be present in the
 *     persistent index tables.
 * @return {!IThenable} A signal that assertions finished.
 */
function assertAllIndicesPopulated(rows) {
  var tx = backStore.createTx(
      lf.TransactionType.READ_ONLY,
      new lf.cache.Journal(hr.db.getGlobal(), lf.structs.set.create([table])));

  var tableIndices = table.getIndices();
  var promises = tableIndices.map(function(indexSchema) {
    var indexName = indexSchema.getNormalizedName();
    return tx.getTable(indexName, lf.Row.deserialize).get([]);
  });
  promises.push(tx.getTable(
      table.getRowIdIndexName(), lf.Row.deserialize).get([]));

  return goog.Promise.all(promises).then(function(results) {
    var rowIdIndexResults = results.splice(results.length - 1, 1)[0];
    assertRowIdIndex(rowIdIndexResults, rows.length);

    results.forEach(function(indexResults, i) {
      var indexSchema = tableIndices[i];
      assertIndexContents(indexSchema, indexResults, rows);
    });
  });
}


/**
 * Asserts that the contens of the given persistent index appear as expected in
 * the backing store.
 * @param {!lf.schema.Index} indexSchema
 * @param {!Array<!lf.Row>} serializedRows The serialized version of the index.
 * @param {!Array<!lf.Row>} dataRows The rows that hold the actual data (not
 *     index data).
 */
function assertIndexContents(indexSchema, serializedRows, dataRows) {
  // Expecting at least two serialized rows for each index. The 1st row holds
  // the index's metadata. Remaining rows hold the actual index contents.
  assertTrue(serializedRows.length >= 2);
  var indexMetadataRow = serializedRows[0];

  assertEquals(
      lf.index.IndexMetadata.Type.BTREE,
      indexMetadataRow.payload()['type']);

  // Reconstructing the index and ensuring it contains all expected keys.
  var comparator = lf.index.ComparatorFactory.create(indexSchema);
  var btreeIndex = lf.index.BTree.deserialize(
      comparator,
      indexSchema.getNormalizedName(),
      indexSchema.isUnique,
      serializedRows.slice(1));
  assertEquals(dataRows.length, btreeIndex.getRange().length);

  dataRows.forEach(function(row) {
    var expectedKey = /** @type {!lf.index.Index.Key} */ (
        row.keyOfIndex(indexSchema.getNormalizedName()));
    assertTrue(btreeIndex.containsKey(expectedKey));
  });
}


/**
 * Asserts that the metadata and contents of the RowId index appear as expected
 * in the backing store.
 * @param {!Array<!lf.Row>} serializedRows The serialized version of the index.
 * @param {number} expectedSize The expected number of rowIds in the index.
 */
function assertRowIdIndex(serializedRows, expectedSize) {
  assertEquals(2, serializedRows.length);
  var indexMetadataRow = serializedRows[0];

  assertEquals(
      lf.index.IndexMetadata.Type.ROW_ID,
      indexMetadataRow.payload()['type']);
  var rowIdIndex = lf.index.RowId.deserialize(
      table.getRowIdIndexName(),
      serializedRows.slice(1));
  assertEquals(expectedSize, rowIdIndex.getRange().length);
}
