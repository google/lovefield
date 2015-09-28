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
goog.provide('lf.proc.JoinStep');

goog.require('lf.eval.Type');
goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.service');



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!lf.Global} global
 * @param {!lf.pred.JoinPredicate} predicate
 * @param {boolean} isOuterJoin
 */
lf.proc.JoinStep = function(global, predicate, isOuterJoin) {
  lf.proc.JoinStep.base(this, 'constructor',
      2,
      lf.proc.PhysicalQueryPlanNode.ExecType.ALL);

  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = global.getService(lf.service.INDEX_STORE);

  /** @private {!lf.cache.Cache} */
  this.cache_ = global.getService(lf.service.CACHE);

  /** @type {!lf.pred.JoinPredicate} */
  this.predicate = predicate;

  /** @type {boolean} */
  this.isOuterJoin = isOuterJoin;

  /** @private {!lf.proc.JoinStep.Algorithm_} */
  this.algorithm_ = this.predicate.evaluatorType == lf.eval.Type.EQ ?
      lf.proc.JoinStep.Algorithm_.HASH :
      lf.proc.JoinStep.Algorithm_.NESTED_LOOP;

  /** @private {?lf.pred.JoinPredicate.IndexJoinInfo} */
  this.indexJoinInfo_ = null;
};
goog.inherits(lf.proc.JoinStep, lf.proc.PhysicalQueryPlanNode);


/**
 * The join algorithm.
 * @enum {number}
 * @private
 */
lf.proc.JoinStep.Algorithm_ = {
  HASH: 0,
  INDEX_NESTED_LOOP: 1,
  NESTED_LOOP: 2
};


/**
 * Names of each join algorithm. The order should match the values of the
 * Algorithm_ enum.
 * @private {!Array<string>}
 */
lf.proc.JoinStep.AlgorithmToString_ = [
  'hash', 'index_nested_loop', 'nested_loop'
];


/** @override */
lf.proc.JoinStep.prototype.toString = function() {
  return 'join(' +
      'type: ' + (this.isOuterJoin ? 'outer' : 'inner') + ', ' +
      'impl: ' + lf.proc.JoinStep.AlgorithmToString_[this.algorithm_] + ', ' +
      this.predicate.toString() + ')';
};


/** @override */
lf.proc.JoinStep.prototype.execInternal = function(relations) {
  switch (this.algorithm_) {
    case lf.proc.JoinStep.Algorithm_.HASH:
      return [this.predicate.evalRelationsHashJoin(
          relations[0], relations[1], this.isOuterJoin)];
    case lf.proc.JoinStep.Algorithm_.INDEX_NESTED_LOOP:
      return [this.predicate.evalRelationsIndexNestedLoopJoin(
          relations[0], relations[1],
          /** @type {!lf.pred.JoinPredicate.IndexJoinInfo} */ (
              this.indexJoinInfo_),
          this.cache_)];
      break;
    default: // lf.proc.JoinStep.Algorithm_.NESTED_LOOP
      return [this.predicate.evalRelationsNestedLoopJoin(
          relations[0], relations[1], this.isOuterJoin)];
  }
};


/**
 * Indicates that this JoinStep should be executed as an INDEX_NESTED_LOOP join.
 * @param {!lf.schema.Column} column The column whose index should be queried.
 */
lf.proc.JoinStep.prototype.markAsIndexJoin = function(column) {
  this.algorithm_ = lf.proc.JoinStep.Algorithm_.INDEX_NESTED_LOOP;
  var index = this.indexStore_.get(column.getIndex().getNormalizedName());
  this.indexJoinInfo_ = {
    indexedColumn: column,
    nonIndexedColumn: column == this.predicate.leftColumn ?
        this.predicate.rightColumn : this.predicate.leftColumn,
    index: /** @type {!lf.index.Index} */ (index)
  };
};
