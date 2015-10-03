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
goog.require('goog.Promise');
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.TransactionType');
goog.require('lf.backstore.ExternalChangeObserver');
goog.require('lf.backstore.TableType');
goog.require('lf.cache.Journal');
goog.require('lf.schema.DataStoreType');
goog.require('lf.service');
goog.require('lf.structs.set');
goog.require('lf.testing.backstore.MockStore');
goog.require('lf.testing.hrSchema.MockDataGenerator');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'ExternalChangeObserverTest');


/** @type {!lf.Database} */
var db;


/** @type {!hr.db.schema.Job} */
var j;


/** @type {!Array<lf.Row>} */
var sampleJobs;


/** @type {!lf.testing.backstore.MockStore} */
var mockStore;


function setUp() {
  asyncTestCase.waitForAsync('setUp');
  hr.db.connect({storeType: lf.schema.DataStoreType.OBSERVABLE_STORE}).then(
      function(database) {
        db = database;
        j = db.getSchema().getJob();

        var dataGenerator = new lf.testing.hrSchema.MockDataGenerator(
            /** @type {!hr.db.schema.Database} */ (db.getSchema()));
        dataGenerator.generate(
            /* jobCount */ 10,
            /* employeeCount */ 10,
            /* departmentCount */ 0);
        sampleJobs = dataGenerator.sampleJobs;

        var backStore = /** @type {!lf.backstore.ObservableStore} */ (
            hr.db.getGlobal().getService(lf.service.BACK_STORE));
        mockStore = new lf.testing.backstore.MockStore(backStore);

        var externalChangeObserver = new lf.backstore.ExternalChangeObserver(
            hr.db.getGlobal());
        externalChangeObserver.startObserving();

        asyncTestCase.continueTesting();
      }, fail);
}


function tearDown() {
  db.close();
}


function testExternalChangesApplied() {
  asyncTestCase.waitForAsync('testExternalChangesApplied');

  var initialRows = sampleJobs;
  var notDeletedRows = sampleJobs.slice(0, sampleJobs.length / 2);
  var deletedRows = sampleJobs.slice(sampleJobs.length / 2);

  var modifiedRow = j.createRow();
  modifiedRow.setId('DummyJobId');
  modifiedRow.assignRowId(sampleJobs[0].id());

  var extractResultsPk = function(results) {
    return results.map(function(obj) { return obj[j.id.getName()]; });
  };

  var extractRowsPk = function(rows) {
    return rows.map(function(row) { return row.getId(); });
  };

  // Simulate an external insertion of rows.
  simulateInsertionModification(j, sampleJobs).then(
      function() {
        return db.select().from(j).orderBy(j.id).exec();
      }).then(
      function(results) {
        // Ensure that external insertion change is detected and applied
        // properly.
        assertArrayEquals(
            extractRowsPk(initialRows),
            extractResultsPk(results));

        // Simulate an external deletion of rows.
        return simulateDeletion(j, deletedRows);
      }).then(
      function() {
        return db.select().from(j).orderBy(j.id).exec();
      }).then(
      function(results) {
        // Ensure that external deletion change is detected and applied
        // properly.
        assertArrayEquals(
            extractRowsPk(notDeletedRows),
            extractResultsPk(results));

        // Simulate an external modification of rows.
        return simulateInsertionModification(j, [modifiedRow]);
      }).then(
      function() {
        return db.select().from(j).where(j.id.eq(modifiedRow.getId())).exec();
      }).then(
      function(results) {
        // Ensure that external modification change is detected and applied
        // properly.
        assertEquals(1, results.length);
        assertEquals(modifiedRow.getId(), results[0][j.id.getName()]);

        // Attempt to insert a row with an existing primary key.
        return db.insert().into(j).values([modifiedRow]).exec();
      }).thenCatch(
      function(e) {
        // Expecting a constraint error. This ensures that indices are updated
        // as a result of external changes.
        // 201: Duplicate keys are not allowed.
        assertEquals(201, e.code);
        asyncTestCase.continueTesting();
      });
}


/**
 * Tests that Lovefield's observers are firing as a result of an external
 * backstore change.
 */
function testDbObserversFired() {
  asyncTestCase.waitForAsync('testDbObserversFired');

  var query = db.select().from(j);
  db.observe(query, function(changes) {
    assertEquals(sampleJobs.length, changes.length);
    changes.forEach(function(changeEvent) {
      assertEquals(1, changeEvent.addedCount);
    });
    asyncTestCase.continueTesting();
  });

  simulateInsertionModification(j, sampleJobs);
}


/**
 * Ensures that even in the case of an external change, Lovefield observers are
 * fired after every READ_WRITE transaction.
 */
function testOrder_Observer_ExternalChange() {
  asyncTestCase.waitForAsync('testOrder_Observer_ExternalChange');

  var sampleJobs1 = sampleJobs.slice(0, sampleJobs.length / 2 - 1);
  var sampleJobs2 = sampleJobs.slice(sampleJobs.length / 2 - 1);

  var query = db.select().from(j);
  var counter = 0;
  db.observe(query, function(changes) {
    counter++;
    // Expecting the observer to be called twice, once when the db.insert()
    // query is completed, and once when the external change has been merged.
    if (counter == 1) {
      assertEquals(sampleJobs1.length, changes.length);
    } else if (counter == 2) {
      assertEquals(sampleJobs2.length, changes.length);
      asyncTestCase.continueTesting();
    }
  });

  goog.Promise.all([
    db.insert().into(j).values(sampleJobs1).exec(),
    simulateInsertionModification(j, sampleJobs2)
  ]);
}


/**
 * Simulates an external insertion/modification change.
 * @param {!lf.schema.Table} tableSchema
 * @param {!Array<!lf.Row>} rows The rows to  be inserted/modified.
 * @return {!IThenable}
 */
function simulateInsertionModification(tableSchema, rows) {
  var tx = mockStore.createTx(
      lf.TransactionType.READ_WRITE,
      [tableSchema],
      new lf.cache.Journal(hr.db.getGlobal(),
          lf.structs.set.create([tableSchema])));
  var table = tx.getTable(
      tableSchema.getName(),
      tableSchema.deserializeRow.bind(tableSchema),
      lf.backstore.TableType.DATA);
  table.put(rows);
  return tx.commit();
}


/**
 * Simulates an external deletion change.
 * @param {!lf.schema.Table} tableSchema
 * @param {!Array<!lf.Row>} rows The rows to  be deleted.
 * @return {!IThenable}
 */
function simulateDeletion(tableSchema, rows) {
  var tx = mockStore.createTx(
      lf.TransactionType.READ_WRITE,
      [tableSchema],
      new lf.cache.Journal(hr.db.getGlobal(),
          lf.structs.set.create([tableSchema])));
  var table = tx.getTable(
      tableSchema.getName(),
      tableSchema.deserializeRow.bind(tableSchema),
      lf.backstore.TableType.DATA);

  var rowIds = rows.map(function(row) { return row.id(); });
  table.remove(rowIds);
  return tx.commit();
}
