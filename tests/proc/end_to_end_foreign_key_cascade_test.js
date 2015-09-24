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
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('lf.ConstraintAction');
goog.require('lf.Type');
goog.require('lf.op');
goog.require('lf.schema');
goog.require('lf.schema.DataStoreType');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'EndToEndForeignKeyCascadeTest');


function testDelete_CascadeOnly_Success() {
  asyncTestCase.waitForAsync('testDelete_CascadeOnly_Success');
  var testCase = new DeleteTestCase_();
  testCase.runCascadeOnlySuccess().then(
      function() { asyncTestCase.continueTesting(); }, fail);
}


function testDelete_CascadeAndRestrict_Fail() {
  asyncTestCase.waitForAsync('testDelete_CascadeAndRestrict_Fail');
  var testCase = new DeleteTestCase_();
  testCase.runCascadeRestrictFail().then(
      function() { asyncTestCase.continueTesting(); }, fail);
}


function testUpdate_OneForeignKey() {
  asyncTestCase.waitForAsync('testUpdate_OneForeignKey');
  var testCase = new UpdateOneForeignKeyTestCase_();
  testCase.run().then(
      function() { asyncTestCase.continueTesting(); }, fail);
}



function testUpdate_TwoForeignKey_() {
  asyncTestCase.waitForAsync('testUpdate_TwoForeignKeys');
  var testCase = new UpdateTwoForeignKeysTestCase_();
  testCase.run().then(
      function() { asyncTestCase.continueTesting(); }, fail);
}



/**
 * @constructor @struct
 * @private
 */
var DeleteTestCase_ = function() {
  /** @private {!lf.schema.Builder} */
  this.schemaBuilder_ = this.getSchemaBuilder_();

  var schema = this.schemaBuilder_.getSchema();

  /** @private {!lf.schema.Table} */
  this.tA_ = schema.table('TableA');

  /** @private {!lf.schema.Table} */
  this.tB_ = schema.table('TableB');

  /** @private {!lf.schema.Table} */
  this.tB1_ = schema.table('TableB1');

  /** @private {!lf.schema.Table} */
  this.tB2_ = schema.table('TableB2');

  this.sampleRows_ = this.getSampleRows_();

  /** @private {!lf.Database} */
  this.db_;
};


/**
 * @typedef {{
 *   tableA: !Array<!lf.Row>,
 *   tableB: !Array<!lf.Row>,
 *   tableB1: !Array<!lf.Row>,
 *   tableB2: !Array<!lf.Row>
 * }}
 * @private
 */
DeleteTestCase_.SampleRows_;


/**
 * Creates a schema that has both CASCADE and RESTRICT constraints as follows.
 *             TableA
 *               | Cascade
 *             TableB
 *     Cascade /    \ Restrict
 *            /      \
 *        TableB1  TableB2
 *
 * @return {!lf.schema.Builder}
 * @private
 */
DeleteTestCase_.prototype.getSchemaBuilder_ = function() {
  var schemaBuilder = lf.schema.create('fk_schema', 1);
  schemaBuilder.createTable('TableA').
      addColumn('id', lf.Type.STRING).
      addPrimaryKey(['id']);
  schemaBuilder.createTable('TableB').
      addColumn('id', lf.Type.STRING).
      addColumn('foreignId', lf.Type.STRING).
      addPrimaryKey(['id']).
      addForeignKey('fk_foreignId', {
        local: 'foreignId',
        ref: 'TableA.id',
        action: lf.ConstraintAction.CASCADE
      });
  schemaBuilder.createTable('TableB1').
      addColumn('id', lf.Type.STRING).
      addColumn('foreignId', lf.Type.STRING).
      addPrimaryKey(['id']).
      addForeignKey('fk_foreignId', {
        local: 'foreignId',
        ref: 'TableB.id',
        action: lf.ConstraintAction.CASCADE
      });
  schemaBuilder.createTable('TableB2').
      addColumn('id', lf.Type.STRING).
      addColumn('foreignId', lf.Type.STRING).
      addPrimaryKey(['id']).
      addForeignKey('fk_foreignId', {
        local: 'foreignId',
        ref: 'TableB.id',
        action: lf.ConstraintAction.RESTRICT
      });
  return schemaBuilder;
};


/**
 * Generates one row for each table.
 * @return {!DeleteTestCase_.SampleRows_}
 * @private
 */
DeleteTestCase_.prototype.getSampleRows_ = function() {
  return {
    tableA: [
      this.tA_.createRow({id: 'tableAId'})
    ],
    tableB: [
      this.tB_.createRow({id: 'tableBId', foreignId: 'tableAId'})
    ],
    tableB1: [
      this.tB1_.createRow({id: 'tableB1Id', foreignId: 'tableBId'})
    ],
    tableB2: [
      this.tB2_.createRow({id: 'tableB2Id', foreignId: 'tableBId'})
    ]
  };
};


/**
 * @return {!IThenable}
 * @private
 */
DeleteTestCase_.prototype.setUp_ = function() {
  return this.schemaBuilder_.connect({
    storeType: lf.schema.DataStoreType.MEMORY
  }).then(function(database) {
    this.db_ = database;
  }.bind(this));
};


/**
 * Tests a simple case where a deletion on TableA cascades to TableB and
 * TableB1.
 * @return {!IThenable}
 */
DeleteTestCase_.prototype.runCascadeOnlySuccess = function() {
  return this.setUp_().then(function() {
    var tx = this.db_.createTransaction();
    return tx.exec([
      this.db_.insert().into(this.tA_).values(this.sampleRows_.tableA),
      this.db_.insert().into(this.tB_).values(this.sampleRows_.tableB),
      this.db_.insert().into(this.tB1_).values(this.sampleRows_.tableB1)
    ]);
  }.bind(this)).then(function() {
    return this.db_.delete().from(this.tA_).exec();
  }.bind(this)).then(function() {
    var tx = this.db_.createTransaction();
    return tx.exec([
      this.db_.select().from(this.tA_),
      this.db_.select().from(this.tB_),
      this.db_.select().from(this.tB1_)
    ]);
  }.bind(this)).then(function(results) {
    assertEquals(0, results[0].length);
    assertEquals(0, results[1].length);
    assertEquals(0, results[2].length);
  });
};


/**
 * Test the case where a deletion on TableA, cascades to TableB and TableB1, but
 * because TableB2 refers to TableB with a RESTRICT constraint, the entire
 * operation is rejected.
 * @return {!IThenable}
 * @suppress {invalidCasts}
 */
DeleteTestCase_.prototype.runCascadeRestrictFail = function() {
  return this.setUp_().then(function() {
    var tx = this.db_.createTransaction();
    tx.exec([
      this.db_.insert().into(this.tA_).values(this.sampleRows_.tableA),
      this.db_.insert().into(this.tB_).values(this.sampleRows_.tableB),
      this.db_.insert().into(this.tB1_).values(this.sampleRows_.tableB1),
      this.db_.insert().into(this.tB2_).values(this.sampleRows_.tableB2)
    ]);
  }.bind(this)).then(function() {
    return this.db_.delete().from(this.tA_).exec();
  }.bind(this)).then(fail, function(e) {
    // 203: Foreign key constraint violation on constraint {0}.
    assertEquals(203, e.code);

    var tx = this.db_.createTransaction();
    return tx.exec([
      this.db_.select().from(this.tA_),
      this.db_.select().from(this.tB_),
      this.db_.select().from(this.tB1_),
      this.db_.select().from(this.tB2_)
    ]);
  }.bind(this)).then(function(results) {
    var res = /** @type {!Array<!Object>} */ (results);
    // Ensure that nothing was deleted.
    assertEquals(1, res[0].length);
    assertEquals(1, res[1].length);
    assertEquals(1, res[2].length);
    assertEquals(1, res[3].length);
  });
};



/**
 * @constructor @struct
 * @private
 */
var UpdateOneForeignKeyTestCase_ = function() {
  /** @private {!lf.schema.Builder} */
  this.schemaBuilder_ = this.getSchemaBuilder_();

  var schema = this.schemaBuilder_.getSchema();

  /** @private {!lf.schema.Table} */
  this.tA_ = schema.table('TableA');

  /** @private {!lf.schema.Table} */
  this.tB_ = schema.table('TableB');

  this.sampleRows_ = this.getSampleRows_();

  /** @private {!lf.Database} */
  this.db_;
};


/**
 * @typedef {{
 *   tableA: !Array<!lf.Row>, tableB: !Array<!lf.Row>
 * }}
 * @private
 */
UpdateOneForeignKeyTestCase_.SampleRows_;


/**
 * @return {!lf.schema.Builder}
 * @private
 */
UpdateOneForeignKeyTestCase_.prototype.getSchemaBuilder_ = function() {
  var schemaBuilder = lf.schema.create('fk_schema', 1);
  schemaBuilder.createTable('TableA').
      addColumn('id', lf.Type.STRING).
      addPrimaryKey(['id']);
  schemaBuilder.createTable('TableB').
      addColumn('id', lf.Type.STRING).
      addColumn('foreignId', lf.Type.STRING).
      addPrimaryKey(['id']).
      addForeignKey('fk_foreignId', {
        local: 'foreignId',
        ref: 'TableA.id',
        action: lf.ConstraintAction.CASCADE
      });
  return schemaBuilder;
};


/**
 * Generates two rows for TableA and four rows for TableB, where there are two
 * rows referring to each row in TableA.
 * @return {!UpdateOneForeignKeyTestCase_.SampleRows_}
 * @private
 */
UpdateOneForeignKeyTestCase_.prototype.getSampleRows_ = function() {
  var rows = {tableA: [], tableB: []};

  for (var i = 0; i < 2; i++) {
    rows.tableA.push(this.tA_.createRow({
      id: 'tableAId' + i.toString()
    }));

    for (var j = 0; j < 2; j++) {
      rows.tableB.push(this.tB_.createRow({
        id: 'tableBId' + rows.tableB.length,
        foreignId: rows.tableA[i].payload()['id']
      }));
    }
  }

  return /** @type {!UpdateOneForeignKeyTestCase_.SampleRows_} */ (rows);
};


/**
 * @return {!IThenable}
 * @private
 */
UpdateOneForeignKeyTestCase_.prototype.setUp_ = function() {
  return this.schemaBuilder_.connect({
    storeType: lf.schema.DataStoreType.MEMORY
  }).then(function(database) {
    this.db_ = database;
  }.bind(this));
};


/** @return {!IThenable} */
UpdateOneForeignKeyTestCase_.prototype.run = function() {
  var updatedId = 'newTableAId0';

  return this.setUp_().then(function() {
    var tx = this.db_.createTransaction();
    return tx.exec([
      this.db_.insert().into(this.tA_).values(this.sampleRows_.tableA),
      this.db_.insert().into(this.tB_).values(this.sampleRows_.tableB)
    ]);
  }.bind(this)).then(function() {
    return this.db_.
        update(this.tA_).
        set(this.tA_['id'], updatedId).
        where(this.tA_['id'].eq(this.sampleRows_.tableA[0].payload()['id'])).
        exec();
  }.bind(this)).then(function() {
    var tx = this.db_.createTransaction();
    return tx.exec([
      this.db_.select().from(this.tA_).where(this.tA_['id'].eq(updatedId)),
      this.db_.select().from(this.tB_).
          where(this.tB_['foreignId'].eq(updatedId))
    ]);
  }.bind(this)).then(function(results) {
    assertEquals(1, results[0].length);
    assertEquals(2, results[1].length);
  });
};



/**
 * @constructor @struct
 * @private
 */
var UpdateTwoForeignKeysTestCase_ = function() {
  /** @private {!lf.schema.Builder} */
  this.schemaBuilder_ = this.getSchemaBuilder_();

  var schema = this.schemaBuilder_.getSchema();

  /** @private {!lf.schema.Table} */
  this.tA_ = schema.table('TableA');

  /** @private {!lf.schema.Table} */
  this.tB_ = schema.table('TableB');

  this.sampleRows_ = this.getSampleRows_();

  /** @private {!lf.Database} */
  this.db_;
};


/**
 * Creates a schema where TableB has two foreign key constraints on TableA.
 * @return {!lf.schema.Builder}
 * @private
 */
UpdateTwoForeignKeysTestCase_.prototype.getSchemaBuilder_ = function() {
  var schemaBuilder = lf.schema.create('fk_schema2', 1);
  schemaBuilder.createTable('TableA').
      addColumn('id1', lf.Type.INTEGER).
      addUnique('uq_id1', ['id1']).
      addColumn('id2', lf.Type.INTEGER).
      addUnique('uq_id2', ['id2']);
  schemaBuilder.createTable('TableB').
      addColumn('id', lf.Type.INTEGER).
      addColumn('foreignId1', lf.Type.INTEGER).
      addColumn('foreignId2', lf.Type.INTEGER).
      addForeignKey('fk_foreignId1', {
        local: 'foreignId1',
        ref: 'TableA.id1',
        action: lf.ConstraintAction.CASCADE
      }).
      addForeignKey('fk_foreignId2', {
        local: 'foreignId2',
        ref: 'TableA.id2',
        action: lf.ConstraintAction.CASCADE
      });
  return schemaBuilder;
};


/**
 * @return {{tableA: !Array<!lf.Row>, tableB: !Array<!lf.Row>}}
 * @private
 */
UpdateTwoForeignKeysTestCase_.prototype.getSampleRows_ = function() {
  return {
    tableA: [
      this.tA_.createRow({id1: 1, id2: 4}),
      this.tA_.createRow({id1: 2, id2: 5}),
      this.tA_.createRow({id1: 3, id2: 6})
    ],
    tableB: [
      this.tB_.createRow({id: 0, foreignId1: 1, foreignId2: 4}),
      this.tB_.createRow({id: 1, foreignId1: 2, foreignId2: 4}),
      this.tB_.createRow({id: 2, foreignId1: 3, foreignId2: 6})
    ]
  };
};


/**
 * @return {!IThenable}
 * @private
 */
UpdateTwoForeignKeysTestCase_.prototype.setUp_ = function() {
  return this.schemaBuilder_.connect({
    storeType: lf.schema.DataStoreType.MEMORY
  }).then(function(database) {
    this.db_ = database;
    this.tA_ = this.db_.getSchema().table('TableA');
    this.tB_ = this.db_.getSchema().table('TableB');
  }.bind(this));
};


/** @return {!IThenable} */
UpdateTwoForeignKeysTestCase_.prototype.run = function() {
  var updatedId1 = 7;
  var updatedId2 = 8;

  return this.setUp_().then(function() {
    var tx = this.db_.createTransaction();
    return tx.exec([
      this.db_.insert().into(this.tA_).values(this.sampleRows_.tableA),
      this.db_.insert().into(this.tB_).values(this.sampleRows_.tableB)
    ]);
  }.bind(this)).then(function() {
    return this.db_.
        update(this.tA_).
        set(this.tA_['id1'], updatedId1).
        set(this.tA_['id2'], updatedId2).
        where(lf.op.and(
            this.tA_['id1'].eq(this.sampleRows_.tableA[0].payload()['id1']),
            this.tA_['id2'].eq(this.sampleRows_.tableA[0].payload()['id2']))).
        exec();
  }.bind(this)).then(function() {
    var tx = this.db_.createTransaction();
    return tx.exec([
      this.db_.select().from(this.tA_).where(
          lf.op.and(
              this.tA_['id1'].eq(updatedId1),
              this.tA_['id2'].eq(updatedId2))),
      this.db_.select().from(this.tB_).orderBy(this.tB_['id'])
    ]);
  }.bind(this)).then(function(results) {
    assertEquals(1, results[0].length);
    assertEquals(3, results[1].length);
    assertEquals(updatedId1, results[1][0]['foreignId1']);
    assertEquals(updatedId2, results[1][0]['foreignId2']);
    assertEquals(updatedId2, results[1][1]['foreignId2']);
  });
};
