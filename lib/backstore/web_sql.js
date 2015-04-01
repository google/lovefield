/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
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
goog.provide('lf.backstore.WebSql');

goog.require('goog.Promise');
goog.require('lf.BackStore');
goog.require('lf.Exception');
goog.require('lf.backstore.WebSqlRawBackStore');
goog.require('lf.backstore.WebSqlTx');



/**
 * @constructor
 * @struct
 * @final
 * @implements {lf.BackStore}
 *
 * @param {!lf.Global} global
 * @param {!lf.schema.Database} schema
 * @param {number=} opt_size Size of database in bytes.
 */
lf.backstore.WebSql = function(global, schema, opt_size) {
  /** @private {!lf.Global} */
  this.global_ = global;

  /** @private {!lf.schema.Database} */
  this.schema_ = schema;

  /** @private {?Database} */
  this.db_;

  /** @private {number} */
  this.size_ = opt_size || 2e9;  // Default to 2GB.
};


/** @override */
lf.backstore.WebSql.prototype.init = function(opt_onUpgrade) {
  if (!goog.isDefAndNotNull(window.openDatabase)) {
    throw new lf.Exception(lf.Exception.Type.NOT_SUPPORTED,
        'WebSql not supported by platform.');
  }

  var onUpgrade = opt_onUpgrade || function(rawDb) {
    return goog.Promise.resolve();
  };

  var resolver = goog.Promise.withResolver();
  try {
    window.openDatabase(
        this.schema_.name(),
        '',  // Just open it with any version, otherwise weird error can happen.
        this.schema_.name(),
        this.size_,
        goog.bind(function(db) {
          this.db_ = db;
          this.checkVersion_(onUpgrade).then(
              resolver.resolve.bind(resolver),
              goog.bind(function(e) {
                this.db_ = null;
                resolver.reject(e);
              }, this));
        }, this));
  } catch (e) {
    resolver.reject(e);
  }

  return resolver.promise;
};


/**
 * Workaround Chrome's changeVersion problem.
 * WebSQL changeVersion function is not working on Chrome. As a result, creating
 * a .version table to save database version.
 * @param {!function(!lf.raw.BackStore):!IThenable} onUpgrade
 * @return {!IThenable}
 * @private
 */
lf.backstore.WebSql.prototype.checkVersion_ = function(onUpgrade) {
  var CREATE_VERSION =
      'CREATE TABLE IF NOT EXISTS __lf_ver(id INTEGER PRIMARY KEY, v INTEGER)';
  var GET_VERSION =
      'SELECT v FROM __lf_ver WHERE id = 0';

  var resolver = goog.Promise.withResolver();

  this.db_.transaction(goog.bind(function(tx) {
    lf.backstore.WebSqlTx.execSql(tx, CREATE_VERSION, []).then(function() {
      return lf.backstore.WebSqlTx.execSql(tx, GET_VERSION, []);
    }).then(goog.bind(function(results) {
      var version = 0;
      if (results.rows.length) {
        version = results.rows.item(0)['v'];
      }
      if (version < this.schema_.version()) {
        this.onUpgrade_(onUpgrade, version).then(
            resolver.resolve.bind(resolver));
      } else if (version > this.schema_.version()) {
        resolver.reject(new lf.Exception(lf.Exception.Type.DATA,
            'Attempt to open a newer database with old code'));
      } else {
        resolver.resolve();
      }
    }, this));
  }, this), resolver.reject.bind(resolver));

  return resolver.promise;
};


/** @return {boolean} */
lf.backstore.WebSql.prototype.initialized = function() {
  return goog.isDefAndNotNull(this.db_);
};


/** @override */
lf.backstore.WebSql.prototype.createTx = function(type, journal) {
  if (goog.isDefAndNotNull(this.db_)) {
    return new lf.backstore.WebSqlTx(this.global_, this.db_, journal, type);
  }
  throw new lf.Exception(lf.Exception.Type.DATA,
      'Attempt to create transaction from uninitialized DB');
};


/** @override */
lf.backstore.WebSql.prototype.close = function() {
  // WebSQL does not support closing a database connection.
};


/** @override */
lf.backstore.WebSql.prototype.getTableInternal = function(tableName) {
  throw new lf.Exception(lf.Exception.Type.SYNTAX,
      'WebSQL tables needs to be acquired from transactions');
};


/**
 * @throws {lf.Exception}
 * @private
 */
lf.backstore.WebSql.prototype.notSupported_ = function() {
  throw new lf.Exception(lf.Exception.Type.NOT_SUPPORTED,
      'WebSQL does not support change notification');
};


/** @override */
lf.backstore.WebSql.prototype.subscribe = function(handler) {
  this.notSupported_();
};


/** @override */
lf.backstore.WebSql.prototype.unsubscribe = function() {
  this.notSupported_();
};


/** @override */
lf.backstore.WebSql.prototype.notify = function(changes) {
  this.notSupported_();
};


/**
 * @param {!function(!lf.raw.BackStore):!IThenable} onUpgrade
 * @param {number} oldVersion
 * @return {!IThenable}
 * @private
 */
lf.backstore.WebSql.prototype.onUpgrade_ = function(onUpgrade, oldVersion) {
  var resolver = goog.Promise.withResolver();

  this.db_.transaction(goog.bind(function(tx) {
    this.preUpgrade_(tx).then(goog.bind(function() {
      var rawDb = new lf.backstore.WebSqlRawBackStore(
          oldVersion, /** @type {!Database} */ (this.db_), tx);
      onUpgrade(rawDb).then(goog.bind(function() {
        return this.scanRowId_();
      }, this)).then(resolver.resolve.bind(resolver));
    }, this));
  }, this),
  resolver.reject.bind(resolver));

  return resolver.promise;
};


/**
 * Deletes persisted indices and creates new tables.
 * @param {!SQLTransaction} tx
 * @return {!IThenable}
 * @private
 */
lf.backstore.WebSql.prototype.preUpgrade_ = function(tx) {
  var runSql = lf.backstore.WebSqlTx.execSql.bind(null, tx);

  /**
   * @param {!Array<string>} sqls
   * @return {!IThenable}
   */
  var runSqlSequentially = function(sqls) {
    if (sqls.length == 0) {
      return goog.Promise.resolve();
    }

    var sql = sqls[0];
    return runSql(sql, []).then(function() {
      runSqlSequentially(sqls.slice(1));
    });
  };

  var tables = this.schema_.tables();
  var tableNames = [];

  var UPDATE_VERSION = 'UPDATE __lf_ver SET v=? WHERE id=0';
  var GET_TABLE_NAMES = 'SELECT tbl_name FROM sqlite_master WHERE type="table"';

  return runSql(UPDATE_VERSION, [this.schema_.version()]).then(function() {
    return runSql(GET_TABLE_NAMES, []);
  }).then(function(results) {
    // Delete all existing persisted indices.
    var length = results.rows.length;
    for (var i = 0; i < length; ++i) {
      tableNames.push(results.rows.item(i)['tbl_name']);
    }
    var indices = tableNames.filter(function(name) {
      return name.indexOf('.') != -1;
    });
    var sqls = indices.map(function(name) {
      return 'DROP TABLE ' + name;
    });
    return runSqlSequentially(sqls);

  }).then(function() {
    // Create new tables.
    var existingTables = tableNames.filter(function(name) {
      return name.indexOf('.') == -1;
    });
    var newTables = tables.map(function(table) {
      return table.getName();
    }).filter(function(name) {
      return existingTables.indexOf(name) == -1;
    });
    var sqls = newTables.map(function(name) {
      return 'CREATE TABLE ' + name + '(id INTEGER PRIMARY KEY, value TEXT)';
    });
    return runSqlSequentially(sqls);
  });
};


/**
 * Scans existing database and find the maximum row id.
 * @return {!IThenable<number>}
 * @private
 */
lf.backstore.WebSql.prototype.scanRowId_ = function() {
  var sqlStatements = this.schema_.tables().map(function(table) {
    return 'SELECT MAX(id) FROM ' + table.getName();
  });

  /** @type {number} */
  var maxRowId = 0;

  /**
   * @param {!SQLTransaction} tx
   * @return {!IThenable}
   */
  var execSequentially = function(tx) {
    if (sqlStatements.length == 0) {
      return goog.Promise.resolve(maxRowId);
    }

    var sql = sqlStatements.shift();
    return lf.backstore.WebSqlTx.execSql(tx, sql, []).then(function(results) {
      var id = results.rows.item(0)[0];
      maxRowId = Math.max(id, maxRowId);
      return maxRowId;
    });
  };

  var resolver = goog.Promise.withResolver();
  this.db_.readTransaction(function(tx) {
    execSequentially(tx).then(resolver.resolve.bind(resolver));
  }, resolver.reject.bind(resolver));
  return resolver.promise;
};
