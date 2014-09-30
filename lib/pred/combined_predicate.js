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
goog.provide('lf.pred.CombinedPredicate');

goog.require('goog.structs.Map');
goog.require('goog.structs.Set');
goog.require('lf.pred.Operator');
goog.require('lf.pred.PredicateNode');
goog.require('lf.proc.Relation');



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
  this.getChildren().forEach(
      function(condition) {
        return condition.setComplement(isComplement);
      });
};


/** @override */
lf.pred.CombinedPredicate.prototype.eval = function(relation) {
  var results = this.getChildren().map(
      function(condition) {
        return condition.eval(relation);
      });
  return this.combineResults_(results);
};


/**
 * Combines the results of all the children predicates.
 * @param {!Array.<!lf.proc.Relation>} results The results of each
 *     child predicate.
 * @return {!lf.proc.Relation} The comdined results.
 * @private
 */
lf.pred.CombinedPredicate.prototype.combineResults_ = function(results) {
  if (this.operator == lf.pred.Operator.AND) {
    return lf.proc.Relation.intersect(results);
  } else if (this.operator == lf.pred.Operator.OR) {
    return lf.proc.Relation.union(results);
  } else {
    // TODO(user): Implement lf.pred.Operator.NOT case here.
    return lf.proc.Relation.createEmpty();
  }
};


/** @override */
lf.pred.CombinedPredicate.prototype.evalRow = function(row) {
  var results = this.getChildren().map(
      function(condition) {
        return condition.evalRow(row);
      });

  if (this.operator == lf.pred.Operator.AND) {
    return results.every(function(result) {
      return result;
    });
  } else if (this.operator == lf.pred.Operator.OR) {
    return results.indexOf(function(result) {
      return result == true;
    }) != -1;
  } else {
    // TODO(user): Implement lf.pred.Operator.NOT case here.
    return false;
  }
};


/** @override */
lf.pred.CombinedPredicate.prototype.toString = function() {
  return 'combined_pred_' + this.operator.toString();
};
