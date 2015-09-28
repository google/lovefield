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
goog.provide('lf.proc.GetRowCountStep');

goog.require('lf.fn');
goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.proc.Relation');
goog.require('lf.service');



/**
 * A step that reads the total row count for a given table from the
 * corresponding rowId index and stores in the aggregation results of an
 * empty relation that is passed to the upper tree nodes. This step is only
 * inserted in the tree for SELECT COUNT(*) queries.
 *
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!lf.Global} global
 * @param {!lf.schema.Table} table
 */
lf.proc.GetRowCountStep = function(global, table) {
  lf.proc.GetRowCountStep.base(this, 'constructor',
      0,
      lf.proc.PhysicalQueryPlanNode.ExecType.NO_CHILD);

  /** @type {!lf.schema.Table} */
  this.table = table;

  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = global.getService(lf.service.INDEX_STORE);
};
goog.inherits(lf.proc.GetRowCountStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.GetRowCountStep.prototype.toString = function() {
  return 'get_row_count(' + this.table.getName() + ')';
};


/** @override */
lf.proc.GetRowCountStep.prototype.execInternal = function(relations) {
  var rowIdIndex = this.indexStore_.get(this.table.getRowIdIndexName());
  var relation = new lf.proc.Relation([], [this.table.getName()]);
  relation.setAggregationResult(lf.fn.count(), rowIdIndex.stats().totalRows);
  return [relation];
};
