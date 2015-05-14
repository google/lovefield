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
goog.provide('lf.index');


/**
 * Java's String.hashCode method.
 *
 * for each character c in string
 *   hash = hash * 31 + c
 *
 * @param {string} value
 * @return {number}
 */
lf.index.hashCode = function(value) {
  var hash = 0;
  for (var i = 0; i < value.length; ++i) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash = hash & hash;  // Convert to 32-bit integer.
  }
  return hash;
};


/**
 * Compute hash key for an array.
 * @param {!Array<Object>} values
 * @return {string}
 */
lf.index.hashArray = function(values) {
  var keys = values.map(function(value) {
    return goog.isDefAndNotNull(value) ?
        lf.index.hashCode(value.toString()).toString(32) : '';
  });

  return keys.join('_');
};


/**
 * Slice result array by limit and skip.
 * Note: For performance reasons the input array might be modified in place.
 *
 * @param {!Array<number>} rawArray
 * @param {boolean=} opt_reverseOrder
 * @param {number=} opt_limit
 * @param {number=} opt_skip
 * @return {!Array<number>}
 */
lf.index.slice = function(rawArray, opt_reverseOrder, opt_limit, opt_skip) {
  var array = opt_reverseOrder ? rawArray.reverse() : rawArray;

  // First handling case where no limit and no skip parameters have been
  // specified, such that no copying of the input array is performed. This is an
  // optimization such that unnecessary copying can be avoided for the majority
  // case (no limit/skip params).
  if (!goog.isDefAndNotNull(opt_limit) && !goog.isDefAndNotNull(opt_skip)) {
    return array;
  }

  // Handling case where at least one of limit/skip parameters has been
  // specified. The input array will have to be sliced.
  var limit = Math.min(
      goog.isDef(opt_limit) ? opt_limit : array.length,
      array.length);
  if (limit == 0) {
    return [];
  }

  var skip = Math.min(opt_skip || 0, array.length);

  return array.slice(skip, skip + limit);
};
