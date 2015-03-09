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
goog.provide('lf.proc.LimitStep');

goog.require('lf.proc.PhysicalQueryPlanNode');



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {number} limit
 */
lf.proc.LimitStep = function(limit) {
  lf.proc.LimitStep.base(this, 'constructor',
      1,
      lf.proc.PhysicalQueryPlanNode.ExecType.FIRST_CHILD);

  /** @type {number} */
  this.limit = limit;
};
goog.inherits(lf.proc.LimitStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.LimitStep.prototype.toString = function() {
  return 'limit(' + this.limit + ')';
};


/** @override */
lf.proc.LimitStep.prototype.execInternal = function(journal, relations) {
  relations[0].entries.splice(this.limit);
  return relations;
};
