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
goog.provide('lf.proc.PhysicalQueryPlan');

goog.require('goog.Promise');
goog.require('goog.structs.Set');



/**
 * @param {!lf.proc.PhysicalQueryPlanNode} rootNode
 * @constructor @struct
 */
lf.proc.PhysicalQueryPlan = function(rootNode) {
  /** @private {!lf.proc.PhysicalQueryPlanNode} */
  this.rootNode_ = rootNode;
};


/** @return {!lf.proc.PhysicalQueryPlanNode} */
lf.proc.PhysicalQueryPlan.prototype.getRoot = function() {
  return this.rootNode_;
};


/** @return {string} A textual representation of this query plan. */
lf.proc.PhysicalQueryPlan.prototype.explain = function() {
  // TODO(dpapad): Implement this.
  return 'plan description';
};


/**
 * @return {!Array<!lf.schema.Table>} Scope of this plan (i.e. tables
 *     involved).
 */
lf.proc.PhysicalQueryPlan.prototype.getScope = function() {
  var scope = new goog.structs.Set();

  /** @param {!lf.proc.PhysicalQueryPlanNode} node */
  var traverse = function(node) {
    var table = node.getScope();
    if (table) {
      scope.add(table);
    }
    node.getChildren().forEach(function(child) {
      traverse(/** @type {!lf.proc.PhysicalQueryPlanNode} */ (child));
    });
  };

  traverse(this.rootNode_);
  return scope.getValues();
};


/**
 * Calculates the combined scope of the given list of physical query plans.
 * @param {!Array<!lf.proc.PhysicalQueryPlan>} plans
 * @return {!goog.structs.Set<!lf.schema.Table>} The schemas of all tables
 *     involved.
 */
lf.proc.PhysicalQueryPlan.getCombinedScope = function(plans) {
  var tableSet = new goog.structs.Set();
  plans.forEach(function(plan) {
    tableSet.addAll(plan.getScope());
  });
  return tableSet;
};
