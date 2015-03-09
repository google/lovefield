/**
 * @license
 * Copyright 2014 Google Inc. All Rights Reserved.
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
goog.provide('lf.proc.ProjectStep');

goog.require('goog.labs.structs.Multimap');
goog.require('lf.fn.AggregatedColumn');
goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.proc.Relation');
goog.require('lf.proc.RelationTransformer');



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!Array<!lf.schema.Column>} columns
 * @param {?lf.schema.Column} groupByColumn
 */
lf.proc.ProjectStep = function(columns, groupByColumn) {
  lf.proc.ProjectStep.base(this, 'constructor',
      1,
      lf.proc.PhysicalQueryPlanNode.ExecType.FIRST_CHILD);

  /** @type {!Array<!lf.schema.Column>} */
  this.columns = columns;

  /** @type {?lf.schema.Column} */
  this.groupByColumn = groupByColumn;
};
goog.inherits(lf.proc.ProjectStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.ProjectStep.prototype.toString = function() {
  var string = 'project(' + this.columns.toString();
  if (!goog.isNull(this.groupByColumn)) {
    string += ', groupBy(' + this.groupByColumn.getNormalizedName() + ')';
  }
  string += ')';
  return string;
};


/** @override */
lf.proc.ProjectStep.prototype.execInternal = function(journal, results) {
  var relation = results[0];
  return goog.isNull(this.groupByColumn) ?
      this.execNonGroupByProjection_(relation) :
      this.execGroupByProjection_(relation);
};


/**
 * @return {boolean} Whether any aggregators (either columns or groupBy)
 *     have been specified.
 */
lf.proc.ProjectStep.prototype.hasAggregators = function() {
  var hasAggregators = this.columns.some(function(column) {
    return column instanceof lf.fn.AggregatedColumn;
  });
  return hasAggregators || !goog.isNull(this.groupByColumn);
};


/**
 * Calculates the final relation for the case where GROUP_BY exists.
 * @param {!lf.proc.Relation} relation The input relation.
 * @return {!Array<!lf.proc.Relation>} The output relation.
 * @private
 */
lf.proc.ProjectStep.prototype.execGroupByProjection_ = function(relation) {
  if (relation.entries == 0) {
    return [relation];
  }

  var groupedRelations = this.calculateGroupedRelations_(relation);
  return [lf.proc.RelationTransformer.transformMany(
      groupedRelations, this.columns)];
};


/**
 * Calculates the final relation for the case where no GROUP_BY exists.
 * @param {!lf.proc.Relation} relation The input relation.
 * @return {!Array<!lf.proc.Relation>} The output relation.
 * @private
 */
lf.proc.ProjectStep.prototype.execNonGroupByProjection_ = function(relation) {
  if (this.columns.length == 0) {
    return [relation];
  }

  var relationTransformer = new lf.proc.RelationTransformer(
      relation, this.columns);
  return [relationTransformer.getTransformed()];
};


/**
 * Breaks down a single relation to mulitple relations by grouping rows based on
 * the specified groupBy column.
 * @param {!lf.proc.Relation} relation
 * @return {!Array<!lf.proc.Relation>}
 * @private
 */
lf.proc.ProjectStep.prototype.calculateGroupedRelations_ = function(relation) {
  var groupMap = new goog.labs.structs.Multimap();
  relation.entries.forEach(function(entry) {
    // TODO(dpapad): What if groupBy of an ArrayBuffer column is requested?
    var key = entry.getField(/** @type {!lf.schema.Column} */ (
        this.groupByColumn));
    groupMap.add(String(key), entry);
  }, this);

  return groupMap.getKeys().map(
      function(key) {
        return new lf.proc.Relation(groupMap.get(key), relation.getTables());
      }, this);
};
