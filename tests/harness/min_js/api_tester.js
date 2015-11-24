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
goog.provide('ApiTester');


/**
 * Checks that the given methods exist on the given object.
 * @param {!*} obj
 * @param {!Array<string>} methodNames
 * @param {string} message Debug message.
 */
function assertMethods(obj, methodNames, message) {
  methodNames.forEach(function(methodName) {
    var hasMethod = typeof obj[methodName] == 'function';
    if (!hasMethod) {
      throw new Error('Missing method \'' + methodName + '\' from ' + message);
    }
  });
}


/**
 * Checks that the given attributes exist on the given object.
 * @param {!*} obj
 * @param {!Array<string>} attributeNames
 * @param {string} message Debug message.
 */
function assertAttributes(obj, attributeNames, message) {
  attributeNames.forEach(function(attributeName) {
    if (!obj.hasOwnProperty(attributeName)) {
      throw new Error(
          'Missing attribute \'' + attributeName + '\' from ' + message);
    }
  });
}



/**
 * Helper class for testing Lovefield's public API existence.
 * @constructor @struct
 */
ApiTester = function() {
  this.db_ = null;
  this.table_ = null;
};


/**
 * @param {string=} opt_dbName
 * @param {number=} opt_version
 * @return {!lf.schema.Builder}
 * @private
 */
ApiTester.prototype.createSchema_ = function(opt_dbName, opt_version) {
  var schemaBuilder = lf.schema.create(
      opt_dbName || 'apicheck',
      opt_version || 1);
  schemaBuilder.createTable('DummyTable').
      addColumn('number', lf.Type.NUMBER).
      addColumn('dateTime', lf.Type.DATE_TIME).
      addColumn('string', lf.Type.STRING).
      addColumn('boolean', lf.Type.BOOLEAN).
      addColumn('arrayBuffer', lf.Type.ARRAY_BUFFER).
      addColumn('object', lf.Type.OBJECT);

  return schemaBuilder;
};


/**
 * Tests all of Lovefield's public API to ensure that all public facing
 * methods/variables/enums etc are not incorrectly renamed by the JS compiler.
 * @return {!IThenable}
 */
ApiTester.prototype.run = function() {
  try {
    assertAttributes(lf, [
      // enums
      'Type', 'Order', 'TransactionType',
      'ConstraintAction', 'ConstraintTiming',
      // namespaces
      'fn', 'op', 'schema', 'query',
      // methods
      'bind'
    ], 'lf');

    this.testEnum_Type();
    this.testEnum_Order();
    this.testEnum_TransactionType();
    this.testEnum_DataStoreType();
    this.testEnum_ConstraintAction();
    this.testEnum_ConstraintTiming();

    this.testApi_Fn();
    this.testApi_Op();
    this.testApi_SchemaBuilder();
  } catch (e) {
    return Promise.reject(e);
  }

  return this.testApi_RawBackStore().then(function() {
    // The following tests require a DB connection to have been established
    // first.
    return this.getDbConnection_();
  }.bind(this)).then(function() {
    this.testApi_Db();
    this.testApi_Schema();
    this.testApi_Transaction();

    this.testApi_SelectBuilder();
    this.testApi_InsertBuilder();
    this.testApi_DeleteBuilder();
    this.testApi_UpdateBuilder();

    this.testApi_Table();
    this.testApi_Column();

    return this.testApi_ChangeRecord();
  }.bind(this));
};


/**
 * @return {!IThenable}
 * @private
 */
ApiTester.prototype.getDbConnection_ = function() {
  var schemaBuilder = this.createSchema_();
  var connectOptions = {storeType: lf.schema.DataStoreType.MEMORY};
  return schemaBuilder.connect(connectOptions).then(
      function(db) {
        this.db_ = db;
        this.table_ = db.getSchema().table('DummyTable');
      }.bind(this)).catch(function(e) {
        // Shall not be here
      }.bind(this));
};


/** Tests lf.fn */
ApiTester.prototype.testApi_Fn = function() {
  var methodNames = [
    'avg', 'count', 'distinct', 'max', 'min', 'stddev', 'sum', 'geomean'
  ];

  assertMethods(lf.fn, methodNames, 'lf.fn');
};


/** Tests lf.op */
ApiTester.prototype.testApi_Op = function() {
  var methodNames = [
    'and', 'or', 'not'
  ];

  assertMethods(lf.op, methodNames, 'lf.op');
};


/** Tests lf.Type */
ApiTester.prototype.testEnum_Type = function() {
  var attributeNames = [
    'ARRAY_BUFFER', 'BOOLEAN', 'DATE_TIME', 'INTEGER', 'NUMBER', 'STRING',
    'OBJECT'
  ];

  assertAttributes(lf.Type, attributeNames, 'lf.Type');
};


/** Tests lf.Order */
ApiTester.prototype.testEnum_Order = function() {
  var attributeNames = ['ASC', 'DESC'];
  assertAttributes(lf.Order, attributeNames, 'lf.Order');
};


/** Tests lf.schema.DataStoreType */
ApiTester.prototype.testEnum_DataStoreType = function() {
  var attributeNames = [
    'INDEXED_DB', 'MEMORY', 'LOCAL_STORAGE', 'FIREBASE', 'WEB_SQL'
  ];
  assertAttributes(
      lf.schema.DataStoreType, attributeNames, 'lf.schema.DataStoreType');
};


/** Tests lf.TransactionType */
ApiTester.prototype.testEnum_TransactionType = function() {
  var attributeNames = ['READ_ONLY', 'READ_WRITE'];
  assertAttributes(
      lf.TransactionType, attributeNames, 'lf.TransactionType');
};


/** Tests lf.ConstraintAction */
ApiTester.prototype.testEnum_ConstraintAction = function() {
  var attributeNames = ['RESTRICT', 'CASCADE'];
  assertAttributes(
      lf.ConstraintAction, attributeNames, 'lf.ConstraintAction');
};


/** Tests lf.ConstraintTiming */
ApiTester.prototype.testEnum_ConstraintTiming = function() {
  var attributeNames = ['IMMEDIATE', 'DEFERRABLE'];
  assertAttributes(
      lf.ConstraintTiming, attributeNames, 'lf.ConstraintTiming');
};


/** Tests lf.schema.create API */
ApiTester.prototype.testApi_SchemaBuilder = function() {
  assertAttributes(lf.schema, ['create'], 'lf.schema');
  var schemaBuilder = lf.schema.create('apicheck', 1);
  var methodNames = [
    'createTable', 'connect', 'setPragma', 'getSchema'
  ];
  assertMethods(schemaBuilder, methodNames, 'schemaBuilder');

  var tableBuilder = schemaBuilder.createTable('DummyTable');
  methodNames = [
    'addColumn', 'addPrimaryKey', 'addForeignKey', 'addUnique', 'addNullable',
    'addIndex', 'persistentIndex'
  ];
  assertMethods(tableBuilder, methodNames, 'tableBuilder');
};


/** Tests db connection API */
ApiTester.prototype.testApi_Db = function() {
  var methodNames = [
    'getSchema', 'select', 'insert', 'insertOrReplace', 'update', 'delete',
    'observe', 'unobserve', 'createTransaction', 'close', 'import', 'export'
  ];

  assertMethods(this.db_, methodNames, 'db');
};


/** Tests db connection API */
ApiTester.prototype.testApi_Schema = function() {
  var methodNames = [
    'name', 'version', 'tables', 'table', 'pragma'
  ];

  var schema = this.db_.getSchema();
  assertMethods(schema, methodNames, 'schema');
};


/** Tests transaction stats API */
ApiTester.prototype.testApi_TransactionStats = function() {
  var methodNames = [
    'success', 'insertedRowCount', 'updatedRowCount', 'deletedRowCount',
    'changedTableCount'
  ];

  var tx = this.db_.createTransaction();
  tx.commit();
  assertMethods(tx.stats(), methodNames, 'lf.TransactionStats');
};


/** Tests transaction API */
ApiTester.prototype.testApi_Transaction = function() {
  var methodNames = [
    'exec', 'begin', 'attach', 'commit', 'rollback', 'stats'
  ];

  var tx = this.db_.createTransaction();
  assertMethods(tx, methodNames, 'lf.Transaction');
};


/** Tests select builder API */
ApiTester.prototype.testApi_SelectBuilder = function() {
  var methodNames = [
    'from', 'where', 'limit', 'skip', 'innerJoin', 'leftOuterJoin', 'orderBy',
    'groupBy', 'exec', 'explain', 'toSql', 'bind', 'clone'
  ];

  assertMethods(this.db_.select(), methodNames, 'selectBuilder');
};


/** Tests insert builder API */
ApiTester.prototype.testApi_InsertBuilder = function() {
  var methodNames = [
    'into', 'values', 'exec', 'explain', 'toSql', 'bind'
  ];

  assertMethods(this.db_.insert(), methodNames, 'insertBuilder');
  assertMethods(this.db_.insertOrReplace(), methodNames, 'insertBuilder');
};


/** Tests delete builder API */
ApiTester.prototype.testApi_DeleteBuilder = function() {
  var methodNames = [
    'from', 'where', 'exec', 'explain', 'toSql', 'bind'
  ];

  assertMethods(this.db_.delete(), methodNames, 'deleteBuilder');
};


/** Tests update builder API */
ApiTester.prototype.testApi_UpdateBuilder = function() {
  var methodNames = [
    'set', 'where', 'exec', 'explain', 'toSql', 'bind'
  ];

  assertMethods(this.db_.update(), methodNames, 'updateBuilder');
};


/** Tests lf.schema.Table API */
ApiTester.prototype.testApi_Table = function() {
  // Tests that all declared colums actually appear in the table schema.
  assertAttributes(this.table_, [
    'number', 'dateTime', 'string', 'boolean', 'arrayBuffer', 'object',
  ], 'tableSchema');
  assertMethods(this.table_, ['getName', 'as'], 'tableSchema');
};


/** Tests lf.schema.Column API */
ApiTester.prototype.testApi_Column = function() {
  var column = this.table_['number'];

  assertMethods(column, [
    'eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'match', 'between', 'in',
    'isNull', 'isNotNull', 'as',
  ], 'columnSchema');
};


/**
 * Tests the plain ChangeRecord object passed to observers.
 * @return {!IThenable}
 */
ApiTester.prototype.testApi_ChangeRecord = function() {
  return new Promise(function(resolve, reject) {
    var q = this.db_.select().from(this.table_);
    this.db_.observe(q, function(changes) {
      assertAttributes(
          changes[0],
          ['addedCount', 'index', 'object', 'removed', 'type'],
          'ChangeRecord');
      resolve();
    });

    var row = this.table_.createRow();
    this.db_.insert().into(this.table_).values([row]).exec();
  }.bind(this));
};


/**
 * Tests lf.raw.BackStore API.
 * @return {!IThenable}
 */
ApiTester.prototype.testApi_RawBackStore = function() {
  // Check Safari and iOS WebView
  var userAgent = navigator.userAgent;
  if (userAgent.indexOf('Safari') != -1 &&
      (userAgent.indexOf('Chrome') == -1 ||
       userAgent.indexOf('iPhone') != -1 ||
       userAgent.indexOf('iPad') != -1)) {
    return Promise.resolve();
  }

  var onUpgrade = function(rawDb) {
    return new Promise(function(resolve, reject) {
      try {
        assertMethods(rawDb, [
          'getRawDBInstance', 'getRawTransaction', 'dropTable',
          'addTableColumn', 'dropTableColumn', 'renameTableColumn',
          'createRow', 'getVersion', 'dump'
        ], 'raw.BackStore');
      } catch (e) {
        reject(e);
      }
      resolve();
    });
  };

  // NOTE: This test is only testing IndexedDBRawBackStore.
  var connectOptions = {
    storeType: lf.schema.DataStoreType.INDEXED_DB,
    onUpgrade: onUpgrade
  };
  var initialVersion = 1;
  var dbName = 'rawapicheck_' + new Date().getTime();
  var schemaBuilder = this.createSchema_(dbName, initialVersion);
  return schemaBuilder.connect(connectOptions).then(
      function(db) {
        db.close();
        schemaBuilder = this.createSchema_(dbName, initialVersion + 1);
        return schemaBuilder.connect(connectOptions);
      }.bind(this));
};
