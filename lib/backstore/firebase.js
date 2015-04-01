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
goog.require('goog.object');
goog.require('goog.structs.Map');
goog.require('goog.structs.Set');
goog.require('lf.BackStore');
goog.require('lf.Exception');
goog.require('lf.Row');
goog.require('lf.backstore.FirebaseTx');
goog.require('lf.backstore.MemoryTable');
goog.require('lf.cache.TableDiff');



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

  /** @private {number} */
  this.revision_ = -1;

  /** @private {!goog.structs.Map<string, !lf.backstore.MemoryTable>} */
  this.tables_ = new goog.structs.Map();

  /** @private {?function(!Array<!lf.cache.TableDiff>)} */
  this.changeHandler_ = null;
};


/** @return {number} */
lf.backstore.Firebase.prototype.getRevision = function() {
  return this.revision_;
};


/** @param {number} revision */
lf.backstore.Firebase.prototype.setRevision = function(revision) {
  this.revision_ = revision;
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
    if (key == '__meta__') {
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
  this.db_.on('value', goog.bind(function(snapshot) {
    resolver.resolve(this.onValue_(snapshot));
  }, this));

  return resolver.promise;
};


/** @private */
lf.backstore.Firebase.prototype.initRowId_ = function() {
  var maxRowId = this.tables_.getValues().map(function(table) {
    return table.getMaxRowId();
  }).reduce(function(maxSoFar, cur) {
    return maxSoFar > cur ? maxSoFar : cur;
  }, 0);
  lf.Row.setNextId(maxRowId + 1);
};


/**
 * The value listener that handles database value changes. Firebase will
 * call this handler no matter the change is from this session or not.
 * @param {!DataSnapshot} snapshot
 * @return {!IThenable}
 * @private
 */
lf.backstore.Firebase.prototype.onValue_ = function(snapshot) {
  return this.revision_ < 0 ?
      this.initialize_(snapshot.exportVal()) :
      this.onChange_(snapshot.exportVal());
};


/**
 * @param {!Object} rawDb
 * @return {!IThenable}
 * @private
 */
lf.backstore.Firebase.prototype.initialize_ = function(rawDb) {
  var resolver = goog.Promise.withResolver();

  if (goog.isNull(rawDb)) {
    // New database, need initialization.
    this.db_.set(this.createNewDb_(), function() {
      resolver.resolve();
    });
  } else if (rawDb['__version__'] == this.schema_.version()) {
    this.revision_ = rawDb['__revision__'];
    this.schema_.tables().forEach(function(table) {
      var memTable = new lf.backstore.MemoryTable();
      this.populate_(memTable, rawDb[table.getName()]);
      this.tables_.set(table.getName(), memTable);
    }, this);

    this.initRowId_();
    resolver.resolve();
  } // TODO(arthurhsu): implement upgrade.

  return resolver.promise;
};


/**
 * @param {!Object} rawDb
 * @return {!IThenable}
 * @private
 */
lf.backstore.Firebase.prototype.onChange_ = function(rawDb) {
  if (rawDb['__revision__'] == this.revision_) {
    return goog.Promise.resolve();
  }

  var diffs = this.schema_.tables().map(function(table) {
    var tableName = table.getName();
    return this.generateDiff_(tableName, rawDb[tableName]);
  }, this).filter(function(diff) {
    return !diff.isEmpty();
  });

  this.revision_ = rawDb['__revision__'];
  diffs.forEach(function(diff) {
    var memTable = new lf.backstore.MemoryTable();
    this.populate_(memTable, rawDb[diff.getName()]);
    this.tables_.set(diff.getName(), memTable);
  }, this);

  if (diffs.length) {
    this.notify(diffs);
  }
  return goog.Promise.resolve();
};


/**
 * @param {string} tableName
 * @param {!Object} snapshot
 * @return {!lf.cache.TableDiff}
 * @private
 */
lf.backstore.Firebase.prototype.generateDiff_ = function(tableName, snapshot) {
  var diff = new lf.cache.TableDiff(tableName);
  var table = this.tables_.get(tableName).getData();
  var newKeySet = new goog.structs.Set(
      goog.object.getKeys(snapshot).filter(function(key) {
        return key != '__meta__';
      }).map(function(key) {
        return parseInt(key, 10);
      }));

  var newKeys = newKeySet.difference(table.getKeys()).getValues();
  newKeys.forEach(function(key) {
    diff.add(new lf.Row(key, snapshot[key.toString()]));
  });

  table.getKeys().forEach(function(key) {
    if (!newKeySet.contains(key)) {
      diff.delete(table.get(key));
    } else {
      var oldRow = table.get(key);
      if (JSON.stringify(oldRow.payload()) != JSON.stringify(snapshot[key])) {
        diff.modify([oldRow, new lf.Row(key, snapshot[key.toString()])]);
      }
    }
  });
  return diff;
};


/**
 * @param {string} tableName
 * @param {!DataSnapshot} snapshot The snapshot of tableName.
 */
lf.backstore.Firebase.prototype.reloadTable = function(tableName, snapshot) {
  var memTable = new lf.backstore.MemoryTable();
  this.populate_(memTable, snapshot.exportVal());
  this.tables_.set(tableName, memTable);
};


/**
 * @return {!Object}
 * @private
 */
lf.backstore.Firebase.prototype.createNewDb_ = function() {
  var val = {};
  val['__version__'] = this.schema_.version();
  val['__revision__'] = 1;
  this.schema_.tables().forEach(function(table) {
    var tableName = table.getName();
    // The field __meta__ ensures Firebase creates this node.
    val[tableName] = { '__meta__': '' };
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


/** @return {!Firebase} */
lf.backstore.Firebase.prototype.getRef = function() {
  return this.db_;
};


/** @override */
lf.backstore.Firebase.prototype.close = function() {
  // Not supported.
};


/** @override */
lf.backstore.Firebase.prototype.subscribe = function(handler) {
  this.changeHandler_ = handler;
};


/** @override */
lf.backstore.Firebase.prototype.unsubscribe = function() {
  this.changeHandler_ = null;
};


/** @override */
lf.backstore.Firebase.prototype.notify = function(changes) {
  if (goog.isDefAndNotNull(this.changeHandler_)) {
    this.changeHandler_(changes);
  }
};
