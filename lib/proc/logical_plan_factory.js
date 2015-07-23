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
goog.provide('lf.proc.LogicalPlanFactory');

goog.require('lf.Exception');
goog.require('lf.proc.AndPredicatePass');
goog.require('lf.proc.CrossProductPass');
goog.require('lf.proc.DeleteLogicalPlanGenerator');
goog.require('lf.proc.ImplicitJoinsPass');
goog.require('lf.proc.InsertLogicalPlanGenerator');
goog.require('lf.proc.LogicalQueryPlan');
goog.require('lf.proc.PushDownSelectionsPass');
goog.require('lf.proc.SelectLogicalPlanGenerator');
goog.require('lf.proc.UpdateLogicalPlanGenerator');
goog.require('lf.query.DeleteContext');
goog.require('lf.query.InsertContext');
goog.require('lf.query.SelectContext');
goog.require('lf.query.UpdateContext');



/**
 * A factory used to create a logical query plan corresponding to a given query.
 * @constructor @struct
 */
lf.proc.LogicalPlanFactory = function() {
  /** @private {!Array<!lf.proc.RewritePass>} */
  this.selectOptimizationPasses_ = [
    new lf.proc.AndPredicatePass(),
    new lf.proc.CrossProductPass(),
    new lf.proc.PushDownSelectionsPass(),
    new lf.proc.ImplicitJoinsPass()
  ];

  /** @private {!Array<!lf.proc.RewritePass>} */
  this.deleteOptimizationPasses_ = [
    new lf.proc.AndPredicatePass()
  ];
};


/**
 * @param {!lf.query.Context} query
 * @return {!lf.proc.LogicalQueryPlan}
 */
lf.proc.LogicalPlanFactory.prototype.create = function(query) {
  var generator = null;
  if (query instanceof lf.query.InsertContext) {
    generator = new lf.proc.InsertLogicalPlanGenerator(query);
  } else if (query instanceof lf.query.DeleteContext) {
    generator = new lf.proc.DeleteLogicalPlanGenerator(
        query, this.deleteOptimizationPasses_);
  } else if (query instanceof lf.query.SelectContext) {
    generator = new lf.proc.SelectLogicalPlanGenerator(
        query, this.selectOptimizationPasses_);
  } else if (query instanceof lf.query.UpdateContext) {
    generator = new lf.proc.UpdateLogicalPlanGenerator(query);
  } else {
    // 513: Unknown query context.
    throw new lf.Exception(513);
  }

  var rootNode = generator.generate();
  return new lf.proc.LogicalQueryPlan(rootNode, query.getScope());
};
