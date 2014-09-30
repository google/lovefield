/**
 * @license
 * Copyright 2014 Google Inc. All Rights Reserved.
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
goog.provide('lf.cache.Journal');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('goog.structs.Map');
goog.require('goog.structs.Set');
goog.require('lf.Exception');
goog.require('lf.Global');
goog.require('lf.service');

goog.forwardDeclare('lf.cache.Cache');
goog.forwardDeclare('lf.index.IndexStore');
goog.forwardDeclare('lf.index.Index');
goog.forwardDeclare('lf.schema.Index');



/**
 * Transaction Journal which is contained within lf.backstore.Tx. The journal
 * stores rows changed by this transaction so that they can be merged into cache
 * and update indices once the transaction is committed.
 * @constructor
 * @struct
 * @final
 *
 * @param {!Array.<!lf.schema.Table>} scope A list of tables that this journal
 *     should allow access. Trying to access any table not in that list will
 *     result in an error.
 */
lf.cache.Journal = function(scope) {
  /**
   * Scope of this transaction in the form of table schema.
   * @private {!goog.structs.Map.<!lf.schema.Table>}
   */
  this.scope_ = new goog.structs.Map();
  scope.forEach(function(tableSchema) {
    this.scope_.set(tableSchema.getName(), tableSchema);
  }, this);

  /**
   * A map contains table row snapshot, key is the name of table.
   * @private {!goog.structs.Map.<string, goog.structs.Map.<number, ?lf.Row>>}
   */
  this.snapshots_ = new goog.structs.Map();

  /**
   * A map contains newly inserted row ids for each table, key is the name of
   * table.
   * @private {!goog.structs.Map.<string, goog.structs.Set.<number>>}
   */
  this.newRowIds_ = new goog.structs.Map();

  /** @private {!lf.cache.Cache} */
  this.cache_ = lf.Global.get().getService(lf.service.CACHE);

  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = lf.Global.get().getService(lf.service.INDEX_STORE);
};


/**
 * @return {!goog.structs.Map.<string, goog.structs.Map.<number, ?lf.Row>>}
 */
lf.cache.Journal.prototype.getSnapshots = function() {
  return this.snapshots_;
};


/**
 * @return {!goog.structs.Map.<!lf.schema.Table>}
 */
lf.cache.Journal.prototype.getScope = function() {
  return this.scope_;
};


/**
 * @param {string} tableName
 * @return {!goog.structs.Map.<number, ?lf.Row>}
 */
lf.cache.Journal.prototype.getChangedRows = function(tableName) {
  var snapshot = this.snapshots_.get(tableName);
  if (!goog.isDefAndNotNull(snapshot)) {
    snapshot = new goog.structs.Map();
    this.snapshots_.set(tableName, snapshot);
  }
  return snapshot;
};


/**
 * @param {!lf.schema.Index} indexSchema
 * @param {!Array.<!lf.index.KeyRange>} keyRanges
 * @return {!Array.<!Array.<string>>} The returned array has exactly two
 *     elements. The first element represents the rowIds that are within the
 *     given key ranges, the second elemen the ones that are outside the given
 *     key ranges.
 * @private
 */
lf.cache.Journal.prototype.getChangedRowsWithinRange_ = function(
    indexSchema, keyRanges) {
  var inRange = new goog.structs.Set();
  var outOfRange = null;
  var changedRows = this.getChangedRows(indexSchema.tableName);

  keyRanges.forEach(function(keyRange) {
    var outOfRangeTemp = new goog.structs.Set();
    if (goog.isNull(outOfRange)) {
      outOfRange = outOfRangeTemp;
    }

    var comparatorFn = keyRange.getComparator();
    changedRows.getValues().forEach(function(row) {
      var key = /** @type {!lf.index.Index.Key} */ (
          row.keyOfIndex(indexSchema.getNormalizedName()));
      comparatorFn(key) ? inRange.add(row.id()) : outOfRangeTemp.add(row.id());
    }, this);
    outOfRange = outOfRange.intersection(outOfRangeTemp);
  }, this);

  return [
    inRange.getValues(),
    goog.isNull(outOfRange) ? [] : outOfRange.getValues()
  ];
};


/**
 * Finds the rowIds corresponding to records within the given key ranges, taking
 * into account changes that have happened within this journal and have not been
 * committed to backstore/indexstore yet.
 * @param {!lf.schema.Index} indexSchema
 * @param {!Array.<!lf.index.KeyRange>} keyRanges
 * @return {!Array.<number>}
 */
lf.cache.Journal.prototype.getIndexRange = function(
    indexSchema, keyRanges) {
  var rowIds = new goog.structs.Set();
  var index = this.indexStore_.get(indexSchema.getNormalizedName());

  // Getting rowIds within the given key ranges according to IndexStore.
  keyRanges.forEach(function(keyRange) {
    rowIds.addAll(index.getRange(keyRange));
  }, this);

  // Getting rowIds within the given key ranges taking into account the changes
  // that have happened within the current journal. Such changes are not
  // reflected yet in IndexStore.
  var rangeData = this.getChangedRowsWithinRange_(indexSchema, keyRanges);
  var inRangeRowIds = /** @type {!Array.<number>} */ (rangeData[0]);
  var outOfRangeRowIds = /** @type {!Array.<number>} */ (rangeData[1]);

  // Adjusting rowIds based on this journal's data.
  rowIds.addAll(inRangeRowIds);
  rowIds.removeAll(outOfRangeRowIds);

  return rowIds.getValues();
};


/**
 * @param {string} tableName
 * @param {!Array.<number>=} opt_rowIds
 * @return {!Array.<?lf.Row>} Snapshot of rows of the table in this transaction.
 */
lf.cache.Journal.prototype.getTableRows = function(tableName, opt_rowIds) {
  if (opt_rowIds) {
    return this.getTableRowsWithFilter_(tableName, opt_rowIds);
  }

  var rowIds = this.indexStore_.getRowIdIndex(tableName).getRange();
  var originalRows = this.cache_.get(rowIds);
  var txSnapshot = this.getChangedRows(tableName);
  var results = [];
  txSnapshot.forEach(function(value, key) {
    if (goog.isDefAndNotNull(value)) {
      results.push(value);
    }
  });
  rowIds.forEach(function(id, index) {
    if (!txSnapshot.containsKey(id)) {
      results.push(originalRows[index]);
    }
  });
  return results;
};


/**
 * @param {string} tableName
 * @param {!Array.<number>} rowIds
 * @return {!Array.<?lf.Row>}
 * @private
 */
lf.cache.Journal.prototype.getTableRowsWithFilter_ = function(
    tableName, rowIds) {
  if (rowIds.length == 0) {
    return [];
  }

  // When filters exist, there is no need to scan newly added rows.
  var originalRows = this.cache_.get(rowIds);
  var txSnapshot = this.getChangedRows(tableName);
  var results = rowIds.map(function(id, index) {
    return txSnapshot.containsKey(id) ? txSnapshot.get(id) :
        originalRows[index];
  });

  return results;
};


/**
 * @param {!lf.schema.Table} table
 * @param {!Array.<!lf.Row>} rows
 */
lf.cache.Journal.prototype.insert = function(table, rows) {
  this.checkScope_(table);
  var snapshot = this.getChangedRows(table.getName());
  var newRowIds = this.newRowIds_.get(table.getName(), new goog.structs.Set());
  rows.forEach(function(row) {
    snapshot.set(row.id(), row);
    newRowIds.add(row.id());
  });
  this.newRowIds_.set(table.getName(), newRowIds);
};


/**
 * @param {!lf.schema.Table} table
 * @param {!Array.<!lf.Row>} rows
 */
lf.cache.Journal.prototype.update = function(table, rows) {
  this.checkScope_(table);
  var snapshot = this.getChangedRows(table.getName());
  rows.forEach(function(row) {
    snapshot.set(row.id(), row);
  });
};


/**
 * @param {!lf.schema.Table} table
 * @param {!Array.<!lf.Row>} rows
 */
lf.cache.Journal.prototype.insertOrReplace = function(table, rows) {
  this.checkScope_(table);
  var newRowIds = this.newRowIds_.get(table.getName(), new goog.structs.Set());

  rows.forEach(function(row) {
    var existingRowId = this.findExistingRowId_(table, row);
    goog.isDefAndNotNull(existingRowId) ?
        row.setRowId(existingRowId) :
        newRowIds.add(row.id());
    var snapshot = this.getChangedRows(table.getName());
    snapshot.set(row.id(), row);
  }, this);

  if (!newRowIds.isEmpty()) {
    this.newRowIds_.set(table.getName(), newRowIds);
  }
};


/**
 * Finds if any row with the same primary key exists. It searches first in
 * rows that have been added as part of this journal (but not committed yet),
 * and then in the primary key index.
 * @param {!lf.schema.Table} table The table where the row belongs.
 * @param {!lf.Row} row The row whose primary key needs to checked.
 * @return {?number} The row ID of an existing row that has the same primary
 *     key as the input row, on null if no existing row was found.
 * @private
 */
lf.cache.Journal.prototype.findExistingRowId_ = function(table, row) {
  var pkIndexSchema = table.getPrimaryKey();

  // This should never happen since InsertBuilder#assertExecPreconditions is
  // already checking for this.
  goog.asserts.assert(
      !goog.isNull(pkIndexSchema),
      table.getName() + ' does not have a primary key.');

  var indexName = pkIndexSchema.getNormalizedName();
  var pkIndex = this.indexStore_.get(indexName);
  var primaryKey = row.keyOfIndex(indexName);
  goog.asserts.assert(
      goog.isDefAndNotNull(primaryKey),
      table.getName() + ' has null primary key');
  var snapshot = this.snapshots_.get(table.getName(), null);

  var existingRow = null;
  if (!goog.isNull(snapshot)) {
    existingRow = goog.array.find(
        snapshot.getValues(),
        function(affectedRow) {
          if (goog.isNull(affectedRow)) {
            return false;
          }

          var newRowPrimaryKey = affectedRow.keyOfIndex(indexName);
          return primaryKey == newRowPrimaryKey;
        }, this);
  }

  return !goog.isNull(existingRow) ?
      existingRow.id() :
      pkIndex.get(primaryKey)[0];
};


/**
 * @param {!lf.schema.Table} table
 * @param {!Array.<number>} rowIds
 */
lf.cache.Journal.prototype.remove = function(table, rowIds) {
  this.checkScope_(table);
  var insertSet = this.newRowIds_.get(table.getName(), null);
  var snapshot = this.getChangedRows(table.getName());
  rowIds.forEach(function(id) {
    if (goog.isDefAndNotNull(insertSet) && insertSet.contains(id)) {
      insertSet.remove(id);
      snapshot.remove(id);
    } else {
      snapshot.set(id, null);
    }
  }, this);
};


/**
 * Commits journal changes into cache and indices.
 */
lf.cache.Journal.prototype.commit = function() {
  // Update index first before losing old row snapshot.
  this.updateIndices_();
  this.mergeIntoCache_();
};


/**
 * Merge contents of journal into cache.
 * @private
 */
lf.cache.Journal.prototype.mergeIntoCache_ = function() {
  this.snapshots_.getValues().forEach(function(snapshot) {
    snapshot.getKeys().forEach(function(key) {
      var value = snapshot.get(key, null);
      goog.isNull(value) ? this.cache_.remove([key]) : this.cache_.set([value]);
    }, this);
  }, this);
};


/** @private */
lf.cache.Journal.prototype.updateIndices_ = function() {
  this.scope_.getValues().forEach(function(table) {
    this.updateTableIndices_(table);
  }, this);
};


/**
 * @param {!lf.schema.Table} table
 * @private
 */
lf.cache.Journal.prototype.updateTableIndices_ = function(table) {
  var changedRows = this.snapshots_.get(table.getName(), null);
  var newRowIds = this.newRowIds_.get(table.getName(), null);

  // No write operations were performed within this journal, nothing to update.
  if (goog.isNull(changedRows)) {
    goog.asserts.assert(
        goog.isNull(newRowIds),
        'newRowIds non-empty, but no changedRows exist.');
    return;
  }

  var snapshot = changedRows.getKeys().map(
      /** @this {!lf.cache.Journal} */
      function(id) {
        var row = changedRows.get(id, null);
        var now = goog.isNull(row) ? null : row;
        var then = !goog.isNull(newRowIds) && newRowIds.contains(id) ?
            null : this.cache_.get([id])[0];
        return [now, then];
      }, this);

  /** @type {!Array.<!lf.index.Index>} */
  var indices = table.getIndices().map(
      /**
       * @param {!lf.schema.Index} indexSchema
       * @this {!lf.cache.Journal}
       */
      function(indexSchema) {
        return this.indexStore_.get(indexSchema.getNormalizedName());
      }, this).concat([this.indexStore_.getRowIdIndex(table.getName())]);

  indices.forEach(
      /** @param {!lf.index.Index} index */
      function(index) {
        snapshot.forEach(function(pair) {
          var keyNow = goog.isNull(pair[0]) ? null :
              pair[0].keyOfIndex(index.getName());
          var keyThen = goog.isNull(pair[1]) ? null :
              pair[1].keyOfIndex(index.getName());
          if (keyNow != keyThen) {
            if (!goog.isNull(keyThen)) {
              index.remove(keyThen, pair[1].id());
            }
            if (!goog.isNull(keyNow)) {
              index.add(keyNow, pair[0].id());
            }
          }
        });
      });
};


/**
 * Checks that the given table is within the declared scope.
 * @param {!lf.schema.Table} tableSchema
 * @throws {!lfException}
 * @private
 */
lf.cache.Journal.prototype.checkScope_ = function(tableSchema) {
  if (!this.scope_.containsKey(tableSchema.getName())) {
    throw new lf.Exception(
        lf.Exception.Type.SCOPE_ERROR,
        tableSchema.getName() + ' is not in the journal\'s scope.');
  }
};
