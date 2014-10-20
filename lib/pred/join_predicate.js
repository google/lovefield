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
goog.require('lf.eval.Type');
goog.require('lf.pred.PredicateNode');
goog.require('lf.proc.Relation');
goog.require('lf.proc.RelationEntry');
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
    var leftValue = entry.getField(this.leftColumn);
    var rightValue = entry.getField(this.rightColumn);
    return this.evaluatorFn_(leftValue, rightValue);
  }, this);

  return new lf.proc.Relation(entries, relation.getTables());
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
  var combinedEntries = [];

  var leftRelationTables = leftRelation.getTables();
  var rightRelationTables = rightRelation.getTables();
  for (var i = 0; i < leftRelation.entries.length; i++) {
    for (var j = 0; j < rightRelation.entries.length; j++) {
      // Evaluating before combining the rows, since combining is fairly
      // expensive.
      var predicateResult = this.evaluatorFn_(
          leftRelation.entries[i].getField(this.leftColumn),
          rightRelation.entries[j].getField(this.rightColumn));

      if (predicateResult) {
        var combinedEntry = lf.proc.RelationEntry.combineEntries(
            leftRelation.entries[i], leftRelationTables,
            rightRelation.entries[j], rightRelationTables);
        combinedEntries.push(combinedEntry);
      }
    }
  }

  var srcTables = leftRelation.getTables().concat(rightRelation.getTables());
  return new lf.proc.Relation(combinedEntries, srcTables);
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

  var map = new goog.labs.structs.Multimap();
  var combinedEntries = [];

  minRelation.entries.forEach(
      function(entry) {
        var key = String(entry.getField(minColumn));
        map.add(key, entry);
      });

  var minRelationTableNames = minRelation.getTables();
  var maxRelationTableNames = maxRelation.getTables();

  maxRelation.entries.forEach(
      function(entry) {
        var key = String(entry.getField(maxColumn));
        if (map.containsKey(key)) {
          var entries = /** @type {!Array.<!lf.proc.RelationEntry>} */ (
              map.get(key));
          entries.forEach(
              function(innerEntry) {
                var combinedEntry = lf.proc.RelationEntry.combineEntries(
                    entry, maxRelationTableNames,
                    innerEntry, minRelationTableNames);
                combinedEntries.push(combinedEntry);
              });
        }
      });

  var srcTables = leftRelation.getTables().concat(rightRelation.getTables());
  return new lf.proc.Relation(combinedEntries, srcTables);
};
