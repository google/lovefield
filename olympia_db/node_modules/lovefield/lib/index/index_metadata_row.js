/**
 * @license
 * Copyright 2014 Google Inc. All Rights Reserved.
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
goog.provide('lf.index.IndexMetadata');
goog.provide('lf.index.IndexMetadataRow');

goog.require('lf.Row');



/**
 * @constructor
 * @final
 *
 * @param {!lf.index.IndexMetadata.Type} type
 */
lf.index.IndexMetadata = function(type) {
  /** @type {!lf.index.IndexMetadata.Type} */
  this.type = type;
};


/**
 * The type of the serialized index. Useful for knowing how to deserialize
 * it.
 * @enum {string}
 */
lf.index.IndexMetadata.Type = {
  ROW_ID: 'rowid',
  BTREE: 'btree'
};



/**
 * Metadata about a persisted index. It is stored as the first row in each index
 * backing store.
 * @constructor
 * @final
 * @extends {lf.Row<!lf.index.IndexMetadata, !lf.index.IndexMetadata>}
 *
 * @param {!lf.index.IndexMetadata} payload
 */
lf.index.IndexMetadataRow = function(payload) {
  lf.index.IndexMetadataRow.base(
      this, 'constructor', lf.index.IndexMetadataRow.ROW_ID, payload);
};
goog.inherits(lf.index.IndexMetadataRow, lf.Row);


/**
 * The rowID to use for all IndexMetadataRow instances.
 * @const {number}
 */
lf.index.IndexMetadataRow.ROW_ID = -1;


/**
 * Creates an IndexMetadataRow instance for the given index type.
 * @param {!lf.index.IndexMetadata.Type} indexType
 * @return {!lf.index.IndexMetadataRow}
 */
lf.index.IndexMetadataRow.forType = function(indexType) {
  var indexMetadata = new lf.index.IndexMetadata(indexType);
  return new lf.index.IndexMetadataRow(indexMetadata);
};
