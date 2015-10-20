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
goog.provide('lf.index.Comparator');
goog.provide('lf.index.Favor');
goog.provide('lf.index.Index');

goog.forwardDeclare('lf.Order');
goog.forwardDeclare('lf.Row');
goog.forwardDeclare('lf.index.SingleKeyRange');
goog.forwardDeclare('lf.index.Stats');


/**
 * The comparison result constant. This must be consistent with the constant
 * required by the sort function of Array.prototype.sort.
 * @enum {number}
 */
lf.index.Favor = {
  RHS: -1,  // favors right hand side, i.e. lhs < rhs
  TIE: 0,  // no favorite, i.e. lhs == rhs
  LHS: 1    // favors left hand side, i.e. lhs > rhs
};



/**
 * Comparator used to provide necessary information for building an index tree.
 * It offers methods to indicate which operand is "favorable".
 *
 * @template KeyType, RangeType
 * @interface
 */
lf.index.Comparator = function() {};


/**
 * @param {KeyType} lhs
 * @param {KeyType} rhs
 * @return {!lf.index.Favor}
 */
lf.index.Comparator.prototype.compare;


/**
 * Returns an array of boolean which represents the relative positioning of
 * a key to a range. The concept is to project both the key and the range onto
 * the 1-D space. The returned array is in the form of [left, right]. If the
 * range projection covers any value left/right of the key (including the key
 * itself), then left/right will be set to true.
 * @param {KeyType} key
 * @param {RangeType} range
 * @return {!Array<boolean>}
 */
lf.index.Comparator.prototype.compareRange;


/**
 * Finds which one of the two operands is the minimum in absolute terms.
 * @param {KeyType} lhs
 * @param {KeyType} rhs
 * @return {!lf.index.Favor}
 */
lf.index.Comparator.prototype.min;


/**
 * Finds which one of the two operands is the maximum in absolute terms.
 * @param {KeyType} lhs
 * @param {KeyType} rhs
 * @return {!lf.index.Favor}
 */
lf.index.Comparator.prototype.max;


/**
 * @param {KeyType} key
 * @param {RangeType} range
 * @return {boolean}
 */
lf.index.Comparator.prototype.isInRange;


/**
 * Whether the key's first dimension is in range's first dimension or not.
 * For example, a key pair is [3, 5] and the range is [gt(3), gt(2)]. The B-Tree
 * shall stop looping when the first key is out of range since the tree is
 * sorted by first dimension.
 * @param {KeyType} key
 * @param {RangeType} range
 * @return {boolean}
 */
lf.index.Comparator.prototype.isFirstKeyInRange;


/**
 * Returns a range that represents all data.
 * @return {RangeType}
 */
lf.index.Comparator.prototype.getAllRange;


/**
 * Binds unbound values to given key ranges, and sorts them so that these ranges
 * will be in the order from left to right.
 * @param {!Array<RangeType>} keyRanges When provided, any two ranges
 *     inside the key ranges array shall not overlap each other.
 * @return {!Array<RangeType>} A new array containing bounded ranges, sorted by
 *     comparator's order from left-most to right-most.
 */
lf.index.Comparator.prototype.sortKeyRanges;


/**
 * Returns true if the given range is open ended on the left-hand-side.
 * @param {RangeType} range
 * @return {boolean}
 */
lf.index.Comparator.prototype.isLeftOpen;


/**
 * Converts key range to keys.
 * @param {RangeType} range Normalized key range.
 * @return {!Array<KeyType>} An array of two keys, [left-most, right-most]
 */
lf.index.Comparator.prototype.rangeToKeys;


/**
 * Returns false if any dimension of the key contains null.
 * @param {KeyType} key
 * @return {boolean}
 */
lf.index.Comparator.prototype.comparable;


/**
 * Returns number of key dimensions.
 * @return {number}
 */
lf.index.Comparator.prototype.keyDimensions;



/**
 * Single key to row id(s) index.
 * @interface
 */
lf.index.Index = function() {};


/** @typedef {string|number|null} */
lf.index.Index.SingleKey;


/** @typedef {!lf.index.Index.SingleKey|!Array<!lf.index.Index.SingleKey>} */
lf.index.Index.Key;


/** @return {string} Normalized name for this index. */
lf.index.Index.prototype.getName;


/**
 * Inserts data into index. If the key already existed, append value to the
 * value list. If the index does not support duplicate keys, adding duplicate
 * keys will result in throwing CONSTRAINT error.
 * @param {?lf.index.Index.Key} key
 * @param {number} value
 * @throws {lf.Exception}
 */
lf.index.Index.prototype.add;


/**
 * Replaces data in index. All existing data for that key will be purged.
 * If the key is not found, inserts the data.
 * @param {?lf.index.Index.Key} key
 * @param {number} value
 */
lf.index.Index.prototype.set;


/**
 * Deletes a row having given key from index. If not found return silently.
 * @param {?lf.index.Index.Key} key
 * @param {number=} opt_rowId Delete a single row id when the index allows
 *     duplicate keys. Ignored for index supporting only unique keys.
 */
lf.index.Index.prototype.remove;


/**
 * Gets values from index. Returns empty array if not found.
 * @param {?lf.index.Index.Key} key
 * @return {!Array<number>}
 */
lf.index.Index.prototype.get;


/**
 * Gets the cost of retrieving data for given range.
 * @param {(!lf.index.SingleKeyRange|!lf.index.KeyRange)=} opt_keyRange The key
 *     range to search for. If not provided, the cost will be equal to the
 *     number of rows in the index.
 * @return {number}
 */
lf.index.Index.prototype.cost;


/**
 * Retrieves all data within the range. Returns empty array if not found.
 * @param {(!Array<!lf.index.SingleKeyRange>|!Array<!lf.index.KeyRange>)=}
 *     opt_keyRanges The key ranges to search for. When multiple key ranges are
 *     specified, the function will return the union of range query results.
 *     If none provided, all rowIds in this index will be returned. Caller must
 *     ensure the ranges do not overlap.
 * @param {!boolean=} opt_reverseOrder Retrive the results in the reverse
 *     ordering of the index's comparator.
 * @param {number=} opt_limit Max number of rows to return
 * @param {number=} opt_skip Skip first N rows
 * @return {!Array<number>}
 */
lf.index.Index.prototype.getRange;


/**
 * Removes everything from the tree.
 * @type {function()}
 */
lf.index.Index.prototype.clear;


/**
 * Special note for NULL: if the given index disallows NULL as key (e.g. B-Tree,
 * AA-Tree), the containsKey will return garbage. Caller needs to be aware of
 * the behavior of the given index (this shall not be a problem with indices
 * that are properly wrapped by NullableIndex).
 * @param {?lf.index.Index.Key} key
 * @return {boolean} Whether the requested key exists.
 */
lf.index.Index.prototype.containsKey;


/**
 * @return {?Array} An array of exactly two elements, holding the minimum key at
 *     position 0, and all associated values at position 1. If no keys exist in
 *     the index null is returned.
 */
lf.index.Index.prototype.min;


/**
 * @return {?Array} An array of exactly two elements, holding the maximum key at
 *     position 0, and all associated values at position 1. If no keys exist in
 *     the index null is returned.
 */
lf.index.Index.prototype.max;


/**
 * Serializes this index such that it can be persisted.
 * @return {!Array<!lf.Row>}
 */
lf.index.Index.prototype.serialize;


/**
 * @return {!lf.index.Comparator} The comparator used by this index.
 */
lf.index.Index.prototype.comparator;


/**
 * @return {boolean} Whether the index accepts unique key only.
 */
lf.index.Index.prototype.isUniqueKey;


/**
 * Note: The returned object represents a snapshot of the index state at the
 * time this call was made. It is not guaranteed to be updated as the index
 * changes. Caller needs to call this method again if interested in latest
 * stats.
 * @return {!lf.index.Stats} The stats associated with this index.
 */
lf.index.Index.prototype.stats;
