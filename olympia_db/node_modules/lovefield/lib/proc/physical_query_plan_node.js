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
goog.provide('lf.proc.PhysicalQueryPlanNode');

goog.require('goog.structs.TreeNode');
goog.require('lf.proc.Relation');

goog.forwardDeclare('lf.cache.Journal');
goog.forwardDeclare('lf.schema.Table');



/**
 * @constructor @struct
 * @suppress {checkStructDictInheritance}
 * @extends {goog.structs.TreeNode}
 */
lf.proc.PhysicalQueryPlanNode = function() {
  lf.proc.PhysicalQueryPlanNode.base(this, 'constructor', '', '');
};
goog.inherits(lf.proc.PhysicalQueryPlanNode, goog.structs.TreeNode);


/**
 * @return {?lf.schema.Table} The table for accessing in this node, or null if
 *     this node has no direct access.
 */
lf.proc.PhysicalQueryPlanNode.prototype.getScope = function() {
  return null;
};


/**
 * @param {!lf.cache.Journal} journal
 * @return {!IThenable.<!lf.proc.Relation>}
 */
lf.proc.PhysicalQueryPlanNode.prototype.exec = function(journal) {
  return Promise.resolve(lf.proc.Relation.createEmpty());
};


/** @override */
lf.proc.PhysicalQueryPlanNode.prototype.toString = function() {
  return 'dummy_node';
};
