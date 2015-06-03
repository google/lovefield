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
goog.provide('lf.structs.Set');

goog.require('goog.structs.Set');


/**
 * This is just a partial polyfill, it does not support operator [] due to
 * language constraints.
 * @template VALUE
 * @private
 */
lf.structs.SetPolyFill_ = goog.defineClass(null, {
  constructor: function() {
    /** @private {!goog.structs.Set} */
    this.set_ = new goog.structs.Set();

    Object.defineProperty(this, 'size', {
      get: function() {
        return this.set_.getCount();
      }
    });
  },


  /**
   * @param {VALUE} value
   * @return {void}
   * @export
   */
  add: function(value) {
    this.set_.add(value);
  },


  /**
   * @return {void}
   * @export
   */
  clear: function() {
    this.set_.clear();
  },


  /**
   * @param {VALUE} value
   * @return {boolean}
   * @export
   */
  delete: function(value) {
    return this.set_.remove(value);
  },


  /**
   * @param {VALUE} value
   * @return {boolean}
   * @export
   */
  has: function(value) {
    return this.set_.contains(value);
  }
});


/**
 * Must be placed after lf.structs.SetPolyFill_, otherwise IE will evaluate
 * lf.structs.Set as undefined.
 */
lf.structs.Set =
    (goog.isDef(window.Set) && goog.isDef(window.Set.prototype.values)) ?
        window.Set :
        lf.structs.SetPolyFill_;

