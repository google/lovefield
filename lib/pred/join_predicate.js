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
goog.provide('lf.pred.JoinPredicate');

goog.require('goog.labs.structs.Multimap');
goog.require('lf.Global');
goog.require('lf.Row');
goog.require('lf.eval.Type');
goog.require('lf.pred.PredicateNode');
goog.require('lf.proc.Relation');
goog.require('lf.service');



/**
 * @constructor @struct
 * @extends {lf.pred.PredicateNode}
 *
 * @template T
 * @param {!lf.schema.Column} leftColumn
 * @param {!lf.schema.Column} rightColumn
 * @param {!lf.eval.Type} evaluatorType
 */
lf.pred.JoinPredicate = function(leftColumn, rightColumn, evaluatorType) {
  lf.pred.JoinPredicate.base(this, 'constructor');

  /** @type {!lf.schema.Column} */
  this.leftColumn = leftColumn;

  /** @type {!lf.schema.Column} */
  this.rightColumn = rightColumn;

  /** @type {!lf.eval.Type} */
  this.evaluatorType = evaluatorType;

  var registry = /** @type {!lf.eval.Registry} */ (
      lf.Global.get().getService(lf.service.EVAL_REGISTRY));

  /** @private {!function(!T, !T):boolean} */
  this.evaluatorFn_ = registry.getEvaluator(
      this.leftColumn.getType(), this.evaluatorType);
};
goog.inherits(lf.pred.JoinPredicate, lf.pred.PredicateNode);


/** @override */
lf.pred.JoinPredicate.prototype.eval = function(relation) {
  var entries = relation.entries.filter(function(entry) {
    return this.evalRow(entry.row);
  }, this);

  return new lf.proc.Relation(entries, relation.getTables());
};


/** @override */
lf.pred.JoinPredicate.prototype.evalRow = function(row) {
  var leftPrefix = this.leftColumn.getTable().getName();
  var rightPrefix = this.rightColumn.getTable().getName();
  return this.evaluatorFn_(
      row.payload()[leftPrefix][this.leftColumn.getName()],
      row.payload()[rightPrefix][this.rightColumn.getName()]);
};


/** @override */
lf.pred.JoinPredicate.prototype.toString = function() {
  return 'join_pred(' +
      this.leftColumn.getNormalizedName() + ', ' +
      this.rightColumn.getNormalizedName() + ')';
};


/**
 * @param {!lf.proc.Relation} relation
 * @return {boolean} Whether the given relation can be used as the "left"
 *     parameter of this predicate.
 * @private
 */
lf.pred.JoinPredicate.prototype.appliesToLeft_ = function(relation) {
  return relation.getTables().indexOf(
      this.leftColumn.getTable().getName()) != -1;
};


/**
 * @param {!lf.proc.Relation} relation
 * @return {boolean} Whether the given relation can be used as the "right"
 *     parameter of this predicate.
 * @private
 */
lf.pred.JoinPredicate.prototype.appliesToRight_ = function(relation) {
  return relation.getTables().indexOf(
      this.rightColumn.getTable().getName()) != -1;
};


/**
 * Evaluates the predicate by using the input payloads directly, as opposed to
 * combining the payloads to a single row and then evaluating. Combining two
 * payloads to a single row is a very expensive operation and therefore by
 * avoiding combining payloads that don't satisfy the predicate significantly
 * improves performance.
 * @param {!lf.Row} leftRow The first operand.
 * @param {string} leftRowPrefix The prefix to use for all the attributes in the
 *     left operand.
 * @param {!lf.Row} rightRow The second operand.
 * @param {string} rightRowPrefix The prefix to use for all the attributes in
 *     the right operand.
 * @return {boolean} Whether the predicate is satisfied.
 * @private
 */
lf.pred.JoinPredicate.prototype.evalPayloads_ = function(
    leftRow, leftRowPrefix, rightRow, rightRowPrefix) {
  // TODO(user): Figure out when to use the prefix.
  return this.evaluatorFn_(
      leftRow.payload()[this.leftColumn.getName()],
      rightRow.payload()[this.rightColumn.getName()]);
};


/**
 * Detects which input relation should be used as left/right.
 * @param {!lf.proc.Relation} relation1 The first relation to examine.
 * @param {!lf.proc.Relation} relation2 The second relation to examine.
 * @return {!Array.<!lf.proc.Relation>} An array holding the two input relations
 *     in the order [left, right].
 * @private
 */
lf.pred.JoinPredicate.prototype.detectLeftRight_ = function(
    relation1, relation2) {
  var left = null;
  var right = null;

  if (this.appliesToLeft_(relation1)) {
    this.assertRelationsApply_(relation1, relation2);
    left = relation1;
    right = relation2;
  } else {
    this.assertRelationsApply_(relation2, relation1);
    left = relation2;
    right = relation1;
  }

  return [left, right];
};


/**
 * Asserts that the given relations are applicable to this join predicate.
 * Example of non-applicable relations:
 *   - join predicate: photoTable.albumId == albumTable.id
 *   leftRelation.getTables() does not include photoTable, or
 *   rightRelation.getTables() does not include albumTable.
 *
 * @param {!lf.proc.Relation} leftRelation The left relation to examine.
 * @param {!lf.proc.Relation} rightRelation The right relation to examine.
 * @private
 */
lf.pred.JoinPredicate.prototype.assertRelationsApply_ = function(
    leftRelation, rightRelation) {
  goog.asserts.assert(
      this.appliesToLeft_(leftRelation),
      'Mismatch between join predicate left operand and right relation.');
  goog.asserts.assert(
      this.appliesToRight_(rightRelation),
      'Mismatch between join predicate right operand and right relation.');
};


/**
 * Calculates the join between the input relations. The order of the input
 * relations does not matter, since the "left" and "right" relation will be
 * detected.
 * @param {!lf.proc.Relation} relation1 The first relation.
 * @param {!lf.proc.Relation} relation2 The second relation.
 * @return {!lf.proc.Relation}
 */
lf.pred.JoinPredicate.prototype.evalRelations = function(relation1, relation2) {
  var leftRightRelations = this.detectLeftRight_(relation1, relation2);
  var leftRelation = leftRightRelations[0];
  var rightRelation = leftRightRelations[1];

  return this.evaluatorType == lf.eval.Type.EQ ?
      this.evalRelationsHashJoin_(leftRelation, rightRelation) :
      this.evalRelationsNestedLoopJoin_(leftRelation, rightRelation);
};


/**
 * Calculates the join between the input relations using a Nested-Loop-Join
 * algorithm.
 * @param {!lf.proc.Relation} leftRelation The left relation.
 * @param {!lf.proc.Relation} rightRelation The relation relation.
 * @return {!lf.proc.Relation}
 * @private
 */
lf.pred.JoinPredicate.prototype.evalRelationsNestedLoopJoin_ = function(
    leftRelation, rightRelation) {
  var combinedRows = [];

  var leftTableName = leftRelation.getTables()[0];
  var rightTableName = rightRelation.getTables()[0];
  for (var i = 0; i < leftRelation.entries.length; i++) {
    for (var j = 0; j < rightRelation.entries.length; j++) {
      var predicateResult = this.evalPayloads_(
          leftRelation.entries[i].row, leftTableName,
          rightRelation.entries[j].row, rightTableName);
      if (predicateResult) {
        var combinedRow = lf.Row.combineRows(
            leftRelation.entries[i].row, leftTableName,
            rightRelation.entries[j].row, rightTableName);
        combinedRows.push(combinedRow);
      }
    }
  }

  var srcTables = leftRelation.getTables().concat(rightRelation.getTables());
  return lf.proc.Relation.fromRows(combinedRows, srcTables);
};


/**
 * Calculates the join between the input relations using a Hash-Join
 * algorithm. Such a join implementation can only be used if the join conditions
 * is the "equals" operator.
 * @param {!lf.proc.Relation} leftRelation The left relation.
 * @param {!lf.proc.Relation} rightRelation The relation relation.
 * @return {!lf.proc.Relation}
 * @private
 */
lf.pred.JoinPredicate.prototype.evalRelationsHashJoin_ = function(
    leftRelation, rightRelation) {
  // Choosing the smallest of the two relations to be used for the "build" phase
  // of the hash-join algorithm.
  var minRelation = leftRelation;
  var maxRelation = rightRelation;
  var minColumn = this.leftColumn;
  var maxColumn = this.rightColumn;

  if (leftRelation.entries.length > rightRelation.entries.length) {
    minRelation = rightRelation;
    maxRelation = leftRelation;
    minColumn = this.rightColumn;
    maxColumn = this.leftColumn;
  }

  var minTableName = minRelation.getTables()[0];
  var maxTableName = maxRelation.getTables()[0];

  var map = new goog.labs.structs.Multimap();
  var combinedRows = [];

  minRelation.entries.forEach(
      function(entry) {
        var key = entry.row.payload()[minColumn.getName()].toString();
        map.add(key, entry);
      });

  maxRelation.entries.forEach(
      function(entry) {
        var key = entry.row.payload()[maxColumn.getName()].toString();
        if (map.containsKey(key)) {
          var entries = map.get(key);
          entries.forEach(
              function(innerEntry) {
                var combinedRow = lf.Row.combineRows(
                    entry.row, maxTableName,
                    innerEntry.row, minTableName);
                combinedRows.push(combinedRow);
              });
        }
      });

  var srcTables = leftRelation.getTables().concat(rightRelation.getTables());
  return lf.proc.Relation.fromRows(combinedRows, srcTables);
};
