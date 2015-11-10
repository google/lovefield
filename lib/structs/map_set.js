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
goog.provide('lf.structs.MapSet');

goog.require('lf.structs.map');
goog.require('lf.structs.set');



/**
 * A MapSet maps a key to a set of values, without allowing duplicate entries
 * for a given key. Keys have to be of type string.
 * @constructor
 * @struct
 * @template KEY, VALUE
 */
lf.structs.MapSet = function() {
  /**
   * A map where each key is associated with a set of values.
   * @private {!lf.structs.Map<KEY, !lf.structs.Set<!VALUE>>}
   */
  this.map_ = lf.structs.map.create();

  /**
   * The total number of entries in this MapSet.
   * @type {number}
   */
  this.size = 0;
};


/**
 * Returns existence of a given key.
 * @param {KEY} key The key.
 * @return {boolean}
 */
lf.structs.MapSet.prototype.has = function(key) {
  return this.map_.has(key);
};


/**
 * Associates a value with a key.
 * @param {KEY} key The key.
 * @param {VALUE} value The value.
 * @return {!lf.structs.MapSet<KEY, VALUE>} This object for cascading.
 */
lf.structs.MapSet.prototype.set = function(key, value) {
  var valueSet = this.map_.get(key) || null;
  if (goog.isNull(valueSet)) {
    valueSet = lf.structs.set.create();
    this.map_.set(key, valueSet);
  }
  if (!valueSet.has(value)) {
    valueSet.add(value);
    this.size++;
  }
  return this;
};


/**
 * Associates a value with a key.
 * @param {KEY} key The key.
 * @param {!Array<VALUE>} values The value.
 * @return {!lf.structs.MapSet<KEY, VALUE>} This object for cascading.
 */
lf.structs.MapSet.prototype.setMany = function(key, values) {
  var valueSet = this.map_.get(key) || null;
  if (goog.isNull(valueSet)) {
    valueSet = lf.structs.set.create();
    this.map_.set(key, valueSet);
  }
  values.forEach(function(value) {
    if (!valueSet.has(value)) {
      valueSet.add(value);
      this.size++;
    }
  }, this);
  return this;
};


/**
 * Merges another SetMap into this one.
 * @param {!lf.structs.MapSet<KEY, VALUE>} mapSet
 * @return {!lf.structs.MapSet<KEY, VALUE>} This object for cascading.
 */
lf.structs.MapSet.prototype.merge = function(mapSet) {
  mapSet.keys().forEach(function(key) {
    var values = /** @type {!Array} */ (mapSet.get(key));
    this.setMany(key, values);
  }, this);
  return this;
};


/**
 * Removes a value associated with the given key.
 * @param {KEY} key The key to remove the value for.
 * @param {VALUE} value The value to be removed.
 * @return {boolean} Whether the map was modified.
 */
lf.structs.MapSet.prototype.delete = function(key, value) {
  var valueSet = this.map_.get(key) || null;
  if (goog.isNull(valueSet)) {
    return false;
  }

  var didRemove = valueSet.delete(value);
  if (didRemove) {
    this.size -= 1;
    if (valueSet.size == 0) {
      this.map_.delete(key);
    }
  }

  return didRemove;
};


/**
 * @param {KEY} key The key to look up.
 * @return {?Array<VALUE>} The values associated with the key, or null if no
 *     values were found.
 */
lf.structs.MapSet.prototype.get = function(key) {
  var valueSet = this.map_.get(key) || null;
  return goog.isNull(valueSet) ? null : lf.structs.set.values(valueSet);
};


/** Clears the map. */
lf.structs.MapSet.prototype.clear = function() {
  this.map_.clear();
  this.size = 0;
};


/** @return {!Array<KEY>} The keys of the map. */
lf.structs.MapSet.prototype.keys = function() {
  return lf.structs.map.keys(this.map_);
};


/** @return {!Array<VALUE>} The values of the map. */
lf.structs.MapSet.prototype.values = function() {
  var results = [];
  this.map_.forEach(function(valueSet, key) {
    results.push.apply(results, lf.structs.set.values(valueSet));
  });
  return results;
};
