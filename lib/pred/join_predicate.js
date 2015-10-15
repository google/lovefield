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
goog.provide('lf.pred.JoinPredicate');

goog.require('goog.asserts');
goog.require('lf.Row');
goog.require('lf.eval.Registry');
goog.require('lf.eval.Type');
goog.require('lf.pred.PredicateNode');
goog.require('lf.proc.Relation');
goog.require('lf.proc.RelationEntry');
goog.require('lf.structs.MapSet');
goog.require('lf.structs.set');



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

  /** @private {Object} */
  this.nullPayload_ = null;

  var registry = lf.eval.Registry.get();

  /** @private {!function(T, T):boolean} */
  this.evaluatorFn_ = registry.getEvaluator(
      this.leftColumn.getType(), this.evaluatorType);

  /** @private {!function(T):(string|number|null)} */
  this.keyOfIndexFn_ = registry.getKeyOfIndexEvaluator(
      this.leftColumn.getType());
};
goog.inherits(lf.pred.JoinPredicate, lf.pred.PredicateNode);


/**
 * @typedef {{
 *   indexedColumn: !lf.schema.Column,
 *   nonIndexedColumn: !lf.schema.Column,
 *   index: !lf.index.Index
 * }}
 */
lf.pred.JoinPredicate.IndexJoinInfo;


/**
 * Exponent of block size, so the block size is 2^(BLOCK_SIZE_EXPONENT_).
 * @private
 * @const
 */
lf.pred.JoinPredicate.BLOCK_SIZE_EXPONENT_ = 8;


/** @override */
lf.pred.JoinPredicate.prototype.copy = function() {
  var clone = new lf.pred.JoinPredicate(
      this.leftColumn, this.rightColumn, this.evaluatorType);
  clone.setId(this.getId());
  return clone;
};


/** @override */
lf.pred.JoinPredicate.prototype.getColumns = function(opt_results) {
  if (goog.isDefAndNotNull(opt_results)) {
    opt_results.push(this.leftColumn);
    opt_results.push(this.rightColumn);
    return opt_results;
  } else {
    return [this.leftColumn, this.rightColumn];
  }
};


/** @override */
lf.pred.JoinPredicate.prototype.getTables = function(opt_results) {
  var tables = goog.isDefAndNotNull(opt_results) ?
      opt_results : lf.structs.set.create();
  tables.add(this.leftColumn.getTable());
  tables.add(this.rightColumn.getTable());
  return tables;
};


/**
 * Creates a new predicate with the  left and right columns swapped and
 * operator changed (if necessary).
 * @return {!lf.Predicate}
 */
lf.pred.JoinPredicate.prototype.reverse = function() {
  var evaluatorType = this.evaluatorType;
  switch (this.evaluatorType) {
    case lf.eval.Type.GT:
      evaluatorType = lf.eval.Type.LT;
      break;
    case lf.eval.Type.LT:
      evaluatorType = lf.eval.Type.GT;
      break;
    case lf.eval.Type.GTE:
      evaluatorType = lf.eval.Type.LTE;
      break;
    case lf.eval.Type.LTE:
      evaluatorType = lf.eval.Type.GTE;
      break;
  }
  var newPredicate = new lf.pred.JoinPredicate(
      this.rightColumn, this.leftColumn, evaluatorType);
  return newPredicate;
};


/**
 * Swaps left and right columns and changes operator (if necessary).
 * @private
 */
lf.pred.JoinPredicate.prototype.reverseSelf_ = function() {
  var temp = this.leftColumn;
  this.leftColumn = this.rightColumn;
  this.rightColumn = temp;

  var evaluatorType = this.evaluatorType;
  switch (this.evaluatorType) {
    case lf.eval.Type.GT:
      evaluatorType = lf.eval.Type.LT;
      break;
    case lf.eval.Type.LT:
      evaluatorType = lf.eval.Type.GT;
      break;
    case lf.eval.Type.GTE:
      evaluatorType = lf.eval.Type.LTE;
      break;
    case lf.eval.Type.LTE:
      evaluatorType = lf.eval.Type.GTE;
      break;
    default:
      return;
  }
  this.evaluatorType = evaluatorType;
  this.evaluatorFn_ = lf.eval.Registry.get().getEvaluator(
      this.leftColumn.getType(), this.evaluatorType);
};


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
      this.leftColumn.getNormalizedName() + ' ' +
      this.evaluatorType + ' ' +
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
      this.leftColumn.getTable().getEffectiveName()) != -1;
};


/**
 * @param {!lf.proc.Relation} relation
 * @return {boolean} Whether the given relation can be used as the "right"
 *     parameter of this predicate.
 * @private
 */
lf.pred.JoinPredicate.prototype.appliesToRight_ = function(relation) {
  return relation.getTables().indexOf(
      this.rightColumn.getTable().getEffectiveName()) != -1;
};


/**
 * Detects which input relation should be used as left/right. If predicate
 * order does not match with the left and right relations, left and right are
 * reversed. If the right table has larger size, then the left, right and
 * evaluation type are reversed (This is done to make it more cache efficient).
 * @param {!lf.proc.Relation} relation1 The first relation to examine.
 * @param {!lf.proc.Relation} relation2 The second relation to examine.
 * @return {!Array<!lf.proc.Relation>} An array holding the two input relations
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
  if (left.entries.length > right.entries.length) {
    this.reverseSelf_();
    this.assertRelationsApply_(right, left);
    return [right, left];
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
 * Creates a row with null columns with column names obtained from the table.
 * @param {!lf.schema.Table} table
 * @return {!Object}
 * @private
 */
lf.pred.JoinPredicate.prototype.createNullPayload_ = function(table) {
  var payload = {};
  table.getColumns().forEach(function(column) {
    payload[column.getName()] = null;
  });
  return payload;
};


/**
 * Creates a combined entry with an unmatched left entry from outer join
 * algorithm and a null entry.
 * @param {!lf.proc.RelationEntry} entry The left relation entry.
 * @param {!Array<string>} leftRelationTables
 * @return {!lf.proc.RelationEntry}
 * @private
 */
lf.pred.JoinPredicate.prototype.createCombinedEntryForUnmatched_ = function(
    entry, leftRelationTables) {
  if (goog.isNull(this.nullPayload_)) {
    this.nullPayload_ = this.createNullPayload_(
        this.rightColumn.getTable());
  }
  // The right relation is guaranteed to never be the result
  // of a previous join.
  var nullEntry = new lf.proc.RelationEntry(
      new lf.Row(lf.Row.DUMMY_ID, this.nullPayload_), false);
  var combinedEntry = lf.proc.RelationEntry.combineEntries(
      entry, leftRelationTables,
      nullEntry, [this.rightColumn.getTable().getEffectiveName()]);
  return combinedEntry;
};


/**
 * Calculates the join between the input relations using a Nested-Loop-Join
 * algorithm.
 * Nulls cannot be matched. Hence Inner join does not return null matches
 * at all and Outer join retains each null entry of the left table.
 * @param {!lf.proc.Relation} leftRelation The left relation.
 * @param {!lf.proc.Relation} rightRelation The relation relation.
 * @param {boolean} isOuterJoin
 * @return {!lf.proc.Relation}
 */
lf.pred.JoinPredicate.prototype.evalRelationsNestedLoopJoin = function(
    leftRelation, rightRelation, isOuterJoin) {
  var leftRightRelations = [leftRelation, rightRelation];
  // For outer join, left and right are not interchangeable.
  if (!isOuterJoin) {
    leftRightRelations = this.detectLeftRight_(leftRelation, rightRelation);
  }
  leftRelation = leftRightRelations[0];
  rightRelation = leftRightRelations[1];

  var combinedEntries = [];
  var leftRelationTables = leftRelation.getTables();
  var rightRelationTables = rightRelation.getTables();
  var leftEntriesLength = leftRelation.entries.length;
  var rightEntriesLength = rightRelation.entries.length;

  // Since block size is a power of two, we can use bitwise operators.
  var blockNumBits = lf.pred.JoinPredicate.BLOCK_SIZE_EXPONENT_;
  // This is equivalent to Math.ceil(rightEntriesLength/blockSize).
  var blockCount =
      (rightEntriesLength + (1 << blockNumBits) - 1) >> blockNumBits;
  var currentBlock = 0;
  // The inner loop is executed in blocks. Blocking helps in prefetching
  // the next contents by CPU and also reduces cache misses as long as a block
  // is close to the size of cache.
  while (currentBlock < blockCount) {
    for (var i = 0; i < leftEntriesLength; i++) {
      var matchFound = false;
      var leftValue = leftRelation.entries[i].getField(this.leftColumn);
      if (!goog.isNull(leftValue)) {
        var rightLimit =
            Math.min((currentBlock + 1) << blockNumBits, rightEntriesLength);
        for (var j = currentBlock << blockNumBits; j < rightLimit; j++) {
          // Evaluating before combining the rows, since combining is fairly
          // expensive.
          var predicateResult = this.evaluatorFn_(
              leftValue,
              rightRelation.entries[j].getField(this.rightColumn));

          if (predicateResult) {
            matchFound = true;
            var combinedEntry = lf.proc.RelationEntry.combineEntries(
                leftRelation.entries[i], leftRelationTables,
                rightRelation.entries[j], rightRelationTables);
            combinedEntries.push(combinedEntry);
          }
        }
      }
      if (isOuterJoin && !matchFound) {
        combinedEntries.push(this.createCombinedEntryForUnmatched_(
            leftRelation.entries[i], leftRelationTables));
      }
    }
    currentBlock++;
  }
  var srcTables = leftRelation.getTables().concat(rightRelation.getTables());
  return new lf.proc.Relation(combinedEntries, srcTables);
};


/**
 * Calculates the join between the input relations using a Hash-Join
 * algorithm. Such a join implementation can only be used if the join conditions
 * is the "equals" operator.
 * Nulls cannot be matched. Hence Inner join does not return null matches
 * at all and Outer join retains each null entry of the left table.
 * @param {!lf.proc.Relation} leftRelation The left relation.
 * @param {!lf.proc.Relation} rightRelation The relation relation.
 * @param {boolean} isOuterJoin
 * @return {!lf.proc.Relation}
 */
lf.pred.JoinPredicate.prototype.evalRelationsHashJoin = function(
    leftRelation, rightRelation, isOuterJoin) {
  var leftRightRelations = [leftRelation, rightRelation];
  // For outer join, left and right are not interchangeable.
  if (!isOuterJoin) {
    leftRightRelations = this.detectLeftRight_(leftRelation, rightRelation);
  }
  leftRelation = leftRightRelations[0];
  rightRelation = leftRightRelations[1];

  // If it is an outerjoin, then swap to make sure that the right table is
  // used for the "build" phase of the hash-join algorithm. If it is inner
  // join, choose the smaller of the two relations to be used for the "build"
  // phase.
  var minRelation = leftRelation;
  var maxRelation = rightRelation;
  var minColumn = this.leftColumn;
  var maxColumn = this.rightColumn;
  if (isOuterJoin) {
    minRelation = rightRelation;
    maxRelation = leftRelation;
    minColumn = this.rightColumn;
    maxColumn = this.leftColumn;
  }

  var map = new lf.structs.MapSet();
  var combinedEntries = [];

  minRelation.entries.forEach(
      function(entry) {
        var key = String(entry.getField(minColumn));
        map.set(key, entry);
      });

  var minRelationTableNames = minRelation.getTables();
  var maxRelationTableNames = maxRelation.getTables();

  maxRelation.entries.forEach(
      function(entry) {
        var value = entry.getField(maxColumn);
        var key = String(value);
        if (!goog.isNull(value) && map.has(key)) {
          map.get(key).forEach(function(innerEntry) {
            var combinedEntry = lf.proc.RelationEntry.combineEntries(
                entry, maxRelationTableNames,
                innerEntry, minRelationTableNames);
            combinedEntries.push(combinedEntry);
          });
        } else {
          if (isOuterJoin) {
            combinedEntries.push(this.createCombinedEntryForUnmatched_(
                entry, maxRelationTableNames));
          }
        }
      }.bind(this));

  var srcTables = leftRelation.getTables().concat(rightRelation.getTables());
  return new lf.proc.Relation(combinedEntries, srcTables);
};


/**
 * @param {!lf.proc.Relation} leftRelation The left relation.
 * @param {!lf.proc.Relation} rightRelation The relation relation.
 * @param {!lf.pred.JoinPredicate.IndexJoinInfo} indexJoinInfo
 * @param {!lf.cache.Cache} cache
 * @return {!lf.proc.Relation}
 */
lf.pred.JoinPredicate.prototype.evalRelationsIndexNestedLoopJoin = function(
    leftRelation, rightRelation, indexJoinInfo, cache) {
  goog.asserts.assert(
      this.evaluatorType == lf.eval.Type.EQ,
      'For now, index nested loop join can only be leveraged for EQ.');

  // Detecting which relation should be used as outer (non-indexed) and which
  // as inner (indexed).
  var indexedTable = indexJoinInfo.indexedColumn.getTable();
  var outerRelation = leftRelation;
  var innerRelation = rightRelation;
  if (leftRelation.getTables().indexOf(
      indexedTable.getEffectiveName()) != -1) {
    outerRelation = rightRelation;
    innerRelation = leftRelation;
  }

  var combinedEntries = [];
  var innerRelationTables = innerRelation.getTables();
  var outerRelationTables = outerRelation.getTables();

  /**
   * Generates and pushes a new combined entry to the results.
   * @param {!lf.proc.RelationEntry} outerEntry
   * @param {!lf.Row} row The row corresponding to the inner entry.
   */
  var pushCombinedEntry = function(outerEntry, row) {
    var innerEntry = new lf.proc.RelationEntry(
        /** @type {!lf.Row} */ (row), innerRelationTables.length > 1);
    var combinedEntry = lf.proc.RelationEntry.combineEntries(
        outerEntry, outerRelationTables,
        innerEntry, innerRelationTables);
    combinedEntries.push(combinedEntry);
  };

  outerRelation.entries.forEach(
      function(entry) {
        var keyOfIndex = this.keyOfIndexFn_(
            /** @type {(number|string|boolean|!Date|null)} */ (
                entry.getField(indexJoinInfo.nonIndexedColumn)));
        var matchingRowIds = indexJoinInfo.index.get(keyOfIndex);
        if (matchingRowIds.length == 0) {
          return;
        }
        if (indexJoinInfo.index.isUniqueKey()) {
          // Since the index has only unique keys, expecting only one rowId.
          // Using Cache#get, instead of Cache#getMany, since it has better
          // performance (no unnecessary array allocations).
          pushCombinedEntry(
              entry, /** @type {!lf.Row} */ (cache.get(matchingRowIds[0])));
        } else {
          var rows = /** @type {!Array<!lf.Row>} */ (
              cache.getMany(matchingRowIds));
          rows.forEach(pushCombinedEntry.bind(null, entry));
        }
      }, this);

  var srcTables = outerRelation.getTables().concat(innerRelation.getTables());
  return new lf.proc.Relation(combinedEntries, srcTables);
};
