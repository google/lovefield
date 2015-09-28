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
goog.provide('lf.proc.NoOpStep');

goog.require('lf.proc.PhysicalQueryPlanNode');



/**
 * A dummy execution step that performs no actual work.
 * @constructor @struct
 * @final
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!Array<!lf.proc.Relation>} relations The relations to return from
 *     exec().
 */
lf.proc.NoOpStep = function(relations) {
  lf.proc.NoOpStep.base(this, 'constructor',
      lf.proc.PhysicalQueryPlanNode.ANY,
      lf.proc.PhysicalQueryPlanNode.ExecType.NO_CHILD);

  /** @private {!Array<!lf.proc.Relation>} */
  this.relations_ = relations;
};
goog.inherits(lf.proc.NoOpStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.NoOpStep.prototype.toString = function() {
  return 'no_op_step(' + this.relations_[0].getTables().join(',') + ')';
};


/** @override */
lf.proc.NoOpStep.prototype.execInternal = function(relations) {
  return this.relations_;
};
