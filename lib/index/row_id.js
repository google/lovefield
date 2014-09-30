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
goog.provide('lf.index.RowId');

goog.require('goog.structs.Set');
goog.require('lf.Exception');
goog.require('lf.index.Index');
goog.require('lf.index.KeyRange');



/**
 * This is actually the row id set for a given table, but in the form of
 * lf.index.Index.
 * @implements {lf.index.Index}
 * @constructor
 * @struct
 * @final
 */
lf.index.RowId = function() {
  /** @private {!goog.structs.Set.<!lf.index.Index.Key>} */
  this.rows_ = new goog.structs.Set();
};


/** @override */
lf.index.RowId.prototype.getName = function() {
  return '##row_id##';
};


/** @override */
lf.index.RowId.prototype.add = function(key, value) {
  if (typeof(key) != 'number') {
    throw new lf.Exception(lf.Exception.Type.DATA, 'Row id must be numbers');
  }
  this.rows_.add(key);
};


/** @override */
lf.index.RowId.prototype.set = function(key, value) {
  this.add(key, value);
};


/** @override */
lf.index.RowId.prototype.remove = function(key, rowId) {
  this.rows_.remove(key);
};


/** @override */
lf.index.RowId.prototype.get = function(key) {
  return this.containsKey(key) ? [key] : [];
};


/** @override */
lf.index.RowId.prototype.cost = function(opt_keyRange) {
  // Give the worst case so that this index is not used unless necessary.
  return this.rows_.getCount();
};


/** @override */
lf.index.RowId.prototype.getRange = function(opt_keyRange) {
  var keyRange = opt_keyRange || lf.index.KeyRange.all();

  if ((goog.isDefAndNotNull(keyRange.from) &&
      typeof(keyRange.from) != 'number') ||
      (goog.isDefAndNotNull(keyRange.to) && typeof(keyRange.to) != 'number')) {
    throw new lf.Exception(lf.Exception.Type.DATA, 'Row id must be numbers');
  }
  return this.rows_.getValues().filter(keyRange.getComparator());
};


/** @override */
lf.index.RowId.prototype.clear = function() {
  this.rows_.clear();
};


/** @override */
lf.index.RowId.prototype.containsKey = function(key) {
  return this.rows_.contains(key);
};
