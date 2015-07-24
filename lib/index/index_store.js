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
goog.provide('lf.index.IndexStore');



/**
 * IndexStore is the common place for query engine to retrieve indices of a
 * table.
 * @interface
 */
lf.index.IndexStore = function() {};


/**
 * Initialize index store. This will create empty index instances.
 * @param {!lf.schema.Database} schema
 * @return {!IThenable}
 */
lf.index.IndexStore.prototype.init;


/**
 * Returns the index by full qualified name. Returns null if not found.
 * @param {string} name
 * @return {?lf.index.Index}
 */
lf.index.IndexStore.prototype.get;


/**
 * @param {string} tableName
 * @return {!Array<!lf.index.Index>} The indices for a given table or an
 *     empty array if no indices exist.
 */
lf.index.IndexStore.prototype.getTableIndices;


/**
 * Sets the given index. If an index with the same name already exists it will
 * be overwritten.
 * @param {string} tableName
 * @param {!lf.index.Index} index
 */
lf.index.IndexStore.prototype.set;
