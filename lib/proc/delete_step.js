/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
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
goog.provide('lf.proc.DeleteStep');

goog.require('goog.Promise');
goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.proc.Relation');



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!lf.schema.Table} table
 */
lf.proc.DeleteStep = function(table) {
  lf.proc.DeleteStep.base(this, 'constructor');

  /** @private {!lf.schema.Table} table */
  this.table_ = table;
};
goog.inherits(lf.proc.DeleteStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.DeleteStep.prototype.toString = function() {
  return 'delete(' + this.table_.getName() + ')';
};


/** @override */
lf.proc.DeleteStep.prototype.getScope = function() {
  return this.table_;
};


/** @override */
lf.proc.DeleteStep.prototype.exec = function(journal) {
  // TODO(dpapad): Assert that this node has exactly one child.

  return this.getChildAt(0).exec(journal).then(goog.bind(
      /**
       * @param {!lf.proc.Relation} relation
       * @this {lf.proc.DeleteStep}
       */
      function(relation) {
        var rows = relation.entries.map(function(entry) {
          return entry.row;
        });
        journal.remove(this.table_, rows);
        return goog.Promise.resolve(lf.proc.Relation.createEmpty());
      }, this));
};
