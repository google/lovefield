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
goog.provide('lf.Row');

goog.forwardDeclare('lf.index.Index.Key');



/**
 * The base row class for all rows.
 * All functions in this class must not begin with get* or set* because SPAC
 * will auto-generate subclasses that have get/set methods for every column.
 * @template UserType, StoredType
 * @param {number} id The ID of this instance.
 * @param {UserType} payload
 * @constructor
 */
lf.Row = function(id, payload) {
  /** @private {number} */
  this.id_ = id;

  /** @private {UserType} */
  this.payload_ = payload || this.defaultPayload();
};


/**
 * The ID to assign to the next row that will be created.
 * Should be initialized to the appropriate value from the BackStore instance
 * that is being used.
 * @private {number}
 */
lf.Row.nextId_ = 0;


/**
 * An ID to be used when a row that does not correspond to a DB entry is
 * created (for example the result of joining two rows).
 * @const {number}
 */
lf.Row.DUMMY_ID = -1;


/**
 * @return {number} The next unique row ID to use for creating a new instance.
 */
lf.Row.getNextId = function() {
  return lf.Row.nextId_++;
};


/**
 * Sets the global row id. This is supposed to be called by BackStore instances
 * during initialization only.
 * @param {number} nextId The next id should be used. This is typically the max
 *     rowId in database plus 1.
 */
lf.Row.setNextId = function(nextId) {
  lf.Row.nextId_ = nextId;
};


/** @return {number} */
lf.Row.prototype.id = function() {
  return this.id_;
};


/**
 * Sets the ID of this row instance.
 * @param {number} id
 */
lf.Row.prototype.assignRowId = function(id) {
  this.id_ = id;
};


/** @return {UserType} */
lf.Row.prototype.payload = function() {
  return this.payload_;
};


/**
 * Creates a default payload.
 * @return {UserType}
 */
lf.Row.prototype.defaultPayload = function() {
  return /** @type {UserType} */ ({});
};


/**
 * Converts user payload to DB form. Subclasses should override this method. By
 * default there is no conversion actually happening.
 * @return {StoredType}
 */
lf.Row.prototype.toDbPayload = function() {
  return /** @type {StoredType} */ (this.payload_);
};


/** @typedef {{id: number, value: (string|!Object)}} */
lf.Row.Raw;


/** @return {!lf.Row.Raw} */
lf.Row.prototype.serialize = function() {
  return {'id': this.id_, 'value': this.toDbPayload()};
};


/**
 * Returns the key value for a given index.
 * @param {string} indexName Normalized name of the index.
 * @return {?lf.index.Index.Key} The key corresponding to the index.
 */
lf.Row.prototype.keyOfIndex = function(indexName) {
  if (indexName.substr(-1) == '#') {
    return /** @type {!lf.index.Index.Key} */ (this.id_);
  }

  // Remaining indices keys are implemented by overriding keyOfIndex in
  // subclasses.
  return null;
};


/**
 * Creates a new Row instance from DB data.
 * @param {!lf.Row.Raw} data
 * @return {!lf.Row}
 */
lf.Row.deserialize = function(data) {
  return new lf.Row(data['id'], data['value']);
};


/**
 * Creates a new Row instance with an automatically assigned ID.
 * @param {!Object=} opt_payload
 * @return {!lf.Row}
 */
lf.Row.create = function(opt_payload) {
  return new lf.Row(lf.Row.getNextId(), opt_payload || {});
};


/**
 * ArrayBuffer to hex string.
 * @param {?ArrayBuffer} buffer
 * @return {?string}
 */
lf.Row.binToHex = function(buffer) {
  if (!goog.isDefAndNotNull(buffer)) {
    return null;
  }

  var uint8Array = new Uint8Array(buffer);
  var s = '';
  for (var i = 0; i < uint8Array.length; ++i) {
    var chr = uint8Array[i].toString(16);
    s += chr.length < 2 ? '0' + chr : chr;
  }
  return s;
};


/**
 * Hex string to ArrayBuffer.
 * @param {?string} hex
 * @return {?ArrayBuffer}
 */
lf.Row.hexToBin = function(hex) {
  if (!goog.isDefAndNotNull(hex) || hex == '') {
    return null;
  }

  if (hex.length % 2 != 0) {
    hex = '0' + hex;
  }
  var buffer = new ArrayBuffer(hex.length / 2);
  var uint8Array = new Uint8Array(buffer);
  for (var i = 0, j = 0; i < hex.length; i += 2) {
    uint8Array[j++] = parseInt(hex.substr(i, 2), 16);
  }
  return buffer;
};
