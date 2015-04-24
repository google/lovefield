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
 * @param {boolean} reverseOrder Whether the results should be returned in
 *     reverse index order.
 */
lf.proc.IndexRangeScanStep = function(global, index, keyRanges, reverseOrder) {
  lf.proc.IndexRangeScanStep.base(this, 'constructor',
      0,
      lf.proc.PhysicalQueryPlanNode.ExecType.NO_CHILD);

  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = global.getService(lf.service.INDEX_STORE);

  /** @type {!lf.schema.Index} */
  this.index = index;

  /** @type {!Array<!lf.index.KeyRange|!lf.index.SingleKeyRange>} */
  this.keyRanges = keyRanges;

  /** @type {boolean} */
  this.reverseOrder = reverseOrder;

  /** @type {boolean} */
  this.useLimit = false;

  /** @type {boolean} */
  this.useSkip = false;
};
goog.inherits(lf.proc.IndexRangeScanStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.IndexRangeScanStep.prototype.toString = function() {
  return 'index_range_scan(' +
      this.index.getNormalizedName() + ', ' +
      this.keyRanges.toString() + ', ' +
      (this.reverseOrder ? 'reverse' : 'natural') +
      (this.useLimit ? ', limit:?' : '') +
      (this.useSkip ? ', skip:?' : '') +
      ')';
};


/** @override */
lf.proc.IndexRangeScanStep.prototype.toContextString = function(context) {
  var string = this.toString();
  if (this.useLimit) {
    string = string.replace('?', context.limit.toString());
  }

  if (this.useSkip) {
    string = string.replace('?', context.skip.toString());
  }

  return string;
};


/** @override */
lf.proc.IndexRangeScanStep.prototype.execInternal = function(
    journal, relations, context) {
  var index = this.indexStore_.get(this.index.getNormalizedName());
  var rowIds = index.getRange(
      this.keyRanges,
      this.reverseOrder,
      this.useLimit ? context.limit : undefined,
      this.useSkip ? context.skip : undefined);

  var rows = rowIds.map(function(rowId) {
    return new lf.Row(rowId, {});
  }, this);

  return [lf.proc.Relation.fromRows(rows, [this.index.tableName])];
};
