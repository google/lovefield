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
goog.provide('lf.index.Stats');



/**
 * Index statistics.
 * @constructor @struct @final
 */
lf.index.Stats = function() {
  /** @type {number} */
  this.totalRows = 0;
};


/**
 * Signal that a row had been added to index.
 * @param {?lf.index.Index.Key} key Key of the row added.
 * @param {number} rowCount
 */
lf.index.Stats.prototype.add = function(key, rowCount) {
  this.totalRows += rowCount;
};


/**
 * Signal that row(s) had been removed from index.
 * @param {?lf.index.Index.Key} key Key of the row removed.
 * @param {number} removedCount Number of rows removed
 */
lf.index.Stats.prototype.remove = function(key, removedCount) {
  this.totalRows -= removedCount;
};


/**
 * Signal that the index had been cleared.
 */
lf.index.Stats.prototype.clear = function() {
  this.totalRows = 0;
};


/**
 * Combine stats given and put the results into current object.
 * @param {!Array<lf.index.Stats>} statsList
 */
lf.index.Stats.prototype.updateFromList = function(statsList) {
  this.clear();
  statsList.forEach(function(stats) {
    this.totalRows += stats.totalRows;
  }, this);
};
