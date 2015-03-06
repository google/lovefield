/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
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
goog.provide('lf.proc.IndexRangeScanStep');

goog.require('goog.Promise');
goog.require('lf.Order');
goog.require('lf.Row');
goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.proc.Relation');
goog.require('lf.service');



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!lf.Global} global
 * @param {!lf.schema.Index} index
 * @param {!Array<!lf.index.KeyRange|!lf.index.SingleKeyRange>} keyRanges
 * @param {!lf.Order} order The order in which results will be returned.
 *     TODO(dpapad): This parameter needs to be changed to a boolean instead,
 *     either index's order or reverse order
 */
lf.proc.IndexRangeScanStep = function(global, index, keyRanges, order) {
  lf.proc.IndexRangeScanStep.base(this, 'constructor');

  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = global.getService(lf.service.INDEX_STORE);

  /** @type {!lf.schema.Index} */
  this.index = index;

  /** @type {!Array<!lf.index.KeyRange|!lf.index.SingleKeyRange>} */
  this.keyRanges = keyRanges;

  /** @type {!lf.Order} */
  this.order = order;

  /** @type {?number} */
  this.limit = null;

  /** @type {?number} */
  this.skip = null;
};
goog.inherits(lf.proc.IndexRangeScanStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.IndexRangeScanStep.prototype.toString = function() {
  return 'index_range_scan(' +
      this.index.getNormalizedName() + ', ' +
      this.keyRanges.toString() + ', ' +
      (this.order == lf.Order.ASC ? 'ASC' : 'DESC') +
      (!goog.isNull(this.limit) ? ', limit:' + this.limit : '') +
      (!goog.isNull(this.skip) ? ', skip:' + this.skip : '') +
      ')';
};


/** @override */
lf.proc.IndexRangeScanStep.prototype.exec = function(journal) {
  var reverseOrder = (this.order != this.index.columns[0].order);

  var index = this.indexStore_.get(this.index.getNormalizedName());
  var rowIds = index.getRange(
      this.keyRanges,
      reverseOrder,
      !goog.isNull(this.limit) ? this.limit : undefined,
      !goog.isNull(this.skip) ? this.skip : undefined);

  var rows = rowIds.map(function(rowId) {
    return new lf.Row(rowId, {});
  }, this);

  return goog.Promise.resolve(lf.proc.Relation.fromRows(
      rows, [this.index.tableName]));
};
