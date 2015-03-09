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
goog.provide('lf.testing.proc.DummyStep');

goog.require('goog.Promise');
goog.require('lf.proc.PhysicalQueryPlanNode');



/**
 * A dummy execution step to be used for testing.
 * @constructor @struct
 * @final
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!Array<lf.proc.Relation>} relations The relation to return from
 *     exec().
 */
lf.testing.proc.DummyStep = function(relations) {
  lf.testing.proc.DummyStep.base(this, 'constructor',
      lf.proc.PhysicalQueryPlanNode.ANY,
      lf.proc.PhysicalQueryPlanNode.ExecType.NO_CHILD);

  /** @private {!Array<lf.proc.Relation>} */
  this.relations_ = relations;
};
goog.inherits(lf.testing.proc.DummyStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.testing.proc.DummyStep.prototype.execInternal = function(tx) {
  return this.relations_;
};
