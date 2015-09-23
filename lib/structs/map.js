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
goog.provide('lf.structs.Map');
goog.provide('lf.structs.map');

goog.require('goog.structs.Map');
goog.require('lf.Capability');
goog.require('lf.Flags');

goog.scope(function() {


/**
 * This is just a partial polyfill, it does not support operator [] and three
 * methods entries, keys and values.
 * @template KEY, VALUE
 * @private
 */
lf.structs.MapPolyFill_ = goog.defineClass(null, {
  constructor: function() {
    /** @private {!goog.structs.Map} */
    this.map_ = new goog.structs.Map();

    Object.defineProperty(this, 'size', {
      /** @this {lf.structs.MapPolyFill_} */
      get: function() {
        return this.map_.getCount();
      }
    });
  },


  /**
   * @export
   */
  clear: function() {
    this.map_.clear();
  },


  /**
   * @param {KEY} key
   * @return {boolean}
   * @export
   */
  delete: function(key) {
    return this.map_.remove(key);
  },


  /**
   * @param {function(this:THIS, VALUE, KEY):void} callback
   * @param {THIS=} opt_thisArg
   * @template THIS
   * @export
   */
  forEach: function(callback, opt_thisArg) {
    return this.map_.forEach(callback, opt_thisArg);
  },


  /**
   * @param {KEY} key
   * @return {VALUE|undefined}
   * @export
   */
  get: function(key) {
    return this.map_.get(key);
  },


  /**
   * @param {KEY} key
   * @return {boolean}
   * @export
   */
  has: function(key) {
    return this.map_.containsKey(key);
  },


  /**
   * @param {KEY} key
   * @param {VALUE} value
   * @export
   */
  set: function(key, value) {
    return this.map_.set(key, value);
  }
});


/**
 * Must be placed after lf.structs.MapPolyFill_, otherwise IE will evaluate
 * lf.structs.Map as undefined.
 * @typedef {!lf.structs.MapPolyFill_|!Map}
 */
lf.structs.Map;


/**
 * @return {boolean} True if the native Map implementation should be used, false
 *     if the polyfill should be used.
 */
function detectUseNative() {
  return lf.Flags.NATIVE_ES6 || lf.Capability.get().nativeMap;
}


/**
 * Caching the result of feature detection such that feature detection is not
 * repeated every time a lf.structs.map.create is called.
 * @const {boolean}
 */
var USE_NATIVE = detectUseNative();


/**
 * @return {!lf.structs.Map<KEY, VALUE>}
 * @template KEY, VALUE
 */
lf.structs.map.create = function() {
  return USE_NATIVE ? new window.Map() : new lf.structs.MapPolyFill_();
};


/**
 * Return the keys of the map.
 * @param {!lf.structs.Map<KEY, VALUE>} map
 * @return {!Array<KEY>} the keys.
 * @template KEY, VALUE
 */
lf.structs.map.keys = function(map) {
  if (map instanceof lf.structs.MapPolyFill_) {
    return map.map_.getKeys();
  } else {
    var i = 0;
    var array = new Array(map.size);
    map.forEach(function(v, k) { array[i++] = k; });
    return array;
  }
};


/**
 * Return the values of the map.
 * @param {!lf.structs.Map<KEY, VALUE>} map
 * @return {!Array<VALUE>} the values.
 * @template KEY, VALUE
 */
lf.structs.map.values = function(map) {
  if (map instanceof lf.structs.MapPolyFill_) {
    return map.map_.getValues();
  } else {
    var i = 0;
    var array = new Array(map.size);
    map.forEach(function(v, k) { array[i++] = v; });
    return array;
  }
};

});  // goog.scope
