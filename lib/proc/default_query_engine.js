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
goog.provide('lf.proc.DefaultQueryEngine');

goog.require('lf.proc.LogicalPlanFactory');
goog.require('lf.proc.PhysicalPlanFactory');
goog.require('lf.proc.QueryEngine');



/**
 * @constructor
 * @struct
 * @implements {lf.proc.QueryEngine}
 *
 * @param {!lf.Global} global
 */
lf.proc.DefaultQueryEngine = function(global) {
  /** @private {!lf.proc.LogicalPlanFactory} */
  this.logicalPlanFactory_ = new lf.proc.LogicalPlanFactory();

  /** @private {!lf.proc.PhysicalPlanFactory} */
  this.physicalPlanFactory_ = new lf.proc.PhysicalPlanFactory(global);
};


/** @override */
lf.proc.DefaultQueryEngine.prototype.getPlan = function(query) {
  var logicalQueryPlan = this.logicalPlanFactory_.create(query);
  return this.physicalPlanFactory_.create(logicalQueryPlan, query);
};
