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
goog.provide('lf.proc.PhysicalQueryPlanNode');

goog.require('goog.Promise');
goog.require('goog.asserts');
goog.require('goog.structs.TreeNode');
goog.require('lf.proc.Relation');

goog.forwardDeclare('lf.cache.Journal');
goog.forwardDeclare('lf.schema.Table');



/**
 * @constructor @struct
 * @suppress {checkStructDictInheritance}
 * @extends {goog.structs.TreeNode}
 *
 * @param {!lf.proc.PhysicalQueryPlanNode.ExecType} type
 * @param {!lf.proc.PhysicalQueryPlanNode.InputRelationType} inputType
 */
lf.proc.PhysicalQueryPlanNode = function(type, inputType) {
  lf.proc.PhysicalQueryPlanNode.base(this, 'constructor', '', '');

  /** @private {!lf.proc.PhysicalQueryPlanNode.ExecType} */
  this.execType_ = type;

  /** @private {!lf.proc.PhysicalQueryPlanNode.InputRelationType} */
  this.inputType_ = inputType;
};
goog.inherits(lf.proc.PhysicalQueryPlanNode, goog.structs.TreeNode);


/**
 * The way a physical query plan node exec().
 * @enum {number}
 */
lf.proc.PhysicalQueryPlanNode.ExecType = {
  NO_CHILD: -1,  // Will not call any of its children's exec().
  ALL: 0,  // Will invoke all children nodes' exec().
  FIRST_CHILD: 1  // Will invoke only the first child's exec().
};


/**
 * When execInternal() is overriden, what input type should it expect.
 * @enum {number}
 */
lf.proc.PhysicalQueryPlanNode.InputRelationType = {
  NONE: -1,  // execInternal expect no relation.
  ARRAY: 0,  // execInternal shall expect array of relations.
  SINGLE: 1  // execInternal shall expect single relation.
};


/**
 * @return {?lf.schema.Table} The table for accessing in this node, or null if
 *     this node has no direct access.
 */
lf.proc.PhysicalQueryPlanNode.prototype.getScope = function() {
  return null;
};


/**
 * @param {!lf.cache.Journal} journal
 * @param {!lf.proc.Relation|!Array<!lf.proc.Relation>} results
 * @return {!lf.proc.Relation|!Array<!lf.proc.Relation>}
 * @protected
 */
lf.proc.PhysicalQueryPlanNode.prototype.execInternal = goog.abstractMethod;


/**
 * @param {!lf.cache.Journal} journal
 * @return {(!IThenable<!lf.proc.Relation>|
 *     !IThenable<!Array<!lf.proc.Relation>>)}
 * @final
 */
lf.proc.PhysicalQueryPlanNode.prototype.exec = function(journal) {
  switch (this.execType_) {
    case lf.proc.PhysicalQueryPlanNode.ExecType.FIRST_CHILD:
      return this.execFirstChild_(journal);

    case lf.proc.PhysicalQueryPlanNode.ExecType.ALL:
      return this.execAllChildren_(journal);

    default:  // NO_CHILD
      return this.execNoChild_(journal);
  }
};


/** @override */
lf.proc.PhysicalQueryPlanNode.prototype.toString = function() {
  return 'dummy_node';
};


/**
 * @param {!lf.proc.Relation|!Array<!lf.proc.Relation>} results
 * @private
 */
lf.proc.PhysicalQueryPlanNode.prototype.assertInput_ = function(results) {
  goog.asserts.assert(
      (this.inputType_ ==
       lf.proc.PhysicalQueryPlanNode.InputRelationType.SINGLE &&
       results instanceof lf.proc.Relation) ||
      (this.inputType_ ==
       lf.proc.PhysicalQueryPlanNode.InputRelationType.ARRAY &&
       results instanceof Array));
};


/**
 * @param {!lf.cache.Journal} journal
 * @return {(!IThenable<!lf.proc.Relation>|
 *     !IThenable<!Array<!lf.proc.Relation>>)}
 * @private
 */
lf.proc.PhysicalQueryPlanNode.prototype.execNoChild_ = function(journal) {
  var results;
  try {
    results = this.execInternal(journal, []);
  } catch (e) {
    return goog.Promise.reject(e);
  }
  return goog.Promise.resolve(results);
};


/**
 * @param {!lf.cache.Journal} journal
 * @return {(!IThenable<!lf.proc.Relation>|
 *     !IThenable<!Array<!lf.proc.Relation>>)}
 * @private
 */
lf.proc.PhysicalQueryPlanNode.prototype.execFirstChild_ = function(journal) {
  return this.getChildAt(0).exec(journal).then(goog.bind(function(results) {
    this.assertInput_(results);
    return this.execInternal(journal, results);
  }, this));
};


/**
 * @param {!lf.cache.Journal} journal
 * @return {(!IThenable<!lf.proc.Relation>|
 *     !IThenable<!Array<!lf.proc.Relation>>)}
 * @private
 */
lf.proc.PhysicalQueryPlanNode.prototype.execAllChildren_ = function(journal) {
  var promises = this.getChildren().map(function(child) {
    return child.exec(journal);
  });

  return goog.Promise.all(promises).then(goog.bind(function(results) {
    this.assertInput_(results);
    return this.execInternal(journal, results);
  }, this));
};
