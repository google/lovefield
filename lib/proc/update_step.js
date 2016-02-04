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
goog.provide('lf.proc.UpdateStep');

goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.proc.Relation');



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!lf.schema.Table} table
 */
lf.proc.UpdateStep = function(table) {
  lf.proc.UpdateStep.base(this, 'constructor',
      1,
      lf.proc.PhysicalQueryPlanNode.ExecType.FIRST_CHILD);

  /** @private {!lf.schema.Table} table */
  this.table_ = table;
};
goog.inherits(lf.proc.UpdateStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.UpdateStep.prototype.toString = function() {
  return 'update(' + this.table_.getName() + ')';
};


/** @override */
lf.proc.UpdateStep.prototype.execInternal = function(
    relations, journal, context) {
  var rows = relations[0].entries.map(function(entry) {
    // Need to clone the row here before modifying it, because it is a
    // direct reference to the cache's contents.
    var clone = this.table_.deserializeRow(entry.row.serialize());

    context.set.forEach(function(update) {
      clone.payload()[update.column.getName()] = update.value;
    }, this);
    return clone;
  }, this);
  journal.update(this.table_, rows);
  return [lf.proc.Relation.createEmpty()];
};
