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
goog.provide('lf.pred.CombinedPredicate');

goog.require('goog.asserts');
goog.require('lf.index.SingleKeyRangeSet');
goog.require('lf.pred.Operator');
goog.require('lf.pred.PredicateNode');
goog.require('lf.pred.ValuePredicate');
goog.require('lf.proc.Relation');
goog.require('lf.structs.set');
goog.require('lf.tree');



/**
 * @constructor
 * @struct
 * @extends {lf.pred.PredicateNode}
 *
 * @param {!lf.pred.Operator} operator The operator used for combining
 *     conditions.
 */
lf.pred.CombinedPredicate = function(operator) {
  lf.pred.CombinedPredicate.base(this, 'constructor');

  /** @type {!lf.pred.Operator} */
  this.operator = operator;

  /**
   * Whether this predicate has been reversed. This is necessary only for
   * handling the case where setComplement() is called twice with the same
   * value.
   * @private {boolean}
   */
  this.isComplement_ = false;
};
goog.inherits(lf.pred.CombinedPredicate, lf.pred.PredicateNode);


/** @override */
lf.pred.CombinedPredicate.prototype.copy = function() {
  var copy = /** @type {!lf.pred.CombinedPredicate} */ (
      lf.tree.map(
          this,
          /**
           * @param {!lf.pred.PredicateNode} node
           */
          (function(node) {
            if (node instanceof lf.pred.CombinedPredicate) {
              var tempCopy = new lf.pred.CombinedPredicate(node.operator);
              tempCopy.isComplement_ = node.isComplement_;
              tempCopy.setId(node.getId());
              return tempCopy;
            } else {
              return node.copy();
            }
          })));

  return copy;
};


/** @override */
lf.pred.CombinedPredicate.prototype.getColumns = function(opt_results) {
  var columns = opt_results || [];
  this.traverse(function(child) {
    if (child == this) {
      return;
    }
    child.getColumns(columns);
  }.bind(this));

  var columnSet = lf.structs.set.create(columns);
  return lf.structs.set.values(columnSet);
};


/** @override */
lf.pred.CombinedPredicate.prototype.getTables = function(opt_results) {
  var tables = goog.isDefAndNotNull(opt_results) ?
      opt_results : lf.structs.set.create();
  this.traverse(function(child) {
    if (child == this) {
      return;
    }
    child.getTables(tables);
  }.bind(this));
  return tables;
};


/** @override */
lf.pred.CombinedPredicate.prototype.setComplement = function(isComplement) {
  if (this.isComplement_ == isComplement) {
    // Nothing to do.
    return;
  }

  this.isComplement_ = isComplement;

  // NOT(AND(c1, c2)) becomes OR(NOT(c1), NOT(c2)).
  // NOT(OR(c1, c2)) becomes AND(NOT(c1), NOT(c2)).

  // Toggling AND/OR.
  this.operator = this.operator == lf.pred.Operator.AND ?
      lf.pred.Operator.OR : lf.pred.Operator.AND;

  // Toggling children conditions.
  this.getChildren().forEach(function(condition) {
    return /** @type {!lf.Predicate} */ (condition).setComplement(isComplement);
  });
};


/** @override */
lf.pred.CombinedPredicate.prototype.eval = function(relation) {
  var results = this.getChildren().map(function(condition) {
    return /** @type {!lf.Predicate} */ (condition).eval(relation);
  });
  return this.combineResults_(results);
};


/**
 * Combines the results of all the children predicates.
 * @param {!Array<!lf.proc.Relation>} results The results of each
 *     child predicate.
 * @return {!lf.proc.Relation} The combined results.
 * @private
 */
lf.pred.CombinedPredicate.prototype.combineResults_ = function(results) {
  if (this.operator == lf.pred.Operator.AND) {
    return lf.proc.Relation.intersect(results);
  } else {
    // Must be the case where this.operator == lf.pred.Operator.OR.
    return lf.proc.Relation.union(results);
  }
};


/** @override */
lf.pred.CombinedPredicate.prototype.toString = function() {
  return 'combined_pred_' + this.operator.toString();
};


/**
 * Converts this predicate to a key range.
 * NOTE: Not all predicates can be converted to a key range, callers must call
 * isKeyRangeCompatible() before calling this method.
 * @return {!lf.index.SingleKeyRangeSet} The key range set corresponding to
 *     this predicate.
 */
lf.pred.CombinedPredicate.prototype.toKeyRange = function() {
  goog.asserts.assert(
      this.isKeyRangeCompatible(),
      'Could not convert combined predicate to key range.');

  if (this.operator == lf.pred.Operator.OR) {
    var keyRangeSet = new lf.index.SingleKeyRangeSet();
    this.getChildren().forEach(function(child) {
      var childKeyRanges = /** @type {!lf.pred.ValuePredicate} */ (
          child).toKeyRange().getValues();
      keyRangeSet.add(childKeyRanges);
    });
    return keyRangeSet;
  } else {  // this.operator.lf.pred.Operator.OR
    // Unreachable code, because the assertion above should have already thrown
    // an error if this predicate is of type AND.
    goog.asserts.fail('toKeyRange() called for an AND predicate.');
    return new lf.index.SingleKeyRangeSet();
  }
};


/**
 * @return {boolean} Whether this predicate can be converted to a set of key
 *     ranges.
 */
lf.pred.CombinedPredicate.prototype.isKeyRangeCompatible = function() {
  if (this.operator == lf.pred.Operator.OR) {
    return this.isKeyRangeCompatibleOr_();
  }

  // AND predicates are broken down to individual predicates by the optimizer,
  // and therefore there is no need to convert an AND predicate to a key
  // range, because such predicates do not exist in the tree during query
  // execution.
  return false;
};


/**
 * Checks if this OR predicate can be converted to a set of key ranges.
 * Currently only OR predicates that satisfy all of the following criteria can
 * be converted.
 *  1) Every child is a ValuePredicate
 *  2) All children refer to the same table and column.
 *  3) All children are key range compatible.
 * @return {boolean} Whether this predicate can be converted to a set of key
 *     ranges.
 * @private
 */
lf.pred.CombinedPredicate.prototype.isKeyRangeCompatibleOr_ = function() {
  var predicateColumn = null;
  return this.getChildren().every(function(child) {
    var isCandidate = child instanceof lf.pred.ValuePredicate &&
        child.isKeyRangeCompatible();
    if (!isCandidate) {
      return false;
    }
    if (goog.isNull(predicateColumn)) {
      predicateColumn = child.column;
    }
    return predicateColumn.getNormalizedName() ==
        child.column.getNormalizedName();
  });
};
