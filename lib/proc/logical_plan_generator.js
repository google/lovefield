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
goog.provide('lf.proc.BaseLogicalPlanGenerator');
goog.provide('lf.proc.InsertLogicalPlanGenerator');
goog.provide('lf.proc.LogicalPlanGenerator');
goog.provide('lf.proc.UpdateLogicalPlanGenerator');

goog.require('lf.proc.InsertNode');
goog.require('lf.proc.InsertOrReplaceNode');
goog.require('lf.proc.SelectNode');
goog.require('lf.proc.TableAccessNode');
goog.require('lf.proc.UpdateNode');



/**
 * Interface for all logical plan generators to implement. Generator objects are
 * designed as a one-time use objects.
 * @interface
 * @template TYPE
 */
lf.proc.LogicalPlanGenerator = function() {};


/**
 * Generates the logical plan tree. It is a no-op if called more than once.
 * @return {!lf.proc.LogicalQueryPlanNode}
 */
lf.proc.LogicalPlanGenerator.prototype.generate = function() {};



/**
 * Base class for all logical plan generators to inherit from.
 * @constructor
 * @template TYPE
 * @struct
 * @implements {lf.proc.LogicalPlanGenerator<TYPE>}
 *
 * @param {TYPE} query The query to generate a logical plan tree for.
 */
lf.proc.BaseLogicalPlanGenerator = function(query) {
  /** protected {TYPE} */
  this.query = query;

  /** @private {lf.proc.LogicalQueryPlanNode} */
  this.rootNode_ = null;
};


/** @override */
lf.proc.BaseLogicalPlanGenerator.prototype.generate = function() {
  if (goog.isNull(this.rootNode_)) {
    this.rootNode_ = this.generateInternal();
  }

  return /** @type {!lf.proc.LogicalQueryPlanNode} */ (this.rootNode_);
};


/**
 * Generates the logical plan tree.
 * @return {!lf.proc.LogicalQueryPlanNode} The root node of the logical plan
 *     tree.
 * @protected
 */
lf.proc.BaseLogicalPlanGenerator.prototype.generateInternal =
    goog.abstractMethod;



/**
 * @constructor
 * @struct
 * @extends {lf.proc.BaseLogicalPlanGenerator.<!lf.query.InsertContext>}
 *
 * @param {!lf.query.InsertContext} query
 */
lf.proc.InsertLogicalPlanGenerator = function(query) {
  lf.proc.InsertLogicalPlanGenerator.base(this, 'constructor', query);
};
goog.inherits(lf.proc.InsertLogicalPlanGenerator,
    lf.proc.BaseLogicalPlanGenerator);


/** @override */
lf.proc.InsertLogicalPlanGenerator.prototype.generateInternal = function() {
  return this.query.allowReplace ?
      new lf.proc.InsertOrReplaceNode(this.query.into, this.query.values) :
      new lf.proc.InsertNode(this.query.into, this.query.values);
};



/**
 * @constructor
 * @struct
 * @extends {lf.proc.BaseLogicalPlanGenerator.<!lf.query.UpdateContext>}
 *
 * @param {!lf.query.UpdateContext} query
 */
lf.proc.UpdateLogicalPlanGenerator = function(query) {
  lf.proc.UpdateLogicalPlanGenerator.base(this, 'constructor', query);
};
goog.inherits(lf.proc.UpdateLogicalPlanGenerator,
    lf.proc.BaseLogicalPlanGenerator);


/** @override */
lf.proc.UpdateLogicalPlanGenerator.prototype.generateInternal = function() {
  var updateNode = new lf.proc.UpdateNode(this.query.table);
  var selectNode = goog.isDefAndNotNull(this.query.where) ?
      new lf.proc.SelectNode(this.query.where.copy()) : null;
  var tableAccessNode = new lf.proc.TableAccessNode(this.query.table);

  if (goog.isNull(selectNode)) {
    updateNode.addChild(tableAccessNode);
  } else {
    selectNode.addChild(tableAccessNode);
    updateNode.addChild(selectNode);
  }

  return updateNode;
};
