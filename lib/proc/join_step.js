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
goog.provide('lf.proc.JoinStep');

goog.require('goog.Promise');
goog.require('goog.asserts');
goog.require('lf.proc.PhysicalQueryPlanNode');



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!lf.Predicate} predicate
 */
lf.proc.JoinStep = function(predicate) {
  lf.proc.JoinStep.base(this, 'constructor',
      2,
      lf.proc.PhysicalQueryPlanNode.ExecType.ALL);

  /** @private {!lf.Predicate} */
  this.predicate_ = predicate;
};
goog.inherits(lf.proc.JoinStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.JoinStep.prototype.toString = function() {
  return 'join(' + this.predicate_.toString() + ')';
};


/** @override */
lf.proc.JoinStep.prototype.execInternal = function(journal, relations) {
  return [this.predicate_.evalRelations(relations[0], relations[1])];
};
