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
goog.provide('lf.backstore.Firebase');

goog.require('goog.Promise');
goog.require('goog.structs.Map');
goog.require('lf.BackStore');
goog.require('lf.Exception');
goog.require('lf.Row');
goog.require('lf.backstore.FirebaseTx');
goog.require('lf.backstore.MemoryTable');



/**
 * Firebase-backed back store. This store is experimental and subjected to
 * significant changes.
 *
 * @constructor
 * @struct
 * @final
 * @implements {lf.BackStore}
 *
 * @param {!lf.schema.Database} schema
 * @param {!Firebase} fb Firebase instance, must point to the app level.
 */
lf.backstore.Firebase = function(schema, fb) {
  /** @private {!lf.schema.Database} */
  this.schema_ = schema;

  /** @private {!Firebase} */
  this.app_ = fb;

  /** @private {!Firebase} */
  this.db_;

  /** @private {!goog.structs.Map<string, !lf.backstore.MemoryTable>} */
  this.tables_ = new goog.structs.Map();
};


/**
 * Populates data acquired from Firebase.
 * @param {!lf.backstore.MemoryTable} table
 * @param {!Object} data
 * @private
 */
lf.backstore.Firebase.prototype.populate_ = function(table, data) {
  var rows = [];
  for (var key in data) {
    if (key == '.meta') {
      // Ignore table metadata.
      continue;
    }
    var id = parseInt(key, 10);
    rows.push(new lf.Row(id, data[key]));
  }

  table.putSync(rows);
};


/** @override */
lf.backstore.Firebase.prototype.init = function(opt_onUpgrade) {
  var resolver = goog.Promise.withResolver();

  this.db_ = this.app_.child(this.schema_.name());

  // This call will fetch everything in the DB from network.
  this.db_.once('value', goog.bind(function(snapshot) {
    var rawDb = snapshot.val();
    if (goog.isNull(rawDb)) {
      // New database, need initialization.
      this.db_.set(this.createNewDb_(), resolver.resolve.bind(resolver));
    } else if (rawDb['__version__'] == this.schema_.version()) {
      this.schema_.tables().forEach(function(table) {
        var memTable = new lf.backstore.MemoryTable();
        this.populate_(memTable, rawDb[table.getName()]);
        this.tables_.set(table.getName(), memTable);
      }, this);

      // Scan row id
      var maxRowId = this.tables_.getValues().map(function(table) {
        return table.getMaxRowId();
      }).reduce(function(prev, cur) {
        return prev > cur ? prev : cur;
      }, 0);
      lf.Row.setNextId(maxRowId + 1);

      resolver.resolve();
    } // TODO(arthurhsu): implement upgrade.
  }, this));

  return resolver.promise;
};


/**
 * @param {string} tableName
 * @return {!IThenable}
 */
lf.backstore.Firebase.prototype.reloadTable = function(tableName) {
  var resolver = goog.Promise.withResolver();
  var ref = this.getTableRef(tableName);
  ref.once('value', goog.bind(function(snapshot) {
    var memTable = new lf.backstore.MemoryTable();
    this.populate_(memTable, snapshot);
    this.tables_.set(tableName, memTable);
    resolver.resolve();
  }, this));
  return resolver.promise;
};


/**
 * @return {!Object}
 * @private
 */
lf.backstore.Firebase.prototype.createNewDb_ = function() {
  var val = {};
  val['__version__'] = this.schema_.version();
  this.schema_.tables().forEach(function(table) {
    var tableName = table.getName();
    this.tables_.set(tableName, new lf.backstore.MemoryTable());
  }, this);
  return val;
};


/** @override */
lf.backstore.Firebase.prototype.createTx = function(type, journal) {
  return new lf.backstore.FirebaseTx(this, type, journal);
};


/** @override */
lf.backstore.Firebase.prototype.getTableInternal = function(tableName) {
  var table = this.tables_.get(tableName, null);
  if (!goog.isNull(table)) {
    return table;
  }

  throw new lf.Exception(lf.Exception.Type.DATA,
      'Table ' + tableName + ' not found');
};


/**
 * @param {string} tableName
 * @return {!Firebase}
 */
lf.backstore.Firebase.prototype.getTableRef = function(tableName) {
  return this.db_.child(tableName);
};


/** @override */
lf.backstore.Firebase.prototype.close = function() {
  // Not supported.
};


/** @override */
lf.backstore.Firebase.prototype.subscribe = function(handler) {
  // TODO(arthurhsu): implement
};


/** @override */
lf.backstore.Firebase.prototype.unsubscribe = function() {
  // TODO(arthurhsu): implement
};


/** @override */
lf.backstore.Firebase.prototype.notify = function(changes) {
  // TODO(arthurhsu): implement
};
