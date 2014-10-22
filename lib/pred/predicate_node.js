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
goog.provide('lf.pred.PredicateNode');

goog.require('goog.structs.TreeNode');
goog.require('lf.Predicate');



/**
 * @constructor
 * @struct
 * @suppress {checkStructDictInheritance}
 * @implements {lf.Predicate}
 * @extends {goog.structs.TreeNode}
 */
lf.pred.PredicateNode = function() {
  lf.pred.PredicateNode.base(this, 'constructor', '', '');
};
goog.inherits(lf.pred.PredicateNode, goog.structs.TreeNode);


/** @override */
lf.pred.PredicateNode.prototype.eval = goog.abstractMethod;


/** @override */
lf.pred.PredicateNode.prototype.setComplement = goog.abstractMethod;


/** @override */
lf.pred.PredicateNode.prototype.copy = goog.abstractMethod;
