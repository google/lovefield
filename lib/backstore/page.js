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
goog.provide('lf.backstore.Page');

goog.require('goog.object');
goog.require('lf.structs.set');



/**
 * The base page class for bundled rows. Each page is a physical row in
 * IndexedDB, and contains 2^BUNDLE_EXPONENT logical rows.
 * @param {number} id
 * @param {Object=} opt_payload
 * @constructor
 * @struct
 * @final
 */
lf.backstore.Page = function(id, opt_payload) {
  /** @private {number} */
  this.id_ = id;

  /** @private {!Object} */
  this.payload_ = opt_payload || {};
};


/**
 * Power factor of bundle size, e.g. 9 means 2^9 = 512.
 * @const {number}
 */
lf.backstore.Page.BUNDLE_EXPONENT = 9;


/**
 * Returns distinct page ids containing given row ids.
 * @param {!Array<number>} rowIds
 * @return {!Array<number>} pageIds
 */
lf.backstore.Page.toPageIds = function(rowIds) {
  var pageIds = lf.structs.set.create();
  rowIds.forEach(function(id) {
    pageIds.add(lf.backstore.Page.toPageId(id));
  });
  return lf.structs.set.values(pageIds);
};


/**
 * @param {number} rowId
 * @return {number} pageId
 */
lf.backstore.Page.toPageId = function(rowId) {
  return rowId >> lf.backstore.Page.BUNDLE_EXPONENT;
};


/**
 * @param {number} pageId
 * @return {!Array<number>} Range of page's row id [from, to].
 */
lf.backstore.Page.getPageRange = function(pageId) {
  return [
    pageId << lf.backstore.Page.BUNDLE_EXPONENT,
    ((pageId + 1) << lf.backstore.Page.BUNDLE_EXPONENT) - 1
  ];
};


/** @return {number} */
lf.backstore.Page.prototype.getId = function() {
  return this.id_;
};


/** @return {!Object} */
lf.backstore.Page.prototype.getPayload = function() {
  return this.payload_;
};


/** @param {!Array<!lf.Row>} rows */
lf.backstore.Page.prototype.setRows = function(rows) {
  rows.forEach(function(row) {
    this.payload_[row.id()] = row.serialize();
  }, this);
};


/** @param {!Array<!number>} ids */
lf.backstore.Page.prototype.removeRows = function(ids) {
  ids.forEach(function(id) {
    goog.object.remove(this.payload_, id);
  }, this);
};


/** @return {!lf.Row.Raw} */
lf.backstore.Page.prototype.serialize = function() {
  return {'id': this.id_, 'value': JSON.stringify(this.payload_)};
};


/**
 * Creates a new Page instance from DB data.
 * @param {!lf.Row.Raw} data
 * @return {!lf.backstore.Page}
 */
lf.backstore.Page.deserialize = function(data) {
  return new lf.backstore.Page(
      data['id'], /** @type {Object} */ (JSON.parse(data['value'])));
};
