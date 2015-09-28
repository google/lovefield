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
goog.provide('lf.proc.TableAccessFullStep');

goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.proc.Relation');
goog.require('lf.service');



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!lf.Global} global
 * @param {!lf.schema.Table} table
 */
lf.proc.TableAccessFullStep = function(global, table) {
  lf.proc.TableAccessFullStep.base(this, 'constructor',
      0,
      lf.proc.PhysicalQueryPlanNode.ExecType.NO_CHILD);

  /** @private {!lf.cache.Cache} */
  this.cache_ = global.getService(lf.service.CACHE);

  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = global.getService(lf.service.INDEX_STORE);

  /** @type {!lf.schema.Table} */
  this.table = table;
};
goog.inherits(lf.proc.TableAccessFullStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.TableAccessFullStep.prototype.toString = function() {
  var out = 'table_access(' + this.table.getName();
  if (!goog.isNull(this.table.getAlias())) {
    out += ' as ' + this.table.getAlias();
  }
  out += ')';
  return out;
};


/** @override */
lf.proc.TableAccessFullStep.prototype.execInternal = function(relations) {
  var rowIds = this.indexStore_.get(this.table.getRowIdIndexName()).getRange();

  return [lf.proc.Relation.fromRows(
      this.cache_.getMany(rowIds), [this.table.getEffectiveName()])];
};
