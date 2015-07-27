/**
 * @license
 * Copyright 2014 The Lovefield Project Authors. All Rights Reserved.
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
goog.provide('lf.backstore.MemoryTable');

goog.require('goog.Promise');
goog.require('lf.Table');
goog.require('lf.structs.map');

goog.forwardDeclare('lf.Row');



/**
 * @constructor @struct
 * @implements {lf.Table}
 */
lf.backstore.MemoryTable = function() {
  /**
   * @private {!lf.structs.Map<number, !lf.Row>}
   */
  this.data_ = lf.structs.map.create();
};


/**
 * @param {!Array<number>} ids
 * @return {!Array<!lf.Row>}
 */
lf.backstore.MemoryTable.prototype.getSync = function(ids) {
  // Empty array is treated as "return all rows".
  if (ids.length == 0) {
    return lf.structs.map.values(this.data_);
  }

  var results = [];
  ids.forEach(function(id) {
    var row = this.data_.get(id) || null;
    if (!goog.isNull(row)) {
      results.push(row);
    }
  }, this);

  return results;
};


/** @return {!lf.structs.Map<number, !lf.Row>} */
lf.backstore.MemoryTable.prototype.getData = function() {
  return this.data_;
};


/** @override */
lf.backstore.MemoryTable.prototype.get = function(ids) {
  return goog.Promise.resolve(this.getSync(ids));
};


/** @param {!Array<!lf.Row>} rows */
lf.backstore.MemoryTable.prototype.putSync = function(rows) {
  rows.forEach(function(row) {
    this.data_.set(row.id(), row);
  }, this);
};


/** @override */
lf.backstore.MemoryTable.prototype.put = function(rows) {
  this.putSync(rows);
  return goog.Promise.resolve();
};


/** @param {!Array<number>} ids */
lf.backstore.MemoryTable.prototype.removeSync = function(ids) {
  if (ids.length == 0 || ids.length == this.data_.size) {
    // Remove all.
    this.data_.clear();
  } else {
    ids.forEach(function(id) {
      this.data_.delete(id);
    }, this);
  }
};


/** @override */
lf.backstore.MemoryTable.prototype.remove = function(ids) {
  this.removeSync(ids);
  return goog.Promise.resolve();
};


/** @return {number} */
lf.backstore.MemoryTable.prototype.getMaxRowId = function() {
  if (this.data_.size == 0) {
    return 0;
  }
  return lf.structs.map.keys(this.data_).reduce(function(prev, cur) {
    return prev > cur ? prev : cur;
  }, 0);
};
