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

/**
 * @fileoverview This WebSQL backstore shall be considered a gap-stopping patch
 * and will be removed as soon as Apple fixes IndexedDB bugs in Safari.
 */
goog.provide('lf.backstore.WebSql');

goog.require('goog.Promise');
goog.require('lf.BackStore');
goog.require('lf.Exception');
goog.require('lf.Row');
goog.require('lf.TransactionType');
goog.require('lf.backstore.WebSqlRawBackStore');
goog.require('lf.backstore.WebSqlTx');
goog.require('lf.cache.Journal');
goog.require('lf.structs.set');



/**
 * @constructor
 * @struct
 * @final
 * @implements {lf.BackStore}
 *
 * @param {!lf.Global} global
 * @param {!lf.schema.Database} schema
 * @param {number=} opt_size Size of database in bytes, default to 5MB.
 */
lf.backstore.WebSql = function(global, schema, opt_size) {
  /** @private {!lf.Global} */
  this.global_ = global;

  /** @private {!lf.schema.Database} */
  this.schema_ = schema;

  /** @private {!Database} */
  this.db_;

  /**
   * Estimated size of WebSQL store. It is defaulted to 1 for a reason:
   * http://pouchdb.com/2014/10/26/10-things-i-learned-from-reading-and-writing-the-pouchdb-source.html
   * @private {number}
   */
  this.size_ = opt_size || 1;
};


/**
 * @return {!lf.cache.Journal}
 * @private
 */
lf.backstore.WebSql.prototype.getEmptyJournal_ = function() {
  return new lf.cache.Journal(this.global_, lf.structs.set.create());
};


/** @override */
lf.backstore.WebSql.prototype.init = function(opt_onUpgrade) {
  if (!goog.isDefAndNotNull(window.openDatabase)) {
    // 353: WebSQL not supported by platform.
    throw new lf.Exception(353);
  }

  var onUpgrade = opt_onUpgrade || function(rawDb) {
    return goog.Promise.resolve();
  };

  return new goog.Promise(function(resolve, reject) {
    var db = window.openDatabase(
        this.schema_.name(),
        '',  // Just open it with any version
        this.schema_.name(),
        this.size_);
    if (goog.isDefAndNotNull(db)) {
      this.db_ = db;
      this.checkVersion_(onUpgrade).then(function() {
        this.scanRowId_().then(resolve, reject);
      }.bind(this), function(e) {
        if (e instanceof lf.Exception) {
          throw e;
        }
        // 354: Unable to open WebSQL database.
        throw new lf.Exception(354, e.message);
      });
    } else {
      // 354: Unable to open WebSQL database.
      throw new lf.Exception(354);
    }
  }, this);
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

  var tx = new lf.backstore.WebSqlTx(
      this.db_, lf.TransactionType.READ_WRITE, this.getEmptyJournal_());
  tx.queue(CREATE_VERSION, []);
  tx.queue(GET_VERSION, []);
  tx.commit().then(function(results) {
    var version = 0;
    if (results[1].rows.length) {
      version = results[1].rows.item(0)['v'];
    }
    if (version < this.schema_.version()) {
      this.onUpgrade_(onUpgrade, version).then(resolver.resolve.bind(resolver));
    } else if (version > this.schema_.version()) {
      // 108: Attempt to open a newer database with old code
      resolver.reject(new lf.Exception(108));
    } else {
      resolver.resolve();
    }
  }.bind(this), resolver.reject.bind(resolver));

  return resolver.promise;
};


/** @return {boolean} */
lf.backstore.WebSql.prototype.initialized = function() {
  return goog.isDefAndNotNull(this.db_);
};


/** @override */
lf.backstore.WebSql.prototype.createTx = function(type, scope, opt_journal) {
  if (goog.isDefAndNotNull(this.db_)) {
    return new lf.backstore.WebSqlTx(this.db_, type, opt_journal);
  }
  // 2: The database has not initialized yet.
  throw new lf.Exception(2);
};


/** @override */
lf.backstore.WebSql.prototype.close = function() {
  // WebSQL does not support closing a database connection.
};


/** @override */
lf.backstore.WebSql.prototype.getTableInternal = function(tableName) {
  // 512: WebSQL tables needs to be acquired from transactions.
  throw new lf.Exception(512);
};


/**
 * @throws {lf.Exception}
 * @private
 */
lf.backstore.WebSql.prototype.notSupported_ = function() {
  // 355: WebSQL does not support change notification.
  throw new lf.Exception(355);
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
  return this.preUpgrade_().then(function() {
    var rawDb = new lf.backstore.WebSqlRawBackStore(
        this.global_, oldVersion, this.db_);
    return onUpgrade(rawDb);
  }.bind(this));
};


/**
 * Escapes table name so that table name can be reserved words.
 * @param {string} tableName
 * @return {string}
 * @private
 */
lf.backstore.WebSql.escape_ = function(tableName) {
  return '"' + tableName + '"';
};


/**
 * Deletes persisted indices and creates new tables.
 * @return {!IThenable}
 * @private
 */
lf.backstore.WebSql.prototype.preUpgrade_ = function() {
  var tables = this.schema_.tables();

  var tx = new lf.backstore.WebSqlTx(
      this.db_, lf.TransactionType.READ_WRITE, this.getEmptyJournal_());
  var tx2 = new lf.backstore.WebSqlTx(
      this.db_, lf.TransactionType.READ_WRITE, this.getEmptyJournal_());

  tx.queue('INSERT OR REPLACE INTO __lf_ver VALUES (0, ?)',
      [this.schema_.version()]);
  lf.backstore.WebSqlRawBackStore.queueListTables(tx);
  return tx.commit().then(function(results) {
    var existingTables = results[1];
    // Delete all existing persisted indices.
    existingTables.filter(function(name) {
      return name.indexOf(lf.backstore.WebSqlTx.INDEX_MARK) != -1;
    }).forEach(function(name) {
      tx2.queue('DROP TABLE ' + lf.backstore.WebSql.escape_(name), []);
    });

    // Create new tables.
    var newTables = [];
    var persistentIndices = [];
    var rowIdIndices = [];
    tables.map(function(table) {
      if (existingTables.indexOf(table.getName()) == -1) {
        newTables.push(table.getName());
      }
      if (table.persistentIndex) {
        table.getIndices().forEach(function(index) {
          var idxTableName = lf.backstore.WebSqlTx.escapeTableName(
              index.getNormalizedName());
          newTables.push(idxTableName);
          persistentIndices.push(idxTableName);
        });
        var rowIdTableName =
            lf.backstore.WebSqlTx.escapeTableName(table.getRowIdIndexName());
        newTables.push(rowIdTableName);
        rowIdIndices.push(rowIdTableName);
      }
    });

    newTables.forEach(function(name) {
      tx2.queue(
          'CREATE TABLE ' + lf.backstore.WebSql.escape_(name) +
          '(id INTEGER PRIMARY KEY, value TEXT)',
          []);
    });

    return tx2.commit();
  });
};


/**
 * Scans existing database and find the maximum row id.
 * @return {!IThenable<number>}
 * @private
 */
lf.backstore.WebSql.prototype.scanRowId_ = function() {
  var maxRowId = 0;
  var resolver = goog.Promise.withResolver();

  /**
   * @param {string} tableName
   * @return {!IThenable}
   * @this {lf.backstore.WebSql}
   */
  var selectIdFromTable = function(tableName) {
    var tx = new lf.backstore.WebSqlTx(this.db_, lf.TransactionType.READ_ONLY);
    tx.queue('SELECT MAX(id) FROM ' +
        lf.backstore.WebSql.escape_(tableName), []);
    return tx.commit().then(function(results) {
      var id = results[0].rows.item(0)['MAX(id)'];
      maxRowId = Math.max(id, maxRowId);
    });
  }.bind(this);

  var promises = this.schema_.tables().map(function(table) {
    return selectIdFromTable(table.getName());
  });

  goog.Promise.all(promises).then(function() {
    lf.Row.setNextId(maxRowId + 1);
    resolver.resolve();
  }, function(e) {
    resolver.reject(e);
  });

  return resolver.promise;
};
