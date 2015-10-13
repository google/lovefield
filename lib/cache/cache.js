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
goog.provide('lf.cache.Cache');

goog.forwardDeclare('lf.Row');



/**
 * Row-cache interface.
 * @interface
 */
lf.cache.Cache = function() {};


/**
 * Inserts/Updates contents in cache. This version takes single row.
 * @param {string} tableName
 * @param {!lf.Row} row
 */
lf.cache.Cache.prototype.set;


/**
 * Inserts/Updates contents in cache. This version takes multiple rows.
 * @param {string} tableName
 * @param {!Array<!lf.Row>} rows
 */
lf.cache.Cache.prototype.setMany;


/**
 * Returns contents from the cache.
 * @param {number} id
 * @return {?lf.Row}
 */
lf.cache.Cache.prototype.get;


/**
 * Returns contents from the cache.
 * @param {!Array<number>} ids
 * @return {!Array<?lf.Row>} The requested cache entries or null if not found.
 */
lf.cache.Cache.prototype.getMany;


/**
 * Returns contents from the cache. The range query will return only the rows
 * with row ids matching the range.
 * @param {string} tableName
 * @param {number} fromId
 * @param {number} toId
 * @return {!Array<!lf.Row>} The requested cache entries.
 */
lf.cache.Cache.prototype.getRange;


/**
 * Removes a single entry from the cache.
 * @param {string} tableName
 * @param {number} rowId
 */
lf.cache.Cache.prototype.remove;


/**
 * Removes entries from the cache.
 * @param {string} tableName
 * @param {!Array<number>} rowIds
 */
lf.cache.Cache.prototype.removeMany;


/**
 * @param {string=} opt_tableName When omitted, count rows for all tables.
 * @return {number} The number of rows currently in the cache.
 */
lf.cache.Cache.prototype.getCount;


/**
 * Removes all contents from the cache.
 * @type {function()}
 */
lf.cache.Cache.prototype.clear;
