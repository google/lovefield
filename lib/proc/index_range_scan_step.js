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
goog.provide('lf.proc.IndexRangeScanStep');
goog.provide('lf.proc.MultiIndexRangeScanStep');

goog.require('lf.Row');
goog.require('lf.index');
goog.require('lf.index.SingleKeyRange');
goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.proc.Relation');
goog.require('lf.service');
goog.require('lf.structs.map');



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!lf.Global} global
 * @param {!lf.schema.Index} index
 * @param {!lf.proc.IndexKeyRangeCalculator} keyRangeCalculator
 * @param {boolean} reverseOrder Whether the results should be returned in
 *     reverse index order.
 */
lf.proc.IndexRangeScanStep = function(
    global, index, keyRangeCalculator, reverseOrder) {
  lf.proc.IndexRangeScanStep.base(this, 'constructor',
      0,
      lf.proc.PhysicalQueryPlanNode.ExecType.NO_CHILD);

  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = global.getService(lf.service.INDEX_STORE);

  /** @type {!lf.schema.Index} */
  this.index = index;

  /** @type {!lf.proc.IndexKeyRangeCalculator} */
  this.keyRangeCalculator = keyRangeCalculator;

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
      '?, ' +
      (this.reverseOrder ? 'reverse' : 'natural') +
      (this.useLimit ? ', limit:?' : '') +
      (this.useSkip ? ', skip:?' : '') +
      ')';
};


/** @override */
lf.proc.IndexRangeScanStep.prototype.toContextString = function(context) {
  var string = this.toString();

  var keyRanges = this.keyRangeCalculator.getKeyRangeCombinations(context);
  string = string.replace('?', keyRanges.toString());

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
    relations, opt_journal, opt_context) {
  // opt_context must be provided for IndexRangeScanStep.
  var context = opt_context;
  var keyRanges = this.keyRangeCalculator.getKeyRangeCombinations(
      /** @type {!lf.query.Context} */ (context));
  var index = this.indexStore_.get(this.index.getNormalizedName());
  var rowIds;
  if (keyRanges.length == 1 &&
      keyRanges[0] instanceof lf.index.SingleKeyRange &&
      keyRanges[0].isOnly()) {
    rowIds = lf.index.slice(
        index.get(/** @type {lf.index.Index.SingleKey} */ (keyRanges[0].from)),
        false,  // Single key will never reverse order.
        this.useLimit ? context.limit : undefined,
        this.useSkip ? context.skip : undefined);
  } else {
    rowIds = index.getRange(
        keyRanges,
        this.reverseOrder,
        this.useLimit ? context.limit : undefined,
        this.useSkip ? context.skip : undefined);
  }

  var rows = rowIds.map(function(rowId) {
    return new lf.Row(rowId, {});
  }, this);

  return [lf.proc.Relation.fromRows(rows, [this.index.tableName])];
};



/**
 * A MultiIndexRangeScanStep is used to calculate the result of an OR predicate
 * where all of the OR-clauses
 * 1) Refer to the same database table.
 * 2) Can leverage an index (does not have to be the same index).
 *
 * The order in which results are returned from a MultiIndexRangeScanStep can't
 * be relied upon, even if children IndexRangeScanSteps return results in a
 * particular order. This is because when performing union operation the order
 * can't be preserved (it can not be derived).
 *
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 */
lf.proc.MultiIndexRangeScanStep = function() {
  lf.proc.MultiIndexRangeScanStep.base(this, 'constructor',
      lf.proc.PhysicalQueryPlanNode.ANY,
      lf.proc.PhysicalQueryPlanNode.ExecType.ALL);
};
goog.inherits(lf.proc.MultiIndexRangeScanStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.MultiIndexRangeScanStep.prototype.toString = function() {
  return 'multi_index_range_scan()';
};


/** @override */
lf.proc.MultiIndexRangeScanStep.prototype.execInternal = function(relations) {
  // Calculate a new Relation that includes the union of the entries of all
  // relations. All child relations must be including rows from the same table.
  var entriesUnion = lf.structs.map.create();
  relations.forEach(function(relation) {
    relation.entries.forEach(function(entry) {
      entriesUnion.set(entry.row.id(), entry);
    });
  });
  var entries = lf.structs.map.values(entriesUnion);
  return [new lf.proc.Relation(entries, relations[0].getTables())];
};
