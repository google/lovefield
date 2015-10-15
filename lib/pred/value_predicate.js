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
goog.provide('lf.pred.ValuePredicate');

goog.require('goog.asserts');
goog.require('lf.Binder');
goog.require('lf.Exception');
goog.require('lf.Type');
goog.require('lf.eval.Registry');
goog.require('lf.eval.Type');
goog.require('lf.index.SingleKeyRange');
goog.require('lf.index.SingleKeyRangeSet');
goog.require('lf.pred.PredicateNode');
goog.require('lf.proc.Relation');
goog.require('lf.structs.set');



/**
 * @constructor @struct
 * @extends {lf.pred.PredicateNode}
 *
 * @template T
 * @param {!lf.schema.Column} column
 * @param {T} value
 * @param {!lf.eval.Type} evaluatorType
 */
lf.pred.ValuePredicate = function(column, value, evaluatorType) {
  lf.pred.ValuePredicate.base(this, 'constructor');

  /** @type {!lf.schema.Column} */
  this.column = column;

  /** @type {T} */
  this.value = value;

  /** @type {!lf.eval.Type} */
  this.evaluatorType = evaluatorType;

  /** @private {!function(T, T):boolean} */
  this.evaluatorFn_ = lf.eval.Registry.get().getEvaluator(
      this.column.getType(), this.evaluatorType);

  /**
   * Whether this predicate should be applied reversed (return false where the
   * original predicate returns true and vice versa).
   * @private
   */
  this.isComplement_ = false;

  /** @private {T} */
  this.binder_ = value;
};
goog.inherits(lf.pred.ValuePredicate, lf.pred.PredicateNode);


/** @override */
lf.pred.ValuePredicate.prototype.copy = function() {
  var clone = new lf.pred.ValuePredicate(
      this.column, this.value, this.evaluatorType);
  clone.setBinder(this.binder_);
  clone.setComplement(this.isComplement_);
  clone.setId(this.getId());
  return clone;
};


/** @override */
lf.pred.ValuePredicate.prototype.getColumns = function(opt_results) {
  if (goog.isDefAndNotNull(opt_results)) {
    opt_results.push(this.column);
    return opt_results;
  } else {
    return [this.column];
  }
};


/** @override */
lf.pred.ValuePredicate.prototype.getTables = function(opt_results) {
  var tables = goog.isDefAndNotNull(opt_results) ?
      opt_results : lf.structs.set.create();
  tables.add(this.column.getTable());
  return tables;
};


/** @override */
lf.pred.ValuePredicate.prototype.setComplement = function(isComplement) {
  this.isComplement_ = isComplement;
};


/** @param {T} binder */
lf.pred.ValuePredicate.prototype.setBinder = function(binder) {
  this.binder_ = binder;
};


/**
 * @private
 * @throws {!lf.Exception}
 */
lf.pred.ValuePredicate.prototype.checkBinding_ = function() {
  var bound = false;
  if (!(this.value instanceof lf.Binder)) {
    if (goog.isArray(this.value)) {
      bound = !this.value.some(function(val) {
        return val instanceof lf.Binder;
      });
    } else {
      bound = true;
    }
  }

  if (!bound) {
    // 501: Value is not bounded.
    throw new lf.Exception(501);
  }
};


/** @override */
lf.pred.ValuePredicate.prototype.eval = function(relation) {
  this.checkBinding_();

  // Ignoring this.evaluatorFn_() for the case of the IN, in favor of a faster
  // evaluation implementation.
  if (this.evaluatorType == lf.eval.Type.IN) {
    return this.evalAsIn_(relation);
  }

  var entries = relation.entries.filter(function(entry) {
    return this.evaluatorFn_(
        entry.getField(this.column),
        this.value) != this.isComplement_;
  }, this);

  return new lf.proc.Relation(entries, relation.getTables());
};


/** @param {!Array<*>} values */
lf.pred.ValuePredicate.prototype.bind = function(values) {
  /** @param {number} index */
  var checkIndexWithinRange = function(index) {
    if (values.length <= index) {
      // 510: Cannot bind to given array: out of range.
      throw new lf.Exception(510);
    }
  };

  if (this.binder_ instanceof lf.Binder) {
    var index = this.binder_.getIndex();
    checkIndexWithinRange(index);
    this.value = /** @type {T} */ (values[index]);
  } else if (goog.isArray(this.binder_)) {
    this.value = this.binder_.map(function(val) {
      if (val instanceof lf.Binder) {
        checkIndexWithinRange(val.getIndex());
        return values[val.getIndex()];
      } else {
        return val;
      }
    });
  }
};


/**
 * Evaluates this predicate as an lf.eval.Type.IN. The execution time of this
 * operation is O(N) where N is the number of entries to be evaluated.
 * @param {!lf.proc.Relation} relation The relation to be checked.
 * @return {!lf.proc.Relation} A relation that holds only the entries that
 *     satisfy the predicate.
 * @private
 */
lf.pred.ValuePredicate.prototype.evalAsIn_ = function(relation) {
  goog.asserts.assert(
      this.evaluatorType == lf.eval.Type.IN,
      'ValuePredicate#evalAsIn_() called for wrong predicate type.');

  var valueSet = lf.structs.set.create(this.value);
  var evaluatorFn = function(rowValue) {
    return goog.isNull(rowValue) ?
        false :
        (valueSet.has(rowValue) != this.isComplement_);
  }.bind(this);

  var entries = relation.entries.filter(function(entry) {
    return evaluatorFn(entry.getField(this.column));
  }, this);

  return new lf.proc.Relation(entries, relation.getTables());
};


/** @override */
lf.pred.ValuePredicate.prototype.toString = function() {
  return 'value_pred(' +
      this.column.getNormalizedName() + ' ' +
      this.evaluatorType + (this.isComplement_ ? '(complement)' : '') + ' ' +
      this.value + ')';
};


/**
 * @return {boolean} Whether this predicate can be converted to a KeyRange
 *     instance.
 */
lf.pred.ValuePredicate.prototype.isKeyRangeCompatible = function() {
  this.checkBinding_();
  return !goog.isNull(this.value) &&
      (this.evaluatorType == lf.eval.Type.BETWEEN ||
      this.evaluatorType == lf.eval.Type.IN ||
      this.evaluatorType == lf.eval.Type.EQ ||
      this.evaluatorType == lf.eval.Type.GT ||
      this.evaluatorType == lf.eval.Type.GTE ||
      this.evaluatorType == lf.eval.Type.LT ||
      this.evaluatorType == lf.eval.Type.LTE);
};


/**
 * Converts this predicate to a key range.
 * NOTE: Not all predicates can be converted to a key range, callers must call
 * isKeyRangeCompatible() before calling this method.
 * @return {!lf.index.SingleKeyRangeSet} The key range set corresponding to
 *     this predicate.
 */
lf.pred.ValuePredicate.prototype.toKeyRange = function() {
  goog.asserts.assert(
      this.isKeyRangeCompatible(),
      'Could not convert predicate to key range.');

  var keyRange = null;
  if (this.evaluatorType == lf.eval.Type.BETWEEN) {
    keyRange = new lf.index.SingleKeyRange(
        this.getValueAsKey_(this.value[0]), this.getValueAsKey_(this.value[1]),
        false, false);
  } else if (this.evaluatorType == lf.eval.Type.IN) {
    var keyRanges = this.value.map(function(value) {
      return lf.index.SingleKeyRange.only(value);
    });
    return new lf.index.SingleKeyRangeSet(
        this.isComplement_ ?
            lf.index.SingleKeyRange.complement(keyRanges) : keyRanges);
  } else {
    var value = this.getValueAsKey_(this.value);
    if (this.evaluatorType == lf.eval.Type.EQ) {
      keyRange = lf.index.SingleKeyRange.only(value);
    } else if (this.evaluatorType == lf.eval.Type.GTE) {
      keyRange = lf.index.SingleKeyRange.lowerBound(value);
    } else if (this.evaluatorType == lf.eval.Type.GT) {
      keyRange = lf.index.SingleKeyRange.lowerBound(value, true);
    } else if (this.evaluatorType == lf.eval.Type.LTE) {
      keyRange = lf.index.SingleKeyRange.upperBound(value);
    } else {
      // Must be this.evaluatorType == lf.eval.Type.LT.
      keyRange = lf.index.SingleKeyRange.upperBound(value, true);
    }
  }

  return new lf.index.SingleKeyRangeSet(
      this.isComplement_ ? keyRange.complement() : [keyRange]);
};


/**
 * @param {T} value
 * @return {!lf.index.Index.SingleKey} The value in this predicated converted to
 *     an index key.
 * @private
 */
lf.pred.ValuePredicate.prototype.getValueAsKey_ = function(value) {
  if (this.column.getType() == lf.Type.DATE_TIME) {
    return value.getTime();
  }
  return value;
};
