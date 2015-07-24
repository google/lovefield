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
goog.provide('lf.index.NullableIndex');

goog.require('lf.Exception');
goog.require('lf.Row');
goog.require('lf.index.Index');
goog.require('lf.index.Stats');
goog.require('lf.structs.set');



/**
 * Wraps another index which does not support NULL to accept NULL values.
 * @implements {lf.index.Index}
 * @constructor @struct
 * @final
 *
 * @param {!lf.index.Index} index The index to be wrapped.
 */
lf.index.NullableIndex = function(index) {
  /** @private {!lf.index.Index} */
  this.index_ = index;

  /** @private {!lf.structs.Set<number>} */
  this.nulls_ = lf.structs.set.create();

  /** @private {!lf.index.Stats} */
  this.statsNull_ = new lf.index.Stats();

  /** @private {!lf.index.Stats} */
  this.stats_ = new lf.index.Stats();
};


/** @override */
lf.index.NullableIndex.prototype.getName = function() {
  return this.index_.getName();
};


/** @override */
lf.index.NullableIndex.prototype.add = function(key, value) {
  if (goog.isNull(key)) {
    // Note: Nullable index allows multiple nullable keys even if it is marked
    // as unique. This is matching the behavior of other SQL engines.
    this.nulls_.add(value);
    this.statsNull_.add(key, 1);
  } else {
    this.index_.add(key, value);
  }
};


/** @override */
lf.index.NullableIndex.prototype.set = function(key, value) {
  if (goog.isNull(key)) {
    this.nulls_.clear();
    this.statsNull_.clear();
    this.add(key, value);
  } else {
    this.index_.set(key, value);
  }
};


/** @override */
lf.index.NullableIndex.prototype.remove = function(key, opt_rowId) {
  if (goog.isNull(key)) {
    if (opt_rowId) {
      this.nulls_.delete(opt_rowId);
      this.statsNull_.remove(key, 1);
    } else {
      this.nulls_.clear();
      this.statsNull_.clear();
    }
  } else {
    this.index_.remove(key, opt_rowId);
  }
};


/** @override */
lf.index.NullableIndex.prototype.get = function(key) {
  if (goog.isNull(key)) {
    return lf.structs.set.values(this.nulls_);
  } else {
    return this.index_.get(key);
  }
};


/** @override */
lf.index.NullableIndex.prototype.cost = function(opt_keyRange) {
  return this.index_.cost(opt_keyRange);
};


/** @override */
lf.index.NullableIndex.prototype.stats = function() {
  this.stats_.updateFromList([this.index_.stats(), this.statsNull_]);
  return this.stats_;
};


/** @override */
lf.index.NullableIndex.prototype.getRange = function(
    opt_keyRanges, opt_reverseOrder, opt_limit, opt_skip) {
  var results = this.index_.getRange(
      opt_keyRanges, opt_reverseOrder, opt_limit, opt_skip);
  if (goog.isDefAndNotNull(opt_keyRanges)) {
    return results;
  }

  return results.concat(lf.structs.set.values(this.nulls_));
};


/** @override */
lf.index.NullableIndex.prototype.clear = function() {
  this.nulls_.clear();
  this.index_.clear();
};


/** @override */
lf.index.NullableIndex.prototype.containsKey = function(key) {
  return goog.isNull(key) ?
      this.nulls_.size != 0 :
      this.index_.containsKey(key);
};


/** @override */
lf.index.NullableIndex.prototype.min = function() {
  return this.index_.min();
};


/** @override */
lf.index.NullableIndex.prototype.max = function() {
  return this.index_.max();
};


/**
 * @const {number}
 * @private
 */
lf.index.NullableIndex.NULL_ROW_ID_ = -2;


/** @override */
lf.index.NullableIndex.prototype.serialize = function() {
  var rows = [
    new lf.Row(
        lf.index.NullableIndex.NULL_ROW_ID_,
        lf.structs.set.values(this.nulls_))
  ];
  return rows.concat(this.index_.serialize());
};


/** @override */
lf.index.NullableIndex.prototype.comparator = function() {
  return this.index_.comparator();
};


/**
 * Creates tree from serialized format.
 * @param {!function(!Array<!lf.Row>): !lf.index.Index} deserializeFn The
 *     function that is used to deserialize the embedded tree.
 * @param {!Array<!lf.Row>} rows
 * @return {!lf.index.NullableIndex}
 */
lf.index.NullableIndex.deserialize = function(deserializeFn, rows) {
  // Ideally, the special row should be the first one, and we can short cut.
  var index = -1;
  for (var i = 0; i < rows.length; ++i) {
    if (rows[i].id() == lf.index.NullableIndex.NULL_ROW_ID_) {
      index = i;
      break;
    }
  }
  if (index == -1) {
    // 102: Data corruption detected.
    throw new lf.Exception(102);
  }

  var nulls = rows[index].payload();
  var newRows = rows.slice(0);
  newRows.splice(index, 1);
  var tree = deserializeFn(newRows);
  var nullableIndex = new lf.index.NullableIndex(tree);
  nulls.forEach(function(rowId) {
    nullableIndex.nulls_.add(rowId);
  });
  return nullableIndex;
};


/** @override */
lf.index.NullableIndex.prototype.isUniqueKey = function() {
  return this.index_.isUniqueKey();
};
