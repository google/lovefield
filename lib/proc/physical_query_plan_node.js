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
goog.provide('lf.proc.PhysicalQueryPlanNode');

goog.require('goog.Promise');
goog.require('goog.asserts');
goog.require('lf.structs.TreeNode');

goog.forwardDeclare('lf.cache.Journal');
goog.forwardDeclare('lf.query.Context');
goog.forwardDeclare('lf.schema.Table');



/**
 * @constructor @struct
 * @extends {lf.structs.TreeNode}
 *
 * @param {number} numRelations Number of relations expected for input. Accepts
 *     ANY (i.e. -1), zero, or positive numbers.
 * @param {!lf.proc.PhysicalQueryPlanNode.ExecType} type
 */
lf.proc.PhysicalQueryPlanNode = function(numRelations, type) {
  lf.proc.PhysicalQueryPlanNode.base(this, 'constructor');

  /** @private {!lf.proc.PhysicalQueryPlanNode.ExecType} */
  this.execType_ = type;

  /** @private {!number} */
  this.numRelations_ = numRelations;
};
goog.inherits(lf.proc.PhysicalQueryPlanNode, lf.structs.TreeNode);


/**
 * The way a physical query plan node exec().
 * @enum {number}
 */
lf.proc.PhysicalQueryPlanNode.ExecType = {
  NO_CHILD: -1,  // Will not call any of its children's exec().
  ALL: 0,  // Will invoke all children nodes' exec().
  FIRST_CHILD: 1  // Will invoke only the first child's exec().
};


/** @const {number} */
lf.proc.PhysicalQueryPlanNode.ANY = -1;


/**
 * The core logic of this node.
 * @param {!Array<!lf.proc.Relation>} relations Array of input relations. The
 *     length of relations is guaranteed to be consistent with what is specified
 *     in the constructor.
 * @param {!lf.cache.Journal=} opt_journal
 * @param {!lf.query.Context=} opt_context
 * @return {!Array<!lf.proc.Relation>}
 * @protected
 */
lf.proc.PhysicalQueryPlanNode.prototype.execInternal = goog.abstractMethod;


/**
 * @param {!lf.cache.Journal=} opt_journal
 * @param {!lf.query.Context=} opt_context
 * @return {!IThenable<!Array<!lf.proc.Relation>>}
 * @final
 */
lf.proc.PhysicalQueryPlanNode.prototype.exec = function(
    opt_journal, opt_context) {
  switch (this.execType_) {
    case lf.proc.PhysicalQueryPlanNode.ExecType.FIRST_CHILD:
      return this.execFirstChild_(opt_journal, opt_context);

    case lf.proc.PhysicalQueryPlanNode.ExecType.ALL:
      return this.execAllChildren_(opt_journal, opt_context);

    default:  // NO_CHILD
      return this.execNoChild_(opt_journal, opt_context);
  }
};


/** @override */
lf.proc.PhysicalQueryPlanNode.prototype.toString = function() {
  return 'dummy_node';
};


/**
 * @param {!lf.query.Context} context
 * @return {string} A string representation of this node taking into account the
 *     given context.
 */
lf.proc.PhysicalQueryPlanNode.prototype.toContextString = function(context) {
  return this.toString();
};


/**
 * @param {!Array<!lf.proc.Relation>} relations
 * @private
 */
lf.proc.PhysicalQueryPlanNode.prototype.assertInput_ = function(relations) {
  goog.asserts.assert(
      this.numRelations_ == lf.proc.PhysicalQueryPlanNode.ANY ||
      relations.length == this.numRelations_);
};


/**
 * @param {!lf.cache.Journal=} opt_journal
 * @param {!lf.query.Context=} opt_context
 * @return {!IThenable<!Array<!lf.proc.Relation>>}
 * @private
 */
lf.proc.PhysicalQueryPlanNode.prototype.execNoChild_ = function(
    opt_journal, opt_context) {
  return new goog.Promise(
      function(resolve, reject) {
        resolve(this.execInternal([], opt_journal, opt_context));
      }.bind(this));
};


/**
 * @param {!lf.cache.Journal=} opt_journal
 * @param {!lf.query.Context=} opt_context
 * @return {!IThenable<!Array<!lf.proc.Relation>>}
 * @private
 */
lf.proc.PhysicalQueryPlanNode.prototype.execFirstChild_ = function(
    opt_journal, opt_context) {
  return /** @type {!lf.proc.PhysicalQueryPlanNode} */ (
      this.getChildAt(0)).exec(opt_journal, opt_context).then(
      function(results) {
        this.assertInput_(results);
        return this.execInternal(results, opt_journal, opt_context);
      }.bind(this));
};


/**
 * @param {!lf.cache.Journal=} opt_journal
 * @param {!lf.query.Context=} opt_context
 * @return {!IThenable<!Array<!lf.proc.Relation>>}
 * @private
 */
lf.proc.PhysicalQueryPlanNode.prototype.execAllChildren_ = function(
    opt_journal, opt_context) {
  var promises = this.getChildren().map(function(child) {
    return /** @type {!lf.proc.PhysicalQueryPlanNode} */ (child).exec(
        opt_journal, opt_context);
  });

  return goog.Promise.all(promises).then(function(results) {
    // Flatten the results array.
    var relations = [];
    results.forEach(function(result) {
      for (var i = 0; i < result.length; ++i) {
        relations.push(result[i]);
      }
    });
    this.assertInput_(relations);
    return this.execInternal(relations, opt_journal, opt_context);
  }.bind(this));
};
