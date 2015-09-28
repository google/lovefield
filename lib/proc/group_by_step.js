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
goog.provide('lf.proc.GroupByStep');

goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.proc.Relation');
goog.require('lf.structs.MapSet');



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!Array<!lf.schema.Column>} groupByColumns
 */
lf.proc.GroupByStep = function(groupByColumns) {
  lf.proc.GroupByStep.base(this, 'constructor',
      1,
      lf.proc.PhysicalQueryPlanNode.ExecType.FIRST_CHILD);

  /** @private {!Array<!lf.schema.Column>} */
  this.groupByColumns_ = groupByColumns;
};
goog.inherits(lf.proc.GroupByStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.GroupByStep.prototype.toString = function() {
  var columnNames = this.groupByColumns_.map(
      function(column) {
        return column.getNormalizedName();
      });
  return 'groupBy(' + columnNames.toString() + ')';
};


/** @override */
lf.proc.GroupByStep.prototype.execInternal = function(relations) {
  return this.calculateGroupedRelations_(relations[0]);
};


/**
 * Breaks down a single relation to mulitple relations by grouping rows based on
 * the specified groupBy columns.
 * @param {!lf.proc.Relation} relation
 * @return {!Array<!lf.proc.Relation>}
 * @private
 */
lf.proc.GroupByStep.prototype.calculateGroupedRelations_ = function(relation) {
  /** @type {!lf.structs.MapSet<string, !lf.proc.RelationEntry>} */
  var groupMap = new lf.structs.MapSet();

  var getKey = function(entry) {
    var keys = this.groupByColumns_.map(function(column) {
      return entry.getField(column);
    }, this);
    return keys.join(',');
  }.bind(this);

  relation.entries.forEach(function(entry) {
    groupMap.set(getKey(entry), entry);
  }, this);

  return groupMap.keys().map(function(key) {
    return new lf.proc.Relation(
        /** @type {!Array<!lf.proc.RelationEntry>} */ (groupMap.get(key)),
        relation.getTables());
  }, this);
};
