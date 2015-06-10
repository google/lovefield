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
goog.provide('lf.structs.set');

goog.require('goog.structs.Set');


/**
 * This is just a partial polyfill, it does not support operator [] and
 * three methods entries, values and forEach.
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
 * @typedef {!lf.structs.SetPolyFill_|!Set}
 */
lf.structs.Set = (function() {
  return (window.Set &&
      window.Set.prototype.values &&
      window.Set.prototype.forEach) ?
      window.Set : lf.structs.SetPolyFill_;
})();


/**
 * Creation helper, only needed within this file to avoid compiler error about
 * lf.structs.Set not being required (apparently compiler ignores the fact that
 * it is provided in this file).
 * @return {!lf.structs.Set}
 * @private
 */
lf.structs.set.create_ = function() {
  var constructorFn =
      (window.Set &&
       window.Set.prototype.values &&
       window.Set.prototype.forEach) ?
      window.Set :
      lf.structs.SetPolyFill_;
  return new constructorFn();
};


/**
 * Returns the values of the set.
 * @param {!lf.structs.Set<VALUE>} set The set to get values from.
 * @return {!Array<VALUE>} The values in the set.
 * @template VALUE
 */
lf.structs.set.values = function(set) {
  if (set instanceof lf.structs.SetPolyFill_) {
    return set.set_.getValues();
  } else {
    var i = 0;
    var array = new Array(set.size);
    set.forEach(function(v) { array[i++] = v; });
    return array;
  }
};


/**
 * Returns the difference between two sets.
 * @param {!lf.structs.Set<VALUE>} set1
 * @param {!lf.structs.Set<VALUE>} set2
 * @return {!lf.structs.Set<VALUE>} A new set containing all the values
 *     (primitives or objects) present in set1 but not in set2.
 * @template VALUE
 */
lf.structs.set.diff = function(set1, set2) {
  if (set1 instanceof lf.structs.SetPolyFill_) {
    var result = new lf.structs.SetPolyFill_();
    result.set_ = set1.set_.difference(set2.set_);
    return result;
  } else {
    var result = lf.structs.set.create_();
    lf.structs.set.values(set1).forEach(function(v) {
      if (!set2.has(v)) {
        result.add(v);
      }
    });
    return result;
  }
};
