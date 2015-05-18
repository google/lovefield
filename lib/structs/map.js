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
goog.module('lf.structs.Map');
goog.module.declareLegacyNamespace();

var googMap = goog.require('goog.structs.Map');



/**
 * This is just a partial polyfill, it does not support operator [] due to
 * language constraints.
 * @template KEY, VALUE
 */
var MapPolyFill = goog.defineClass(null, {
  constructor: function() {
    /** @private {!googMap} */
    this.map_ = new googMap();

    Object.defineProperty(this, 'size', {
      get: function() {
        return this.map_.getCount();
      }
    });
  },

  /**
   * @return {void}
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
   * @return {!Iterator<!Array<KEY|VALUE>>}
   * @export
   */
  entries: function() {
    return /** @type {!Iterator<!Array<KEY|VALUE>>} */ (
        this.map_.__iterator__());
  },


  /**
   * @param {function(this:THIS, VALUE, KEY, MAP):void} callback
   * @param {THIS=} opt_thisArg
   * @this {MAP}
   * @template MAP,THIS
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
   * @return {!Iterator<KEY>}
   * @export
   */
  keys: function() {
    return /** @type {!Iterator<KEY>} */ (this.map_.getKeyIterator());
  },


  /**
   * @param {KEY} key
   * @param {VALUE} value
   * @export
   */
  set: function(key, value) {
    return this.map_.set(key, value);
  },


  /**
   * @return {!Iterator<VALUE>}
   * @export
   */
  values: function() {
    return /** @type {!Iterator<VALUE>} */ (this.map_.getValueIterator());
  }
});



/**
 * Must be placed after lf.structs.MapPolyFill_, otherwise IE will evaluate
 * lf.structs.Map as undefined.
 */
exports = (goog.isDef(window.Map) && goog.isDef(window.Map.prototype.keys)) ?
    window.Map :
    MapPolyFill;
