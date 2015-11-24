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
goog.provide('lf.DiffCalculator');

goog.require('goog.math');
goog.require('lf.eval.Registry');
goog.require('lf.eval.Type');



/**
 * A DiffCalculator is responsible for detecting and applying the difference
 * between old and new results for a given query.
 * @constructor @struct
 *
 * @param {!lf.query.SelectContext} query
 * @param {!Array<?>} observableResults The array holding the last results. This
 *     is the array that is directly being observed by observers.
 */
lf.DiffCalculator = function(query, observableResults) {
  /** @private {!lf.eval.Registry} */
  this.evalRegistry_ = lf.eval.Registry.get();

  /** @private {!lf.query.SelectContext} */
  this.query_ = query;

  /** @private {!Array<?>} */
  this.observableResults_ = observableResults;

  /** @private {!Array<!lf.schema.Column>} */
  this.columns_ = this.detectColumns_();
};


/**
 * Detects the columns present in each result entry.
 * @return {!Array<!lf.schema.Column>}
 * @private
 */
lf.DiffCalculator.prototype.detectColumns_ = function() {
  if (this.query_.columns.length > 0) {
    return this.query_.columns;
  } else {
    // Handle the case where all columns are being projected.
    var columns = [];
    this.query_.from.forEach(function(table) {
      table.getColumns().forEach(function(column) {
        columns.push(column);
      });
    });

    return columns;
  }
};


/**
 * The comparator function to use for determining whether two entries are the
 * same.
 * @param {!lf.proc.RelationEntry} left
 * @param {!lf.proc.RelationEntry} right
 * @return {boolean} Whether the two entries are identical, taking only into
 *     account the columns that are being projected.
 * @private
 */
lf.DiffCalculator.prototype.comparator_ = function(
    left, right) {
  return this.columns_.every(function(column) {
    var evalFn = this.evalRegistry_.getEvaluator(
        column.getType(), lf.eval.Type.EQ);
    return evalFn(left.getField(column), right.getField(column));
  }, this);
};


/**
 * Detects the diff between old and new results, and applies it to the
 * observed array, which triggers observers to be notified.
 * @param {?lf.proc.Relation} oldResults
 * @param {!lf.proc.Relation} newResults
 * @return {!Array<!Object>} The list of changes.
 *
 * NOTE: Following logic does not detect modifications. A modification is
 * detected as a deletion and an insertion.
 * Also the implementation below is calculating longestCommonSubsequence twice,
 * with different collectorFn each time, because comparisons are done based on
 * object reference, there might be a cheaper way, such that
 * longestCommonSubsequence is only called once.
 */
lf.DiffCalculator.prototype.applyDiff = function(oldResults, newResults) {
  var oldEntries = goog.isNull(oldResults) ? [] : oldResults.entries;

  // Detecting and applying deletions.
  var longestCommonSubsequenceLeft = goog.math.longestCommonSubsequence(
      oldEntries, newResults.entries,
      this.comparator_.bind(this),
      function(indexLeft, indexRight) {
        return oldEntries[indexLeft];
      });

  var changeRecords = [];

  var commonIndex = 0;
  for (var i = 0; i < oldEntries.length; i++) {
    var entry = oldEntries[i];
    if (longestCommonSubsequenceLeft[commonIndex] == entry) {
      commonIndex++;
      continue;
    } else {
      var removed = this.observableResults_.splice(commonIndex, 1);
      var changeRecord = lf.DiffCalculator.createChangeRecord_(
          i, removed, 0, this.observableResults_);
      changeRecords.push(changeRecord);
    }
  }

  // Detecting and applying additions.
  var longestCommonSubsequenceRight = goog.math.longestCommonSubsequence(
      oldEntries, newResults.entries,
      this.comparator_.bind(this),
      function(indexLeft, indexRight) {
        return newResults.entries[indexRight];
      });

  commonIndex = 0;
  for (var i = 0; i < newResults.entries.length; i++) {
    var entry = newResults.entries[i];
    if (longestCommonSubsequenceRight[commonIndex] == entry) {
      commonIndex++;
      continue;
    } else {
      this.observableResults_.splice(i, 0, entry.row.payload());
      var changeRecord = lf.DiffCalculator.createChangeRecord_(
          i, [], 1, this.observableResults_);
      changeRecords.push(changeRecord);
    }
  }

  return changeRecords;
};


/**
 * Creates a new change record object.
 * @param {number} index The index that was affected.
 * @param {!Array} removed An array holding the elements that were removed.
 * @param {number} addedCount The number of elements added to the observed
 *     array.
 * @param {!Array} object The array that is being observed.
 * @return {!lf.DiffCalculator.ChangeRecord}
 * @private
 */
lf.DiffCalculator.createChangeRecord_ = function(
    index, removed, addedCount, object) {
  return {
    'addedCount': addedCount,
    'index': index,
    'object': object,
    'removed': removed,
    'type': 'splice'
  };
};


/**
 * The format of a change record object. This matches the native implementation.
 *
 * @typedef {{
 *   addedCount: number,
 *   object: !Array,
 *   index: number,
 *   removed: !Array,
 *   type: string
 * }}
 */
lf.DiffCalculator.ChangeRecord;
