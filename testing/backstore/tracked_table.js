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
goog.provide('lf.testing.backstore.TrackedTable');

goog.require('goog.Promise');
goog.require('lf.Exception');
goog.require('lf.Table');
goog.require('lf.cache.TableDiff');
goog.require('lf.structs.map');



/**
 * @constructor @struct
 * @implements {lf.Table}
 *
 * @param {!lf.Table} table
 * @param {string} tableName
 */
lf.testing.backstore.TrackedTable = function(table, tableName) {
  /** @private {!lf.Table} */
  this.table_ = table;

  /**
   * The changes that have been applied on this table since the start of the
   * owning transaction.
   * @private {!lf.cache.TableDiff}
   */
  this.tableDiff_ = new lf.cache.TableDiff(tableName);

  /**
   * A list of all async operations that have been spawned for this table.
   * @private {!Array<!IThenable>}
   */
  this.requests_ = [];

  /** @private {boolean} */
  this.acceptingRequests_ = true;
};


/** @return {!IThenable} */
lf.testing.backstore.TrackedTable.prototype.whenRequestsDone = function() {
  this.acceptingRequests_ = false;
  return goog.Promise.all(this.requests_);
};


/** @return {!lf.cache.TableDiff} */
lf.testing.backstore.TrackedTable.prototype.getDiff = function() {
  return this.tableDiff_;
};


/**
 * @throws {lf.Exception}
 * @private
 */
lf.testing.backstore.TrackedTable.prototype.checkAcceptingRequests_ =
    function() {
  if (!this.acceptingRequests_) {
    // 107: Invalid transaction state transition: {0} -> {1}.
    throw new lf.Exception(107, 7, 0);
  }
};


/** @override */
lf.testing.backstore.TrackedTable.prototype.get = function(ids) {
  try {
    this.checkAcceptingRequests_();
  } catch (e) {
    return goog.Promise.reject(e);
  }

  var promise = this.table_.get(ids);
  this.requests_.push(promise);
  return promise;
};


/** @override */
lf.testing.backstore.TrackedTable.prototype.put = function(rows) {
  try {
    this.checkAcceptingRequests_();
  } catch (e) {
    return goog.Promise.reject(e);
  }

  var rowMap = lf.structs.map.create();
  rows.forEach(function(row) {
    rowMap.set(row.id(), row);
  });

  var promise = this.get(lf.structs.map.keys(rowMap)).then(
      function(existingRows) {
        // First update the diff with the existing rows that are modified.
        existingRows.forEach(function(existingRow) {
          this.tableDiff_.modify([existingRow, rowMap.get(existingRow.id())]);
          rowMap.delete(existingRow.id());
        }, this);

        // Then update the diff with the remaining items in the map, all of
        // which correspond to new rows.
        rowMap.forEach(function(row, rowId) {
          this.tableDiff_.add(row);
        }, this);

        return this.table_.put(rows);
      }.bind(this));

  this.requests_.push(promise);
  return promise;
};


/** @override */
lf.testing.backstore.TrackedTable.prototype.remove = function(ids) {
  try {
    this.checkAcceptingRequests_();
  } catch (e) {
    return goog.Promise.reject(e);
  }

  var promise = this.table_.get(ids).then(function(rows) {
    rows.forEach(function(row) {
      this.tableDiff_.delete(row);
    }, this);

    return this.table_.remove(ids);
  }.bind(this));

  this.requests_.push(promise);
  return promise;
};
