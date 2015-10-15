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
goog.provide('lf.backstore.Firebase');

goog.require('goog.Promise');
goog.require('lf.BackStore');
goog.require('lf.Exception');
goog.require('lf.Row');
goog.require('lf.backstore.FirebaseRawBackStore');
goog.require('lf.backstore.FirebaseTx');
goog.require('lf.backstore.MemoryTable');
goog.require('lf.cache.TableDiff');
goog.require('lf.structs.map');
goog.require('lf.structs.set');



/**
 * Firebase-backed back store. The store is structured like this:
 * <schema_name>: {
 *   "@rev": {
 *     R: <N>,
 *   },
 *   "@db": {
 *     version: <schema version>
 *   },
 *   "@table": {
 *     <table_name>: <table_id>
 *   },
 *   <row id 1>: { R: <N1>, T: <T1>, P: <object1> },
 *   <row id 2>: { R: <N2>, T: <T2>, P: <object2> },
 *   ...
 * }
 *
 * R stands for revision, T stands for table id, and P stands for payload. It's
 * abbreviated to ensure optimal over-the-wire transmission. On the server side,
 * this rule is needed for better performance:
 *
 * {
 *   "rules": {
 *     "your_app" {
 *       "schema_name": {
 *         ".indexOn": [ "R", "T" ]
 *       }
 *     }
 *   }
 * }
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

  /**
   * App level firebase instance provided by user.
   * @private {!Firebase}
   */
  this.app_ = fb;

  /**
   * Firebase ref pointing to the root of the DB instance refered by this
   * object.
   * @private {!Firebase}
   */
  this.db_;

  /**
   * Firebase query that is used to listen to revision changes.
   * @private {!Firebase}
   */
  this.change_;

  /** @private {!lf.structs.Map} */
  this.removedRows_ = lf.structs.map.create();

  /** @private {number} */
  this.revision_ = -1;

  /** @private {!lf.structs.Map<string, !lf.backstore.MemoryTable>} */
  this.tables_ = lf.structs.map.create();

  /** @private {!lf.structs.Map<string, number>} */
  this.tableIds_ = lf.structs.map.create();

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


/** @override */
lf.backstore.Firebase.prototype.init = function(opt_onUpgrade) {
  this.db_ = this.app_.child(this.schema_.name());
  var getValue = lf.backstore.FirebaseRawBackStore.getValue;
  var onUpgrade = opt_onUpgrade || function() {
    return goog.Promise.resolve();
  };

  // TODO(arthurhsu): DB init and upgrade needs to guard against other writers
  // from writing the Firebase remote instance.
  return getValue(this.db_, '@db/version').then(function(version) {
    if (goog.isNull(version)) {
      // New database, need initialization.
      return lf.backstore.FirebaseRawBackStore.setValue(
          this.db_, this.createNewDb_(), true).then(function() {
        // Needs to callback the onUpgrade function for new database.
        var rawDb = new lf.backstore.FirebaseRawBackStore(0, this.db_);
        return onUpgrade(rawDb);
      }.bind(this)).then(function() {
        return this.init();
      }.bind(this));
    } else if (version == this.schema_.version()) {
      return getValue(this.db_, '@rev/R').then(function(revision) {
        this.revision_ = /** @type {number} */ (revision);
        return getValue(this.db_, '@table');
      }.bind(this)).then(function(tableIdMap) {
        for (var t in tableIdMap) {
          this.tableIds_.set(t, tableIdMap[t]);
        }
        var promises = this.schema_.tables().map(function(table) {
          return this.reloadTable(table.getName());
        }, this);
        return goog.Promise.all(promises);
      }.bind(this)).then(function() {
        this.initRowId_();
        this.listen_();
        return goog.Promise.resolve();
      }.bind(this));
    } else {
      // Upgrade the DB and retry.
      return this.onUpgrade_(version, onUpgrade).then(function() {
        return this.init();
      }.bind(this));
    }
  }.bind(this));
};


/**
 * @param {number} oldVersion
 * @param {!function(!lf.raw.BackStore):!IThenable} onUpgrade
 * @return {!IThenable}
 * @private
 */
lf.backstore.Firebase.prototype.onUpgrade_ = function(oldVersion, onUpgrade) {
  var rawDb = new lf.backstore.FirebaseRawBackStore(oldVersion, this.db_);
  return rawDb.init(this.schema_).then(function() {
    return this.updateIndexTables_();
  }.bind(this)).then(function() {
    return onUpgrade(rawDb);
  }).then(function() {
    var ref = this.db_.child('@db');
    return lf.backstore.FirebaseRawBackStore.setValue(
        ref, {'version': this.schema_.version()}, true);
  }.bind(this));
};


/**
 * @return {!IThenable}
 * @private
 */
lf.backstore.Firebase.prototype.updateIndexTables_ = function() {
  // TODO(arthurhsu): implement updating persistent index.
  return goog.Promise.resolve();
};


/** @private */
lf.backstore.Firebase.prototype.listen_ = function() {
  this.db_.off();
  this.db_.on('child_removed', this.onRemoved_.bind(this));

  // Unsubscribe existing change handlers, if any.
  if (this.change_) {
    this.change_.off();
    this.removedRows_.clear();
  }
  this.change_ = this.db_.orderByChild('R').startAt(this.revision_ + 1);
  this.change_.on('value', this.onChange_.bind(this));
};


/** @private */
lf.backstore.Firebase.prototype.initRowId_ = function() {
  var maxRowId = lf.structs.map.values(this.tables_).map(function(table) {
    return table.getMaxRowId();
  }).reduce(function(maxSoFar, cur) {
    return maxSoFar > cur ? maxSoFar : cur;
  }, 0);
  lf.Row.setNextId(maxRowId + 1);
};


/**
 * Bookkeeps removed rows.
 * @param {!DataSnapshot} snapshot
 * @private
 */
lf.backstore.Firebase.prototype.onRemoved_ = function(snapshot) {
  var row = snapshot.val();
  var set = this.removedRows_.get(row['T']) || null;
  if (goog.isNull(set)) {
    set = lf.structs.set.create();
    this.removedRows_.set(row['T'], set);
  }
  set.add(parseInt(snapshot.key(), 10));
};


/**
 * Listeners for child value changed.
 * @param {!DataSnapshot} snapshot
 * @private
 */
lf.backstore.Firebase.prototype.onChange_ = function(snapshot) {
  var rev = snapshot.child('@rev/R').val();
  if (!goog.isDefAndNotNull(rev) || rev == this.revision_) {
    return;
  }

  this.revision_ = /** @type {number} */ (rev);

  var diffs = this.generateDiff_(snapshot);

  // Apply diffs to memory table.
  diffs.forEach(function(diff) {
    var table = this.tables_.get(diff.getName());
    var toRemove = lf.structs.map.keys(diff.getDeleted());
    if (toRemove.length > 0) {
      table.removeSync(toRemove);
    }

    var rows = lf.structs.map.values(diff.getAdded());
    diff.getModified().forEach(function(rowPair) {
      rows.push(rowPair[1]);
    });
    table.putSync(rows);
  }, this);

  // Notify diffs to subscribers.
  if (diffs.length > 0) {
    this.notify(diffs);
  }
  this.listen_();
};


/**
 * @param {!DataSnapshot} snapshot
 * @return {!Array<lf.cache.TableDiff>}
 * @private
 */
lf.backstore.Firebase.prototype.generateDiff_ = function(snapshot) {
  var removedIds = lf.structs.set.create();
  var diffs = lf.structs.map.create();
  this.tableIds_.forEach(function(tid, tableName) {
    var table = this.tables_.get(tableName);

    // Process deleted rows.
    var diff = new lf.cache.TableDiff(tableName);
    if (this.removedRows_.has(tid)) {
      var rowIds = lf.structs.set.values(this.removedRows_.get(tid));
      rowIds.forEach(function(rowId) {
        removedIds.add(rowId);
      });
      table.getSync(rowIds).forEach(function(row) {
        diff.delete(row);
      });
    }
    diffs.set(tid, diff);
  }.bind(this));

  snapshot.forEach(function(child) {
    if (child.key() != '@rev') {
      var rowId = parseInt(child.key(), 10);
      if (!removedIds.has(rowId)) {
        var row = child.val();
        var diff = diffs.get(row['T']);

        var table = this.tables_.get(diff.getName());
        var tableSchema = this.schema_.table(diff.getName());
        var nowRow = tableSchema.deserializeRow({
          'id': rowId,
          'value': row['P']
        });

        if (!table.getData().has(rowId)) {
          diff.add(nowRow);
        } else {  // Must be an update.
          diff.modify([table.getSync([rowId])[0], nowRow]);
        }
      }
    }
  }.bind(this));

  return lf.structs.map.values(diffs).filter(function(diff) {
    return !diff.isEmpty();
  });
};


/**
 * @param {string} tableName
 * @return {!IThenable}
 */
lf.backstore.Firebase.prototype.reloadTable = function(tableName) {
  var resolver = goog.Promise.withResolver();

  var tid = this.getTableId(tableName);
  var tableSchema = this.schema_.table(tableName);

  this.db_.orderByChild('T').equalTo(tid).once('value', function(snapshot) {
    var memTable = new lf.backstore.MemoryTable();
    var rows = [];
    snapshot.forEach(function(rowSnapshot) {
      rows.push(tableSchema.deserializeRow({
        'id': parseInt(rowSnapshot.key(), 10),
        'value': rowSnapshot.val()['P']
      }));
    });
    memTable.putSync(rows);
    this.tables_.set(tableName, memTable);
    resolver.resolve();
  }.bind(this));

  return resolver.promise;
};


/**
 * @param {string} name
 * @return {number} Table id corresponding to the name.
 */
lf.backstore.Firebase.prototype.getTableId = function(name) {
  return this.tableIds_.get(name);
};


/**
 * @return {!Object}
 * @private
 */
lf.backstore.Firebase.prototype.createNewDb_ = function() {
  var val = {};
  val['@db'] = {
    'version': this.schema_.version()
  };
  val['@rev'] = { 'R': 1 };
  this.revision_ = 1;
  val['@table'] = {};
  this.schema_.tables().forEach(function(table, index) {
    var tableName = table.getName();
    val['@table'][tableName] = index;
    this.tables_.set(tableName, new lf.backstore.MemoryTable());
    this.tableIds_.set(tableName, index);
  }, this);
  return val;
};


/** @override */
lf.backstore.Firebase.prototype.createTx = function(type, scope, opt_journal) {
  return new lf.backstore.FirebaseTx(this, type, opt_journal);
};


/** @override */
lf.backstore.Firebase.prototype.getTableInternal = function(tableName) {
  var table = this.tables_.get(tableName) || null;
  if (!goog.isNull(table)) {
    return table;
  }

  // 101: Table {0} not found.
  throw new lf.Exception(101, tableName);
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
