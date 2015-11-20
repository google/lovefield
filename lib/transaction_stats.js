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
goog.provide('lf.TransactionStats');



/**
 * @export @struct @constructor @final
 *
 * @param {boolean} success
 * @param {number} insertedRows
 * @param {number} updatedRows
 * @param {number} deletedRows
 * @param {number} tablesChanged
 */
lf.TransactionStats = function(
    success, insertedRows, updatedRows, deletedRows, tablesChanged) {
  /** @private {boolean} */
  this.success_ = success;

  /** @private {number} */
  this.insertedRowCount_ = insertedRows;

  /** @private {number} */
  this.updatedRowCount_ = updatedRows;

  /** @private {number} */
  this.deletedRowCount_ = deletedRows;

  /** @private {number} */
  this.changedTableCount_ = tablesChanged;
};


/** @export @return {boolean} */
lf.TransactionStats.prototype.success = function() {
  return this.success_;
};


/** @export @return {number} */
lf.TransactionStats.prototype.insertedRowCount = function() {
  return this.insertedRowCount_;
};


/** @export @return {number} */
lf.TransactionStats.prototype.updatedRowCount = function() {
  return this.updatedRowCount_;
};


/** @export @return {number} */
lf.TransactionStats.prototype.deletedRowCount = function() {
  return this.deletedRowCount_;
};


/** @export @return {number} */
lf.TransactionStats.prototype.changedTableCount = function() {
  return this.changedTableCount_;
};


/**
 * Returns default transaction stats: failed transaction updating nothing.
 * @return {!lf.TransactionStats}
 */
lf.TransactionStats.getDefault = function() {
  return new lf.TransactionStats(false, 0, 0, 0, 0);
};
