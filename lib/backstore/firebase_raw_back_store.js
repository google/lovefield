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
goog.provide('lf.backstore.FirebaseRawBackStore');

goog.require('goog.Promise');
goog.require('lf.Exception');
goog.require('lf.raw.BackStore');
goog.require('lf.structs.Map');
goog.require('lf.structs.map');



/**
 * Firebase raw back store. Please note that all altering functions will commit
 * immediately and the revision number will be bumped up.
 * @implements {lf.raw.BackStore.<Firebase>}
 * @constructor
 * @struct
 * @final
 * @export
 *
 * @param {number} version
 * @param {!Firebase} dbRef The Firebase ref pointing to DB.
 */
lf.backstore.FirebaseRawBackStore = function(version, dbRef) {
  /** @private {number} */
  this.version_ = version;

  /** @private {!Firebase} */
  this.db_ = dbRef;

  /** @private {!lf.structs.Map<string, number>} */
  this.tableIds_ = new lf.structs.Map();

  /** @private {number} */
  this.revision_;
};


/** @override */
lf.backstore.FirebaseRawBackStore.prototype.getRawDBInstance = function() {
  return this.db_;
};


/** @override */
lf.backstore.FirebaseRawBackStore.prototype.getRawTransaction = function() {
  // 351: Firebase does not have raw transaction.
  throw new lf.Exception(351);
};


/**
 * Helper to read a value from Firebase ref.
 * @param {!Firebase} ref
 * @param {string} path
 * @return {!IThenable<string|number|boolean|!Object|null>}
 */
lf.backstore.FirebaseRawBackStore.getValue = function(ref, path) {
  var resolver = goog.Promise.withResolver();
  var valRef = ref;
  if (path.length) {
    valRef = ref.child(path);
  }
  valRef.once('value', function(snapshot) {
    resolver.resolve(snapshot.val());
  }, function(e) {
    resolver.reject(e);
  });
  return resolver.promise;
};


/**
 * Helper to set a value.
 * @param {!Firebase} ref
 * @param {?Object} value
 * @param {boolean=} opt_overwrite If true, overwrite the whole key with value;
 *     otherwise, update the key with value given.
 * @return {!IThenable}
 */
lf.backstore.FirebaseRawBackStore.setValue = function(
    ref, value, opt_overwrite) {
  var overwrite = opt_overwrite || false;
  var resolver = goog.Promise.withResolver();
  var handler = function(e) {
    if (e) {
      resolver.reject(e);
    } else {
      resolver.resolve();
    }
  };

  if (overwrite) {
    ref.set(value, handler);
  } else {
    ref.update(value, handler);
  }
  return resolver.promise;
};


/**
 * Initialize and create new tables.
 * @param {!lf.schema.Database} schema New schema.
 * @return {!IThenable}
 */
lf.backstore.FirebaseRawBackStore.prototype.init = function(schema) {
  return lf.backstore.FirebaseRawBackStore.getValue(this.db_, '@rev/R').then(
      function(revision) {
        this.revision_ = revision;
        return lf.backstore.FirebaseRawBackStore.getValue(this.db_, '@table');
      }.bind(this)).then(
      function(tableIdMap) {
        var maxTableId = 0;
        for (var t in tableIdMap) {
          this.tableIds_.set(t, tableIdMap[t]);
          if (tableIdMap[t] > maxTableId) {
            maxTableId = tableIdMap[t];
          }
        }
        schema.tables().forEach(function(table) {
          if (!this.tableIds_.has(table.getName())) {
            tableIdMap[table.getName()] = ++maxTableId;
          }
        }, this);

        var ref = this.db_.child('@table');
        return lf.backstore.FirebaseRawBackStore.setValue(ref, tableIdMap);
      }.bind(this));
};


/**
 * Transforms rows in a given table and update.
 * @param {string} tableName
 * @param {!function(!Object): ?Object} callback Callback for each row, the
 *     parameter is the row snapshot, and the return value is the new row
 *     snapshot.
 * @return {!IThenable<!Object>}
 * @private
 */
lf.backstore.FirebaseRawBackStore.prototype.transform_ = function(
    tableName, callback) {
  var tableId = this.tableIds_.get(tableName);
  if (!goog.isDefAndNotNull(tableId)) {
    return goog.Promise.resolve();
  }

  var getRowUpdates = function() {
    var toUpdate = {};
    var resolver = goog.Promise.withResolver();
    this.db_.orderByChild('T').equalTo(tableId).once(
        'value',
        function(snapshot) {
          snapshot.forEach(function(row) {
            var newRow = callback(/** @type {!Object} */ (row.val()));
            toUpdate[parseInt(row.key(), 10)] = newRow;
          });
          resolver.resolve(toUpdate);
        });
    return resolver.promise;
  }.bind(this);

  return getRowUpdates().then(function(toUpdate) {
    toUpdate['@rev'] = {'R': ++this.revision_};
    return lf.backstore.FirebaseRawBackStore.setValue(this.db_, toUpdate);
  }.bind(this));
};


/** @override @export */
lf.backstore.FirebaseRawBackStore.prototype.dropTable = function(tableName) {
  return this.transform_(tableName, function(row) { return null; }).then(
      function() {
        this.tableIds_.delete(tableName);
        return lf.backstore.FirebaseRawBackStore.setValue(
            this.db_.child('@table/' + tableName), null, true);
      }.bind(this));
};


/** @override @export */
lf.backstore.FirebaseRawBackStore.prototype.addTableColumn = function(
    tableName, columnName, defaultValue) {
  return this.transform_(tableName, function(row) {
    var payload = row['P'];
    payload[columnName] = defaultValue;
    return {
      'R': this.revision_ + 1,
      'T': row['T'],
      'P': payload
    };
  }.bind(this));
};


/** @override @export */
lf.backstore.FirebaseRawBackStore.prototype.dropTableColumn = function(
    tableName, columnName) {
  return this.transform_(tableName, function(row) {
    var payload = row['P'];
    delete payload[columnName];
    return {
      'R': this.revision_ + 1,
      'T': row['T'],
      'P': payload
    };
  }.bind(this));
};


/** @override @export */
lf.backstore.FirebaseRawBackStore.prototype.renameTableColumn = function(
    tableName, oldColumnName, newColumnName) {
  return this.transform_(tableName, function(row) {
    var payload = row['P'];
    payload[newColumnName] = payload[oldColumnName];
    delete payload[oldColumnName];
    return {
      'R': this.revision_ + 1,
      'T': row['T'],
      'P': payload
    };
  }.bind(this));
};


/** @override @export */
lf.backstore.FirebaseRawBackStore.prototype.createRow = function(payload) {
  // 351: Firebase does not have raw transaction.
  throw new lf.Exception(351);
};


/** @override @export */
lf.backstore.FirebaseRawBackStore.prototype.getVersion = function() {
  return this.version_;
};


/**
 * @param {string} tableName
 * @return {!IThenable<!Array<!Object>>}
 * @private
 */
lf.backstore.FirebaseRawBackStore.prototype.dumpTable_ = function(tableName) {
  var resolver = goog.Promise.withResolver();
  var tableId = this.tableIds_.get(tableName);
  this.db_.orderByChild('T').equalTo(tableId).once('value', function(snapshot) {
    var values = [];
    snapshot.forEach(function(row) {
      values.push(row.val()['P']);
    });
    resolver.resolve(values);
  });
  return resolver.promise;
};


/** @override @export */
lf.backstore.FirebaseRawBackStore.prototype.dump = function() {
  var contents = {};
  var promises = lf.structs.map.keys(this.tableIds_).map(function(tableName) {
    return this.dumpTable_(tableName).then(function(rows) {
      contents[tableName] = rows;
    });
  }.bind(this));
  return goog.Promise.all(promises).then(function() {
    return contents;
  });
};
