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
goog.provide('lf.index.Map');

goog.require('goog.structs.Map');
goog.require('goog.structs.Set');
goog.require('lf.index.Index');
goog.require('lf.index.KeyRange');



/**
 * A key-value map index based on goog.structs.Map.
 * @param {string} name
 * @implements {lf.index.Index}
 * @constructor
 * @struct
 */
lf.index.Map = function(name) {
  /** @private {string} */
  this.name_ = name;

  /**
   * @private {!goog.structs.Map.<!lf.index.Index.Key,
   *     !goog.structs.Set.<number>>} */
  this.map_ = new goog.structs.Map();
};


/** @override */
lf.index.Map.prototype.getName = function() {
  return this.name_;
};


/** @override */
lf.index.Map.prototype.add = function(key, value) {
  var values = this.map_.get(key, new goog.structs.Set());
  values.add(value);
  this.map_.set(key, values);
};


/** @override */
lf.index.Map.prototype.set = function(key, value) {
  this.map_.set(key, new goog.structs.Set([value]));
};


/** @override */
lf.index.Map.prototype.remove = function(key, opt_rowId) {
  var set = this.map_.get(key);
  if (goog.isDefAndNotNull(set)) {
    if (goog.isDefAndNotNull(opt_rowId)) {
      set.remove(opt_rowId);
    } else {
      set.clear();
    }
    if (set.getCount() == 0) {
      this.map_.remove(key);
    }
  }
};


/** @override */
lf.index.Map.prototype.get = function(key) {
  var set = this.map_.get(key);
  return goog.isDefAndNotNull(set) ? set.getValues() : [];
};


/** @override */
lf.index.Map.prototype.cost = function(opt_keyRange) {
  // TODO(user): Calculating the cost should be O(1), instead of searching the
  // index itself.
  return this.getRange(opt_keyRange).length;
};


/** @override */
lf.index.Map.prototype.getRange = function(opt_keyRange) {
  var results = [];

  var keyRange = opt_keyRange || lf.index.KeyRange.all();
  var comparator = keyRange.getComparator();

  this.map_.getKeys().sort().forEach(function(key) {
    if (comparator(key)) {
      results = results.concat(this.get(key));
    }
  }, this);

  return results;
};


/** @override */
lf.index.Map.prototype.clear = function() {
  return this.map_.clear();
};


/** @override */
lf.index.Map.prototype.containsKey = function(key) {
  return this.map_.containsKey(key);
};
