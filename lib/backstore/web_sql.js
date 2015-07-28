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
 *
 * @fileoverview This WebSQL backstore shall be considered a gap-stopping patch
 * and will be removed as soon as Apple fixes IndexedDB bugs in Safari.
 */
goog.provide('lf.backstore.WebSql');

goog.require('goog.Promise');
goog.require('lf.BackStore');
goog.require('lf.Exception');
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
   * Default size of WebSQL store. This must be smaller than 5000000 to avoid
   * iOS WebSQL bug. See
   * http://www.mobilexweb.com/blog/safari-ios7-html5-problems-apis-review
   * for details.
   * @private {number}
   */
  this.size_ = opt_size || 4 * 1024 * 1024;
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

  return new goog.Promise(goog.bind(function(resolve, reject) {
    try {
      var db = window.openDatabase(
          this.schema_.name(),
          '',  // Just open it with any version
          this.schema_.name(),
          this.size_);
      if (goog.isDefAndNotNull(db)) {
        this.db_ = db;
        this.checkVersion_(onUpgrade).then(resolve, reject);
      } else {
        // 354: Unable to open WebSQL database.
        throw new lf.Exception(354);
      }
    } catch (e) {
      reject(e);
    }
  }, this));
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
      this.db_, this.getEmptyJournal_(), lf.TransactionType.READ_WRITE);
  tx.queue(CREATE_VERSION, []);
  tx.queue(GET_VERSION, []);
  tx.commit().then(goog.bind(function(results) {
    var version = 0;
    if (results.rows.length) {
      version = results.rows.item(0)['v'];
    }
    if (version < this.schema_.version()) {
      this.onUpgrade_(onUpgrade, version).then(resolver.resolve.bind(resolver));
    } else if (version > this.schema_.version()) {
      // 108: Attempt to open a newer database with old code
      resolver.reject(new lf.Exception(108));
    } else {
      resolver.resolve();
    }
  }, this));

  return resolver.promise;
};


/** @return {boolean} */
lf.backstore.WebSql.prototype.initialized = function() {
  return goog.isDefAndNotNull(this.db_);
};


/** @override */
lf.backstore.WebSql.prototype.createTx = function(type, journal) {
  if (goog.isDefAndNotNull(this.db_)) {
    return new lf.backstore.WebSqlTx(this.db_, journal, type);
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
  var resolver = goog.Promise.withResolver();

  this.preUpgrade_().then(goog.bind(function() {
    var rawDb = new lf.backstore.WebSqlRawBackStore(
        this.global_, oldVersion, this.db_);
    onUpgrade(rawDb).then(goog.bind(function() {
      return this.scanRowId_();
    }, this)).then(resolver.resolve.bind(resolver));
  }, this), resolver.reject.bind(resolver));

  return resolver.promise;
};


/**
 * Deletes persisted indices and creates new tables.
 * @return {!IThenable}
 * @private
 */
lf.backstore.WebSql.prototype.preUpgrade_ = function() {
  var tables = this.schema_.tables();

  var tx = new lf.backstore.WebSqlTx(
      this.db_, this.getEmptyJournal_(), lf.TransactionType.READ_WRITE);
  var tx2 = new lf.backstore.WebSqlTx(
      this.db_, this.getEmptyJournal_(), lf.TransactionType.READ_WRITE);

  tx.queue('INSERT OR REPLACE INTO __lf_ver VALUES (0, ?)',
      [this.schema_.version()]);
  lf.backstore.WebSqlRawBackStore.queueListTables(tx);
  return tx.commit().then(function(results) {
    // Delete all existing persisted indices.
    results.filter(function(name) {
      return name.indexOf('.') != -1;
    }).forEach(function(name) {
      tx2.queue('DROP TABLE ' + name, []);
    });

    // Create new tables.
    var existingTables = results.filter(function(name) {
      return name.indexOf('.') == -1;
    });
    var newTables = tables.map(function(table) {
      return table.getName();
    }).filter(function(name) {
      return existingTables.indexOf(name) == -1;
    });
    newTables.forEach(function(name) {
      tx2.queue(
          'CREATE TABLE ' + name + '(id INTEGER PRIMARY KEY, value TEXT)',
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
   */
  var selectIdFromTable = goog.bind(function(tableName) {
    var tx = new lf.backstore.WebSqlTx(
        this.db_, this.getEmptyJournal_(), lf.TransactionType.READ_ONLY);
    tx.queue('SELECT MAX(id) FROM ' + tableName, []);
    return tx.commit().then(function(results) {
      var id = results.rows.item(0)[0];
      maxRowId = Math.max(id, maxRowId);
    });
  }, this);

  var promises = this.schema_.tables().map(function(table) {
    return selectIdFromTable(table.getName());
  });

  goog.Promise.all(promises).then(function() {
    resolver.resolve(maxRowId);
  }, function(e) {
    resolver.reject(e);
  });

  return resolver.promise;
};
