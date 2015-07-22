/**
 * @license
 * Copyright 2015 The Lovefield Project Authors. All Rights Reserved.
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
goog.provide('lf.proc.GetRowCountPass');

goog.require('lf.fn.AggregatedColumn');
goog.require('lf.fn.StarColumn');
goog.require('lf.fn.Type');
goog.require('lf.proc.GetRowCountStep');
goog.require('lf.proc.RewritePass');
goog.require('lf.proc.TableAccessFullStep');
goog.require('lf.tree');



/**
 * An optimization pass responsible for optimizing SELECT COUNT(*) queries,
 * where no LIMIT, SKIP, WHERE or GROUP_BY appears.
 *
 * @constructor
 * @struct
 * @extends {lf.proc.RewritePass.<!lf.proc.PhysicalQueryPlanNode>}
 *
 * @param {!lf.Global} global
 */
lf.proc.GetRowCountPass = function(global) {
  lf.proc.GetRowCountPass.base(this, 'constructor');

  /** @private {!lf.Global} */
  this.global_ = global;
};
goog.inherits(lf.proc.GetRowCountPass, lf.proc.RewritePass);


/** @override */
lf.proc.GetRowCountPass.prototype.rewrite = function(rootNode, queryContext) {
  this.rootNode = rootNode;

  if (!this.canOptimize_(/** @type {!lf.query.SelectContext} */ (
      queryContext))) {
    return rootNode;
  }

  var tableAccessFullStep =
      /** @type {!Array<!lf.proc.TableAccessFullStep>} */ (lf.tree.find(
          rootNode,
          function(node) {
            return node instanceof lf.proc.TableAccessFullStep;
          }))[0];
  var getRowCountStep = new lf.proc.GetRowCountStep(
      this.global_, tableAccessFullStep.table);
  lf.tree.replaceNodeWithChain(
      tableAccessFullStep, getRowCountStep, getRowCountStep);

  return this.rootNode;
};


/**
 * @param {!lf.query.SelectContext} queryContext
 * @return {boolean} Whether this optimization can be applied to the given
 *     query.
 * @private
 */
lf.proc.GetRowCountPass.prototype.canOptimize_ = function(queryContext) {
  var isCandidate = queryContext.columns.length == 1 &&
      queryContext.from.length == 1 &&
      !goog.isDefAndNotNull(queryContext.where) &&
      !goog.isDefAndNotNull(queryContext.limit) &&
      !goog.isDefAndNotNull(queryContext.skip) &&
      !goog.isDefAndNotNull(queryContext.groupBy);

  if (isCandidate) {
    var column = queryContext.columns[0];
    return column instanceof lf.fn.AggregatedColumn &&
        column.aggregatorType == lf.fn.Type.COUNT &&
        column.child instanceof lf.fn.StarColumn;
  }

  return false;
};
