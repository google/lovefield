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
goog.provide('lf.proc.SkipStep');

goog.require('goog.asserts');
goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.proc.Relation');



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {number} skip
 */
lf.proc.SkipStep = function(skip) {
  lf.proc.SkipStep.base(this, 'constructor');

  /** @type {number} */
  this.skip = skip;
};
goog.inherits(lf.proc.SkipStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.SkipStep.prototype.toString = function() {
  return 'skip(' + this.skip + ')';
};


/** @override */
lf.proc.SkipStep.prototype.exec = function(journal) {
  goog.asserts.assert(
      this.getChildCount() == 1,
      'SkipStep should have exactly one child.');

  return this.getChildAt(0).exec(journal).then(goog.bind(
      /**
       * @param {!lf.proc.Relation} relation
       * @this {lf.proc.SkipStep}
       */
      function(relation) {
        return new lf.proc.Relation(
            relation.entries.slice(this.skip), relation.getTables());
      }, this));

};
