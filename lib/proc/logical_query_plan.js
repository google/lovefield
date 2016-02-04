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
goog.provide('lf.proc.AggregationNode');
goog.provide('lf.proc.CrossProductNode');
goog.provide('lf.proc.DeleteNode');
goog.provide('lf.proc.GroupByNode');
goog.provide('lf.proc.InsertNode');
goog.provide('lf.proc.InsertOrReplaceNode');
goog.provide('lf.proc.JoinNode');
goog.provide('lf.proc.LimitNode');
goog.provide('lf.proc.LogicalQueryPlan');
goog.provide('lf.proc.LogicalQueryPlanNode');
goog.provide('lf.proc.OrderByNode');
goog.provide('lf.proc.ProjectNode');
goog.provide('lf.proc.SelectNode');
goog.provide('lf.proc.SkipNode');
goog.provide('lf.proc.TableAccessNode');
goog.provide('lf.proc.UpdateNode');

goog.require('lf.query.SelectContext');
goog.require('lf.structs.TreeNode');



/**
 * @constructor @struct
 *
 * @param {!lf.proc.LogicalQueryPlanNode} rootNode
 * @param {!lf.structs.Set<!lf.schema.Table>} scope
 */
lf.proc.LogicalQueryPlan = function(rootNode, scope) {
  /** @private {!lf.proc.LogicalQueryPlanNode} */
  this.rootNode_ = rootNode;

  /** @private {!lf.structs.Set<!lf.schema.Table>} */
  this.scope_ = scope;
};


/** @return {!lf.proc.LogicalQueryPlanNode} */
lf.proc.LogicalQueryPlan.prototype.getRoot = function() {
  return this.rootNode_;
};


/** @return {!lf.structs.Set<!lf.schema.Table>} */
lf.proc.LogicalQueryPlan.prototype.getScope = function() {
  return this.scope_;
};



/**
 * @constructor @struct
 * @extends {lf.structs.TreeNode}
 */
lf.proc.LogicalQueryPlanNode = function() {
  lf.proc.LogicalQueryPlanNode.base(this, 'constructor');
};
goog.inherits(lf.proc.LogicalQueryPlanNode, lf.structs.TreeNode);



/**
 * @constructor @struct
 * @extends {lf.proc.LogicalQueryPlanNode}
 *
 * @param {!lf.schema.Table} table
 * @param {!Array<!lf.Row>} values
 */
lf.proc.InsertNode = function(table, values) {
  lf.proc.InsertNode.base(this, 'constructor');

  /** @type {!lf.schema.Table} */
  this.table = table;

  /** @type {!Array<!lf.Row>} */
  this.values = values;
};
goog.inherits(lf.proc.InsertNode, lf.proc.LogicalQueryPlanNode);



/**
 * @constructor @struct
 * @extends {lf.proc.InsertNode}
 *
 * @param {!lf.schema.Table} table
 * @param {!Array<!lf.Row>} values
 */
lf.proc.InsertOrReplaceNode = function(table, values) {
  lf.proc.InsertOrReplaceNode.base(this, 'constructor', table, values);
};
goog.inherits(lf.proc.InsertOrReplaceNode, lf.proc.InsertNode);



/**
 * @constructor @struct
 * @extends {lf.proc.LogicalQueryPlanNode}
 *
 * @param {!lf.schema.Table} table
 */
lf.proc.DeleteNode = function(table) {
  lf.proc.DeleteNode.base(this, 'constructor');

  /** @type {!lf.schema.Table} */
  this.table = table;
};
goog.inherits(lf.proc.DeleteNode, lf.proc.LogicalQueryPlanNode);


/** @override */
lf.proc.DeleteNode.prototype.toString = function() {
  return 'delete(' + this.table.getName() + ')';
};



/**
 * @constructor @struct
 * @extends {lf.proc.LogicalQueryPlanNode}
 *
 * @param {!lf.schema.Table} table
 */
lf.proc.UpdateNode = function(table) {
  lf.proc.UpdateNode.base(this, 'constructor');

  /** @type {!lf.schema.Table} */
  this.table = table;
};
goog.inherits(lf.proc.UpdateNode, lf.proc.LogicalQueryPlanNode);


/** @override */
lf.proc.UpdateNode.prototype.toString = function() {
  return 'update(' + this.table.getName() + ')';
};



/**
 * @constructor @struct
 * @extends {lf.proc.LogicalQueryPlanNode}
 *
 * @param {!lf.Predicate} predicate
 */
lf.proc.SelectNode = function(predicate) {
  lf.proc.SelectNode.base(this, 'constructor');

  /** @type {!lf.Predicate} */
  this.predicate = predicate;
};
goog.inherits(lf.proc.SelectNode, lf.proc.LogicalQueryPlanNode);


/** @override */
lf.proc.SelectNode.prototype.toString = function() {
  return 'select(' + this.predicate.toString() + ')';
};



/**
 * @constructor @struct
 * @extends {lf.proc.LogicalQueryPlanNode}
 *
 * @param {!lf.schema.Table} table
 */
lf.proc.TableAccessNode = function(table) {
  lf.proc.TableAccessNode.base(this, 'constructor');

  /** @type {!lf.schema.Table} */
  this.table = table;
};
goog.inherits(lf.proc.TableAccessNode, lf.proc.LogicalQueryPlanNode);


/** @override */
lf.proc.TableAccessNode.prototype.toString = function() {
  var out = 'table_access(' + this.table.getName();
  if (!goog.isNull(this.table.getAlias())) {
    out += ' as ' + this.table.getAlias();
  }
  out += ')';
  return out;
};



/**
 * @constructor @struct
 * @extends {lf.proc.LogicalQueryPlanNode}
 */
lf.proc.CrossProductNode = function() {
  lf.proc.CrossProductNode.base(this, 'constructor');
};
goog.inherits(lf.proc.CrossProductNode, lf.proc.LogicalQueryPlanNode);


/** @override */
lf.proc.CrossProductNode.prototype.toString = function() {
  return 'cross_product';
};



/**
 * @constructor @struct
 * @extends {lf.proc.LogicalQueryPlanNode}
 *
 * @param {!Array<!lf.schema.Column>} columns
 * @param {?Array<!lf.schema.Column>} groupByColumns
 */
lf.proc.ProjectNode = function(columns, groupByColumns) {
  lf.proc.ProjectNode.base(this, 'constructor');

  /** @type {!Array<!lf.schema.Column>} */
  this.columns = columns;

  /** @type {?Array<lf.schema.Column>} */
  this.groupByColumns = groupByColumns;
};
goog.inherits(lf.proc.ProjectNode, lf.proc.LogicalQueryPlanNode);


/** @override */
lf.proc.ProjectNode.prototype.toString = function() {
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



/**
 * @constructor @struct
 * @extends {lf.proc.LogicalQueryPlanNode}
 *
 * @param {!Array<!lf.query.SelectContext.OrderBy>} orderBy
 */
lf.proc.OrderByNode = function(orderBy) {
  lf.proc.OrderByNode.base(this, 'constructor');

  /** @type {!Array<!lf.query.SelectContext.OrderBy>} */
  this.orderBy = orderBy;
};
goog.inherits(lf.proc.OrderByNode, lf.proc.LogicalQueryPlanNode);


/** @override */
lf.proc.OrderByNode.prototype.toString = function() {
  return 'order_by(' +
      lf.query.SelectContext.orderByToString(this.orderBy) + ')';
};



/**
 * @constructor @struct
 * @extends {lf.proc.LogicalQueryPlanNode}
 *
 * @param {!Array<!lf.fn.AggregatedColumn>} columns
 */
lf.proc.AggregationNode = function(columns) {
  lf.proc.AggregationNode.base(this, 'constructor');

  /** @type {!Array<!lf.fn.AggregatedColumn>} */
  this.columns = columns;
};
goog.inherits(lf.proc.AggregationNode, lf.proc.LogicalQueryPlanNode);


/** @override */
lf.proc.AggregationNode.prototype.toString = function() {
  return 'aggregation(' + this.columns.toString() + ')';
};



/**
 * @constructor @struct
 * @extends {lf.proc.LogicalQueryPlanNode}
 *
 * @param {!Array<!lf.schema.Column>} columns
 */
lf.proc.GroupByNode = function(columns) {
  lf.proc.GroupByNode.base(this, 'constructor');

  /** @type {!Array<!lf.schema.Column>} */
  this.columns = columns;
};
goog.inherits(lf.proc.GroupByNode, lf.proc.LogicalQueryPlanNode);


/** @override */
lf.proc.GroupByNode.prototype.toString = function() {
  return 'group_by(' + this.columns.toString() + ')';
};



/**
 * @constructor @struct
 * @extends {lf.proc.LogicalQueryPlanNode}
 *
 * @param {number} limit
 */
lf.proc.LimitNode = function(limit) {
  lf.proc.LimitNode.base(this, 'constructor');

  /** @type {number} */
  this.limit = limit;
};
goog.inherits(lf.proc.LimitNode, lf.proc.LogicalQueryPlanNode);


/** @override */
lf.proc.LimitNode.prototype.toString = function() {
  return 'limit(' + this.limit + ')';
};



/**
 * @constructor @struct
 * @extends {lf.proc.LogicalQueryPlanNode}
 *
 * @param {number} skip
 */
lf.proc.SkipNode = function(skip) {
  lf.proc.SkipNode.base(this, 'constructor');

  /** @type {number} */
  this.skip = skip;
};
goog.inherits(lf.proc.SkipNode, lf.proc.LogicalQueryPlanNode);


/** @override */
lf.proc.SkipNode.prototype.toString = function() {
  return 'skip(' + this.skip + ')';
};



/**
 * @constructor @struct
 * @extends {lf.proc.LogicalQueryPlanNode}
 *
 * @param {!lf.pred.JoinPredicate} predicate
 * @param {boolean} isOuterJoin
 */
lf.proc.JoinNode = function(predicate, isOuterJoin) {
  lf.proc.JoinNode.base(this, 'constructor');

  /** @type {!lf.pred.JoinPredicate} */
  this.predicate = predicate;

  /** @type {boolean} */
  this.isOuterJoin = isOuterJoin;
};
goog.inherits(lf.proc.JoinNode, lf.proc.LogicalQueryPlanNode);


/** @override */
lf.proc.JoinNode.prototype.toString = function() {
  return 'join(' +
      'type: ' + (this.isOuterJoin ? 'outer' : 'inner') + ', ' +
      this.predicate.toString() + ')';
};
