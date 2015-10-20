/**
 * @license
 * Copyright 2015 The Lovefield Project Authors. All Rights Reserved.
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
goog.provide('lf.proc.SelectStep');

goog.require('lf.proc.PhysicalQueryPlanNode');



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {number} predicateId
 */
lf.proc.SelectStep = function(predicateId) {
  lf.proc.SelectStep.base(this, 'constructor',
      1,
      lf.proc.PhysicalQueryPlanNode.ExecType.FIRST_CHILD);

  /** @type {number} */
  this.predicateId = predicateId;
};
goog.inherits(lf.proc.SelectStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.SelectStep.prototype.toString = function() {
  return 'select(?)';
};


/** @override */
lf.proc.SelectStep.prototype.toContextString = function(context) {
  var predicate = context.getPredicate(this.predicateId);
  return this.toString().replace('?', predicate.toString());
};


/** @override */
lf.proc.SelectStep.prototype.execInternal = function(
    relations, opt_journal, opt_context) {
  // opt_context must be provided for SelectStep.
  var context = opt_context;
  var predicate = context.getPredicate(this.predicateId);
  return [predicate.eval(relations[0])];
};
