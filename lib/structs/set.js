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
goog.require('lf.Capability');
goog.require('lf.Flags');


goog.scope(function() {


/**
 * This is just a partial polyfill, it does not support operator [] and
 * three methods entries, values and forEach.
 * @template VALUE
 * @private
 */
lf.structs.SetPolyFill_ = goog.defineClass(null, {
  /**
   * @param {!Array<VALUE>=} opt_values Initial values to start with.
   */
  constructor: function(opt_values) {
    /** @private {!goog.structs.Set} */
    this.set_ = new goog.structs.Set(opt_values);
    Object.defineProperty(this, 'size', {
      /** @this {lf.structs.SetPolyFill_} */
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
   * @param {function(this:THIS, VALUE)} fn
   * @param {THIS=} opt_this The value of "this" inside fn.
   * @template THIS
   */
  forEach: function(fn, opt_this) {
    this.set_.getValues().forEach(fn, opt_this);
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
lf.structs.Set;


/**
 * @return {boolean} True if the native Set implementation should be used, false
 *     if the polyfill should be used.
 */
function detectUseNative() {
  return lf.Flags.NATIVE_ES6 || lf.Capability.get().nativeSet;
}


/**
 * Caching the result of feature detection such that feature detection is not
 * repeated every time a lf.structs.set.create is called.
 * @const {boolean}
 */
var USE_NATIVE = detectUseNative();


/**
 * Note: Safari has issues with native Set, therefore we still need polyfill.
 *
 * var a = function() { this.b = 123; };
 * var x = new a();
 * var d = new Set(undefined);  // Safari creates an 1-element set [undefined].
 * var c = new Set([x]);
 * c.forEach(function(e) { if (!(e instanceof a)) throw new Error(); });
 * // Safari strips out prototype info and throws.
 *
 * @param {!Array<T>=} opt_iterable
 * @return {!lf.structs.Set<T>}
 * @template T
 */
lf.structs.set.create = function(opt_iterable) {
  if (USE_NATIVE) {
    return goog.isDef(opt_iterable) ?
        new window.Set(opt_iterable) : new window.Set();
  } else {
    return new lf.structs.SetPolyFill_(opt_iterable);
  }
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
    var result = lf.structs.set.create();
    lf.structs.set.values(set1).forEach(function(v) {
      if (!set2.has(v)) {
        result.add(v);
      }
    });
    return result;
  }
};


/**
 * @param {!lf.structs.Set<VALUE>} set1
 * @param {!lf.structs.Set<VALUE>} set2
 * @return {boolean} Whether set2 is a subset of set1.
 * @template VALUE
 */
lf.structs.set.isSubset = function(set1, set2) {
  if (set2.size > set1.size) {
    return false;
  }

  var result = true;
  set2.forEach(function(value) {
    result = result && set1.has(value);
  });
  return result;
};


/**
 * @param {!lf.structs.Set<VALUE>} set1
 * @param {!lf.structs.Set<VALUE>} set2
 * @return {boolean}
 * @template VALUE
 */
lf.structs.set.equals = function(set1, set2) {
  return set1.size == set2.size && lf.structs.set.isSubset(set1, set2);
};

});  // goog.scope
