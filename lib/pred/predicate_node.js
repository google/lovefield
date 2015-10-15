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
goog.provide('lf.pred.PredicateNode');

goog.require('lf.Predicate');
goog.require('lf.structs.TreeNode');



/**
 * @constructor
 * @struct
 * @implements {lf.Predicate}
 * @extends {lf.structs.TreeNode}
 */
lf.pred.PredicateNode = function() {
  lf.pred.PredicateNode.base(this, 'constructor');

  /** @private {number} */
  this.id_ = lf.pred.PredicateNode.nextId_++;
};
goog.inherits(lf.pred.PredicateNode, lf.structs.TreeNode);


/**
 * The ID to assign to the next predicate that will be created. Note that
 * predicates are constructed with unique IDs, but when a predicate is cloned
 * the ID is also purposefully cloned.
 * @private {number}
 */
lf.pred.PredicateNode.nextId_ = 0;


/** @override */
lf.pred.PredicateNode.prototype.eval = goog.abstractMethod;


/** @override */
lf.pred.PredicateNode.prototype.setComplement = goog.abstractMethod;


/** @override */
lf.pred.PredicateNode.prototype.copy = goog.abstractMethod;


/** @override */
lf.pred.PredicateNode.prototype.getColumns = goog.abstractMethod;


/** @override */
lf.pred.PredicateNode.prototype.getTables = goog.abstractMethod;


/** @override */
lf.pred.PredicateNode.prototype.getId = function() {
  return this.id_;
};


/** @override */
lf.pred.PredicateNode.prototype.setId = function(id) {
  this.id_ = id;
};
