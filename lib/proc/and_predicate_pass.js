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
goog.provide('lf.proc.AndPredicatePass');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('lf.pred.Operator');
goog.require('lf.proc.RewritePass');
goog.require('lf.proc.SelectNode');
goog.require('lf.tree');

goog.forwardDeclare('lf.pred.CombinedPredicate');



/**
 * @constructor
 * @struct
 * @extends {lf.proc.RewritePass.<!lf.proc.LogicalQueryPlanNode>}
 */
lf.proc.AndPredicatePass = function() {
  lf.proc.AndPredicatePass.base(this, 'constructor');
};
goog.inherits(lf.proc.AndPredicatePass, lf.proc.RewritePass);


/** @override */
lf.proc.AndPredicatePass.prototype.rewrite = function(rootNode) {
  this.rootNode = rootNode;
  this.traverse_(this.rootNode);
  return this.rootNode;
};


/**
 * Traverses the subtree that starts at the given node and rewrites it such that
 * all AND predicates are broken down to separate SelectNode instances.
 * @param {!lf.proc.LogicalQueryPlanNode} rootNode The root node of the subtree
 *     to be traversed.
 * @private
 */
lf.proc.AndPredicatePass.prototype.traverse_ = function(
    rootNode) {
  if (rootNode instanceof lf.proc.SelectNode) {
    goog.asserts.assert(
        rootNode.getChildCount() == 1,
        'SelectNode must have exactly one child.');

    var predicates = this.breakAndPredicate_(
        /** @type {!lf.pred.PredicateNode} */ (rootNode.predicate));
    var newNodes = this.createSelectNodeChain_(predicates);
    lf.tree.replaceNodeWithChain(rootNode, newNodes[0], newNodes[1]);

    if (rootNode == this.rootNode) {
      this.rootNode = newNodes[0];
    }

    rootNode = newNodes[0];
  }

  rootNode.getChildren().forEach(
      function(child) {
        this.traverse_(
            /** @type {!lf.proc.LogicalQueryPlanNode} */ (child));
      }, this);
};


/**
 * Recursively breaks down an AND predicate to its components.
 * OR predicates are unaffected, as well as other types of predicates
 * (value/join).
 * Example: (a0 AND (a1 AND a2)) AND (b OR c) becomes
 *           a0 AND a1 AND a2 AND (b OR c) -> [a0, a1, a2, (b OR c)]
 * @param {!lf.pred.PredicateNode} predicate The predicate to be broken down.
 * @return  {!Array<!lf.pred.PredicateNode>} The components of the given
 *     predicate.
 * @private
 */
lf.proc.AndPredicatePass.prototype.breakAndPredicate_ =
    function(predicate) {
  if (predicate.getChildCount() == 0) {
    return [predicate];
  }

  var combinedPredicate = /** @type {!lf.pred.CombinedPredicate} */ (
      predicate);

  if (combinedPredicate.operator != lf.pred.Operator.AND) {
    return [predicate];
  }

  var predicates = combinedPredicate.getChildren().slice().map(
      function(childPredicate) {
        combinedPredicate.removeChild(childPredicate);
        return this.breakAndPredicate_(
            /** @type {!lf.pred.PredicateNode} */ (childPredicate));
      }, this);
  return goog.array.flatten(predicates);
};


/**
 * @param {!Array<!lf.pred.PredicateNode>} predicates
 * @return {!Array<!lf.proc.LogicalQueryPlanNode>}
 * @private
 */
lf.proc.AndPredicatePass.prototype.createSelectNodeChain_ =
    function(predicates) {
  var parentNode = null;
  var lastNode = null;
  predicates.map(
      function(predicate, index) {
        var node = new lf.proc.SelectNode(predicate);
        index == 0 ? parentNode = node : lastNode.addChild(node);
        lastNode = node;
      }, this);

  return [parentNode, lastNode];
};
