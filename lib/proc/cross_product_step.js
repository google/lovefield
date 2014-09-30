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
goog.provide('lf.proc.CrossProductStep');

goog.require('goog.Promise');
goog.require('goog.asserts');
goog.require('lf.Row');
goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.proc.Relation');



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 */
lf.proc.CrossProductStep = function() {
  lf.proc.CrossProductStep.base(this, 'constructor');
};
goog.inherits(lf.proc.CrossProductStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.CrossProductStep.prototype.toString = function() {
  return 'cross_product';
};


/** @override */
lf.proc.CrossProductStep.prototype.exec = function(tx) {
  goog.asserts.assert(
      this.getChildCount() == 2,
      'Only cross-products of 2 relations are currently supported.');
  var promises = this.getChildren().map(function(child) {
    return child.exec(tx);
  });

  return goog.Promise.all(promises).then(goog.bind(
      /**
       * @param {!Array.<!lf.proc.Relation>} results
       * @return {!lf.proc.Relation}
       */
      function(results) {
        return lf.proc.CrossProductStep.crossProduct_(results[0], results[1]);
      }, this));
};


/**
 * Calculates the cross product of two relations.
 * @param {!lf.proc.Relation} leftRelation The first relation.
 * @param {!lf.proc.Relation} rightRelation The second relation.
 * @return {!lf.proc.Relation} The combined relation.
 * @private
 */
lf.proc.CrossProductStep.crossProduct_ = function(
    leftRelation, rightRelation) {
  var combinedRows = [];

  var leftTableName = leftRelation.getTables()[0];
  var rightTableName = rightRelation.getTables()[0];
  for (var i = 0; i < leftRelation.entries.length; i++) {
    for (var j = 0; j < rightRelation.entries.length; j++) {
      var combinedRow = lf.Row.combineRows(
          leftRelation.entries[i].row, leftTableName,
          rightRelation.entries[j].row, rightTableName);
      combinedRows.push(combinedRow);
    }
  }

  var srcTables = leftRelation.getTables().concat(rightRelation.getTables());
  return lf.proc.Relation.fromRows(combinedRows, srcTables);
};
