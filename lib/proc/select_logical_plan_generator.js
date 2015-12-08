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
goog.provide('lf.proc.SelectLogicalPlanGenerator');

goog.require('lf.fn.AggregatedColumn');
goog.require('lf.proc.AggregationNode');
goog.require('lf.proc.BaseLogicalPlanGenerator');
goog.require('lf.proc.CrossProductNode');
goog.require('lf.proc.GroupByNode');
goog.require('lf.proc.LimitNode');
goog.require('lf.proc.LogicalPlanRewriter');
goog.require('lf.proc.OrderByNode');
goog.require('lf.proc.ProjectNode');
goog.require('lf.proc.SelectNode');
goog.require('lf.proc.SkipNode');
goog.require('lf.proc.TableAccessNode');



/**
 * @constructor
 * @struct
 * @extends {lf.proc.BaseLogicalPlanGenerator.<!lf.query.SelectContext>}
 *
 * @param {!lf.query.SelectContext} query
 * @param {!Array<!lf.proc.RewritePass>} rewritePasses
 */
lf.proc.SelectLogicalPlanGenerator = function(query, rewritePasses) {
  lf.proc.SelectLogicalPlanGenerator.base(this, 'constructor', query);

  /** @private {!Array<!lf.proc.RewritePass>} */
  this.rewritePasses_ = rewritePasses;

  /** @private {Array<!lf.proc.LogicalQueryPlanNode>} */
  this.tableAccessNodes_ = null;

  /** @private {lf.proc.LogicalQueryPlanNode} */
  this.crossProductNode_ = null;

  /** @private {lf.proc.LogicalQueryPlanNode} */
  this.selectNode_ = null;

  /** @private {lf.proc.LogicalQueryPlanNode} */
  this.groupByNode_ = null;

  /** @private {lf.proc.LogicalQueryPlanNode} */
  this.aggregationNode_ = null;

  /** @private {lf.proc.LogicalQueryPlanNode} */
  this.orderByNode_ = null;

  /** @private {lf.proc.LogicalQueryPlanNode} */
  this.skipNode_ = null;

  /** @private {lf.proc.LogicalQueryPlanNode} */
  this.limitNode_ = null;

  /** @private {lf.proc.LogicalQueryPlanNode} */
  this.projectNode_ = null;
};
goog.inherits(lf.proc.SelectLogicalPlanGenerator,
    lf.proc.BaseLogicalPlanGenerator);


/** @override */
lf.proc.SelectLogicalPlanGenerator.prototype.generateInternal = function() {
  this.generateNodes_();
  var rootNode = this.connectNodes_();

  // Optimizing the "naive" logical plan.
  var planRewriter = new lf.proc.LogicalPlanRewriter(
      rootNode, this.query, this.rewritePasses_);
  return planRewriter.generate();
};


/**
 * Generates all the nodes that will make up the logical plan tree. After
 * this function returns all nodes have been created, but they are not yet
 * connected to each other.
 * @private
 */
lf.proc.SelectLogicalPlanGenerator.prototype.generateNodes_ = function() {
  this.generateTableAccessNodes_();
  this.generateCrossProductNode_();
  this.generateSelectNode_();
  this.generateOrderByNode_();
  this.generateSkipNode_();
  this.generateLimitNode_();
  this.generateGroupByNode_();
  this.generateAggregationNode_();
  this.generateProjectNode_();
};


/**
 * Connects the nodes together such that the logical plan tree is formed.
 * @return {!lf.proc.LogicalQueryPlanNode} rootNode
 * @private
 */
lf.proc.SelectLogicalPlanGenerator.prototype.connectNodes_ = function() {
  var parentOrder = [
    this.limitNode_, this.skipNode_, this.projectNode_, this.orderByNode_,
    this.aggregationNode_, this.groupByNode_, this.selectNode_,
    this.crossProductNode_
  ];

  var lastExistingParentIndex = -1;
  var rootNode = null;
  for (var i = 0; i < parentOrder.length; i++) {
    var node = parentOrder[i];
    if (!goog.isNull(node)) {
      if (goog.isNull(rootNode)) {
        rootNode = node;
      } else {
        parentOrder[lastExistingParentIndex].addChild(node);
      }
      lastExistingParentIndex = i;
    }
  }

  this.tableAccessNodes_.forEach(function(tableAccessNode) {
    parentOrder[lastExistingParentIndex].addChild(tableAccessNode);
  });

  return rootNode;
};


/** @private */
lf.proc.SelectLogicalPlanGenerator.prototype.generateTableAccessNodes_ =
    function() {
  this.tableAccessNodes_ = this.query.from.map(function(table) {
    return new lf.proc.TableAccessNode(table);
  }, this);
};


/** @private */
lf.proc.SelectLogicalPlanGenerator.prototype.generateCrossProductNode_ =
    function() {
  if (this.query.from.length >= 2) {
    this.crossProductNode_ = new lf.proc.CrossProductNode();
  }
};


/** @private */
lf.proc.SelectLogicalPlanGenerator.prototype.generateSelectNode_ = function() {
  this.selectNode_ = goog.isDefAndNotNull(this.query.where) ?
      new lf.proc.SelectNode(this.query.where.copy()) : null;
};


/** @private */
lf.proc.SelectLogicalPlanGenerator.prototype.generateOrderByNode_ = function() {
  if (this.query.orderBy) {
    this.orderByNode_ = new lf.proc.OrderByNode(this.query.orderBy);
  }
};


/** @private */
lf.proc.SelectLogicalPlanGenerator.prototype.generateLimitNode_ = function() {
  if (goog.isDefAndNotNull(this.query.limit)) {
    this.limitNode_ = new lf.proc.LimitNode(this.query.limit);
  }
};


/** @private */
lf.proc.SelectLogicalPlanGenerator.prototype.generateSkipNode_ = function() {
  if (goog.isDefAndNotNull(this.query.skip) && this.query.skip > 0) {
    this.skipNode_ = new lf.proc.SkipNode(this.query.skip);
  }
};


/** @private */
lf.proc.SelectLogicalPlanGenerator.prototype.generateGroupByNode_ = function() {
  if (goog.isDefAndNotNull(this.query.groupBy)) {
    this.groupByNode_ = new lf.proc.GroupByNode(this.query.groupBy);
  }
};


/** @private */
lf.proc.SelectLogicalPlanGenerator.prototype.generateAggregationNode_ =
    function() {
  var aggregatedColumns = this.query.columns.filter(
      function(column) {
        return column instanceof lf.fn.AggregatedColumn;
      });

  if (goog.isDefAndNotNull(this.query.orderBy)) {
    this.query.orderBy.forEach(function(orderBy) {
      if (orderBy.column instanceof lf.fn.AggregatedColumn) {
        aggregatedColumns.push(orderBy.column);
      }
    });
  }

  if (aggregatedColumns.length > 0) {
    this.aggregationNode_ = new lf.proc.AggregationNode(aggregatedColumns);
  }
};


/** @private */
lf.proc.SelectLogicalPlanGenerator.prototype.generateProjectNode_ = function() {
  this.projectNode_ = new lf.proc.ProjectNode(
      this.query.columns || [],
      this.query.groupBy || null);
};
