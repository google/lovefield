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
goog.provide('lf.proc.CrossProductNode');
goog.provide('lf.proc.DeleteNode');
goog.provide('lf.proc.InsertNode');
goog.provide('lf.proc.InsertOrReplaceNode');
goog.provide('lf.proc.JoinNode');
goog.provide('lf.proc.LimitNode');
goog.provide('lf.proc.LogicalQueryPlanNode');
goog.provide('lf.proc.OrderByNode');
goog.provide('lf.proc.ProjectNode');
goog.provide('lf.proc.SelectNode');
goog.provide('lf.proc.SkipNode');
goog.provide('lf.proc.TableAccessNode');
goog.provide('lf.proc.UpdateNode');

goog.require('goog.structs.TreeNode');
goog.require('lf.query.SelectContext');



/**
 * @constructor @struct
 * @suppress {checkStructDictInheritance}
 * @extends {goog.structs.TreeNode}
 */
lf.proc.LogicalQueryPlanNode = function() {
  lf.proc.LogicalQueryPlanNode.base(this, 'constructor', '', '');
};
goog.inherits(lf.proc.LogicalQueryPlanNode, goog.structs.TreeNode);



/**
 * @constructor @struct
 * @extends {lf.proc.LogicalQueryPlanNode}
 *
 * @param {!lf.schema.Table} table
 * @param {!Array.<!lf.Row>} values
 */
lf.proc.InsertNode = function(table, values) {
  lf.proc.InsertNode.base(this, 'constructor');

  /** @type {!lf.schema.Table} */
  this.table = table;

  /** @type {!Array.<!lf.Row>} */
  this.values = values;
};
goog.inherits(lf.proc.InsertNode, lf.proc.LogicalQueryPlanNode);



/**
 * @constructor @struct
 * @extends {lf.proc.InsertNode}
 *
 * @param {!lf.schema.Table} table
 * @param {!Array.<!lf.Row>} values
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
 * @param {!Array.<!lf.query.UpdateContext.Set>} updates
 */
lf.proc.UpdateNode = function(table, updates) {
  lf.proc.UpdateNode.base(this, 'constructor');

  /** @type {!lf.schema.Table} */
  this.table = table;

  /** @type {!Array.<!lf.query.UpdateContext.Set>} */
  this.updates = updates;
};
goog.inherits(lf.proc.UpdateNode, lf.proc.LogicalQueryPlanNode);


/** @override */
lf.proc.UpdateNode.prototype.toString = function() {
  var columns = this.updates.map(function(update) {
    return update.column.getName();
  }, this);
  return 'update(' + this.table.getName() + ', [' + columns.join(',') + '])';
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
  return 'table_access(' + this.table.getName() + ')';
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
 * @param {!Array.<!lf.schema.Column>} columns
 * @param {?lf.schema.Column} groupByColumn
 */
lf.proc.ProjectNode = function(columns, groupByColumn) {
  lf.proc.ProjectNode.base(this, 'constructor');

  /** @type {!Array.<!lf.schema.Column>} */
  this.columns = columns;

  /** @type {?lf.schema.Column} */
  this.groupByColumn = groupByColumn;
};
goog.inherits(lf.proc.ProjectNode, lf.proc.LogicalQueryPlanNode);


/** @override */
lf.proc.ProjectNode.prototype.toString = function() {
  var string = 'project(' + this.columns.toString();
  if (!goog.isNull(this.groupByColumn)) {
    string += ', groupBy(' + this.groupByColumn.getNormalizedName() + ')';
  }
  string += ')';
  return string;
};



/**
 * @constructor @struct
 * @extends {lf.proc.LogicalQueryPlanNode}
 *
 * @param {!Array.<!lf.query.SelectContext.OrderBy>} orderBy
 */
lf.proc.OrderByNode = function(orderBy) {
  lf.proc.OrderByNode.base(this, 'constructor');

  /** @type {!Array.<!lf.query.SelectContext.OrderBy>} */
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
 * @param {!lf.Predicate} predicate
 */
lf.proc.JoinNode = function(predicate) {
  lf.proc.JoinNode.base(this, 'constructor');

  /** @type {!lf.Predicate} */
  this.predicate = predicate;
};
goog.inherits(lf.proc.JoinNode, lf.proc.LogicalQueryPlanNode);


/** @override */
lf.proc.JoinNode.prototype.toString = function() {
  return 'join(' + this.predicate.toString() + ')';
};
