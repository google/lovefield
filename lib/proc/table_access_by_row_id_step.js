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
goog.provide('lf.proc.TableAccessByRowIdStep');

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
lf.proc.TableAccessByRowIdStep = function(global, table) {
  lf.proc.TableAccessByRowIdStep.base(this, 'constructor',
      1,
      lf.proc.PhysicalQueryPlanNode.ExecType.FIRST_CHILD);

  /** @private {!lf.cache.Cache} */
  this.cache_ = global.getService(lf.service.CACHE);

  /** @private {!lf.schema.Table} */
  this.table_ = table;
};
goog.inherits(lf.proc.TableAccessByRowIdStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.TableAccessByRowIdStep.prototype.toString = function() {
  return 'table_access_by_row_id(' + this.table_.getName() + ')';
};


/** @override */
lf.proc.TableAccessByRowIdStep.prototype.execInternal = function(relations) {
  return [lf.proc.Relation.fromRows(
      this.cache_.getMany(relations[0].getRowIds()),
      [this.table_.getEffectiveName()])];
};
