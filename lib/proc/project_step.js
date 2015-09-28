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
goog.provide('lf.proc.ProjectStep');

goog.require('lf.fn.AggregatedColumn');
goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.proc.Relation');
goog.require('lf.proc.RelationTransformer');



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!Array<!lf.schema.Column>} columns
 * @param {?Array<!lf.schema.Column>} groupByColumns
 */
lf.proc.ProjectStep = function(columns, groupByColumns) {
  lf.proc.ProjectStep.base(this, 'constructor',
      lf.proc.PhysicalQueryPlanNode.ANY,
      lf.proc.PhysicalQueryPlanNode.ExecType.FIRST_CHILD);

  /** @type {!Array<!lf.schema.Column>} */
  this.columns = columns;

  /** @type {?Array<!lf.schema.Column>} */
  this.groupByColumns = groupByColumns;
};
goog.inherits(lf.proc.ProjectStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.ProjectStep.prototype.toString = function() {
  var string = 'project(' + this.columns.toString();
  if (!goog.isNull(this.groupByColumns)) {
    var groupBy = this.groupByColumns.map(function(col) {
      return col.getNormalizedName();
    }).join(', ');
    string += ', groupBy(' + groupBy + ')';
  }
  string += ')';
  return string;
};


/** @override */
lf.proc.ProjectStep.prototype.execInternal = function(relations) {
  if (relations.length == 0) {
    return [lf.proc.Relation.createEmpty()];
  } else if (relations.length == 1) {
    return [this.execNonGroupByProjection_(relations[0])];
  } else {
    return [this.execGroupByProjection_(relations)];
  }
};


/**
 * @return {boolean} Whether any aggregators (either columns or groupBy)
 *     have been specified.
 */
lf.proc.ProjectStep.prototype.hasAggregators = function() {
  var hasAggregators = this.columns.some(function(column) {
    return column instanceof lf.fn.AggregatedColumn;
  });
  return hasAggregators || !goog.isNull(this.groupByColumns);
};


/**
 * Calculates the final relation for the case where GROUP_BY exists.
 * @param {!Array<!lf.proc.Relation>} relations The input relations.
 * @return {!lf.proc.Relation} The output relation.
 * @private
 */
lf.proc.ProjectStep.prototype.execGroupByProjection_ = function(relations) {
  return lf.proc.RelationTransformer.transformMany(relations, this.columns);
};


/**
 * Calculates the final relation for the case where no GROUP_BY exists.
 * @param {!lf.proc.Relation} relation The input relation.
 * @return {!lf.proc.Relation} The output relation.
 * @private
 */
lf.proc.ProjectStep.prototype.execNonGroupByProjection_ = function(relation) {
  if (this.columns.length == 0) {
    return relation;
  }

  var relationTransformer = new lf.proc.RelationTransformer(
      relation, this.columns);
  return relationTransformer.getTransformed();
};
