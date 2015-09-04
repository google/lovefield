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
goog.require('goog.asserts');

goog.provide('lf.structs.TreeNode');



/**
 * @constructor
 * @struct
 * @template K, V
 */
lf.structs.TreeNode = function() {
  /** @private {?lf.structs.TreeNode<K, V>} */
  this.parent_ = null;

  /** @private {?Array<!lf.structs.TreeNode<K, V>>} */
  this.children_ = null;
};


/** @private */
lf.structs.TreeNode.EMPTY_ARRAY_ = [];


/** @return {?lf.structs.TreeNode} */
lf.structs.TreeNode.prototype.getParent = function() {
  return this.parent_;
};


/** @param {?lf.structs.TreeNode} parentNode */
lf.structs.TreeNode.prototype.setParent = function(parentNode) {
  this.parent_ = parentNode;
};


/** @return {!lf.structs.TreeNode} */
lf.structs.TreeNode.prototype.getRoot = function() {
  var root = this;
  while (!goog.isNull(root.getParent())) {
    root = root.getParent();
  }
  return root;
};


/** @return {number} */
lf.structs.TreeNode.prototype.getDepth = function() {
  var depth = 0;
  var node = this;
  while (!goog.isNull(node.getParent())) {
    depth++;
    node = node.getParent();
  }
  return depth;
};


/** @return {boolean} */
lf.structs.TreeNode.prototype.isLeaf = function() {
  return goog.isNull(this.children_);
};


/** @return {!Array<!lf.structs.TreeNode<K, V>>} */
lf.structs.TreeNode.prototype.getChildren = function() {
  return this.children_ || lf.structs.TreeNode.EMPTY_ARRAY_;
};


/**
 * @param {number} index
 * @return {?lf.structs.TreeNode<K,V>}
 */
lf.structs.TreeNode.prototype.getChildAt = function(index) {
  return this.getChildren()[index] || null;
};


/** @return {number} */
lf.structs.TreeNode.prototype.getChildCount = function() {
  return this.getChildren().length;
};


/**
 * @param {!lf.structs.TreeNode<K, V>} child
 * @param {number} index
 */
lf.structs.TreeNode.prototype.addChildAt = function(child, index) {
  goog.asserts.assert(goog.isNull(child.getParent()));
  child.setParent(this);
  if (goog.isNull(this.children_)) {
    goog.asserts.assert(index == 0);
    this.children_ = [child];
  } else {
    goog.asserts.assert(index >= 0 && index <= this.children_.length);
    this.children_.splice(index, 0, child);
  }
};


/** @param {!lf.structs.TreeNode<K, V>} child */
lf.structs.TreeNode.prototype.addChild = function(child) {
  goog.asserts.assert(goog.isNull(child.getParent()));
  child.setParent(this);
  if (goog.isNull(this.children_)) {
    this.children_ = [child];
  } else {
    this.children_.push(child);
  }
};


/**
 * @param {number} index
 * @return {?lf.structs.TreeNode<K, V>} The removed node if any
 */
lf.structs.TreeNode.prototype.removeChildAt = function(index) {
  var child = this.children_ && this.children_[index];
  if (child) {
    child.setParent(null);
    this.children_.splice(index, 1);
    if (this.children_.length == 0) {
      this.children_ = null;
    }
    return child;
  }
  return null;
};


/**
 * @param {!lf.structs.TreeNode<K, V>} child The node to remove
 * @return {?lf.structs.TreeNode<K, V>} The removed node if any
 */
lf.structs.TreeNode.prototype.removeChild = function(child) {
  return this.removeChildAt(this.getChildren().indexOf(child));
};


/**
 * @param {!lf.structs.TreeNode<K, V>} newChild
 * @param {number} index
 * @return {!lf.structs.TreeNode<K, V>} The original child node
 */
lf.structs.TreeNode.prototype.replaceChildAt = function(newChild, index) {
  goog.asserts.assert(goog.isNull(newChild.getParent()),
      'New child must not have parent node');
  var oldChild = this.getChildAt(index);
  goog.asserts.assert(oldChild, 'Invalid child index');
  oldChild.setParent(null);
  newChild.setParent(this);
  this.children_[index] = newChild;
  return oldChild;
};


/**
 * Traverses the subtree with the possibility to skip branches. Starts with
 * this node, and visits the descendant nodes depth-first, in preorder.
 * @param {function(this:THIS, !lf.structs.TreeNode.<K, V>):
 *     (boolean|undefined)} f Callback function. It takes the node as argument.
 *     The children of this node will be visited if the callback returns true or
 *     undefined, and will be skipped if the callback returns false.
 * @param {THIS=} opt_this The object to be used as the value of {@code this}
 *     within {@code f}.
 * @template THIS
 */
lf.structs.TreeNode.prototype.traverse = function(f, opt_this) {
  if (f.call(opt_this, this) !== false) {
    this.getChildren().forEach(function(child) {
      child.traverse(f, opt_this);
    });
  }
};
