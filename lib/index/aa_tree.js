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
goog.provide('lf.index.AATree');

goog.require('goog.asserts');
goog.require('lf.Exception');
goog.require('lf.index');
goog.require('lf.index.Favor');
goog.require('lf.index.Index');



/**
 * Nodes for an AA tree. The default constructor constructs a null node. For
 * real nodes, please use lf.index.AANode_.create() to create.
 * @constructor @struct
 * @private
 */
lf.index.AANode_ = function() {
  /** @type {number} */
  this.level = 0;

  /** @type {!lf.index.AANode_} */
  this.left = this;

  /** @type {!lf.index.AANode_} */
  this.right = this;

  /** @type {!lf.index.Index.Key} */
  this.key;

  /** @type {number} */
  this.value;
};


/**
 * @param {!lf.index.Index.Key} key
 * @param {number} value
 * @param {!lf.index.AANode_} nullNode
 * @return {!lf.index.AANode_}
 */
lf.index.AANode_.create = function(key, value, nullNode) {
  var node = new lf.index.AANode_();
  node.level = 1;
  node.left = nullNode;
  node.right = nullNode;
  node.key = key;
  node.value = value;
  return node;
};



/**
 * Arne Andersson Tree. The tree does not allow duplicate keys.
 * @see http://user.it.uu.se/~arnea/abs/simp.html
 * @implements {lf.index.Index}
 * @constructor @struct
 *
 * @param {string} name Name of this index.
 * @param {!lf.index.Comparator} comparator
 */
lf.index.AATree = function(name, comparator) {
  /** @private {string} */
  this.name_ = name;

  /** @private {!lf.index.AANode_} */
  this.nullNode_ = new lf.index.AANode_();

  /** @private {?lf.index.AANode_} */
  this.deleted_ = null;

  /** @private {!lf.index.AANode_} */
  this.root_ = this.nullNode_;

  /** @private {!lf.index.Comparator} */
  this.comparator_ = comparator;
};


/** @override */
lf.index.AATree.prototype.getName = function() {
  return this.name_;
};


/**
 * @param {!lf.index.AANode_} node
 * @return {!lf.index.AANode_}
 * @private
 */
lf.index.AATree.prototype.skew_ = function(node) {
  if (node.level == node.left.level) {
    // Rotate right
    var left = node.left;
    node.left = left.right;
    left.right = node;
    return left;
  }
  return node;
};


/**
 * @param {!lf.index.AANode_} node
 * @return {!lf.index.AANode_}
 * @private
 */
lf.index.AATree.prototype.split_ = function(node) {
  if (node.right.right.level == node.level) {
    // Rotate left
    var right = node.right;
    node.right = right.left;
    right.left = node;
    right.level++;
    return right;
  }
  return node;
};


/**
 * @param {!lf.index.AANode_} node Root node of the subtree to search for.
 * @param {!lf.index.Index.Key} key
 * @param {number} value
 * @return {!lf.index.AANode_} New root of the subtree.
 * @private
 */
lf.index.AATree.prototype.insert_ = function(node, key, value) {
  if (node == this.nullNode_) {
    return lf.index.AANode_.create(key, value, this.nullNode_);
  }

  var favor = this.comparator_.compare(key, node.key);
  if (favor == lf.index.Favor.RHS) {
    node.left = this.insert_(node.left, key, value);
  } else if (favor == lf.index.Favor.LHS) {
    node.right = this.insert_(node.right, key, value);
  } else {
    throw new lf.Exception(
        lf.Exception.Type.CONSTRAINT,
        'AA index does not support duplicate keys');
  }

  var ret = this.skew_(node);
  ret = this.split_(ret);
  return ret;
};


/** @override */
lf.index.AATree.prototype.add = function(key, value) {
  this.root_ = this.insert_(
      this.root_, /** @type {!lf.index.Index.Key} */ (key), value);
};


/** @override */
lf.index.AATree.prototype.set = function(key, value) {
  var node = this.search_(this.root_, /** @type {!lf.index.Index.Key} */ (key));
  if (node == null) {
    this.add(key, value);
  } else {
    node.value = value;
  }
};


/**
 * @param {!lf.index.AANode_} node Root of the subtree to search for.
 * @param {!lf.index.Index.Key} key
 * @return {!lf.index.AANode_} New root of the subtree.
 * @private
 */
lf.index.AATree.prototype.delete_ = function(node, key) {
  if (node == this.nullNode_) {
    return this.nullNode_;
  }

  var favor = this.comparator_.compare(key, node.key);
  if (favor == lf.index.Favor.RHS) {
    node.left = this.delete_(node.left, key);
  } else {
    if (favor == lf.index.Favor.TIE) {
      this.deleted_ = node;
    }
    node.right = this.delete_(node.right, key);
  }

  var ret = node;
  if (this.deleted_ != null) {
    this.deleted_.key = node.key;
    this.deleted_.value = node.value;
    this.deleted_ = null;
    ret = ret.right;
  } else if (ret.left.level < ret.level - 1 ||
      ret.right.level < ret.level - 1) {
    --ret.level;
    if (ret.right.level > ret.level) {
      ret.right.level = ret.level;
    }
    ret = this.skew_(node);
    ret.right = this.skew_(ret.right);
    ret.right.right = this.skew_(ret.right.right);
    ret = this.split_(ret);
    ret.right = this.split_(ret.right);
  }
  return ret;
};


/** @override */
lf.index.AATree.prototype.remove = function(key, opt_rowId) {
  this.root_ = this.delete_(
      this.root_, /** @type {!lf.index.Index.Key} */ (key));
};


/**
 * @param {!lf.index.AANode_} node
 * @param {!lf.index.Index.Key} key
 * @return {?lf.index.AANode_}
 * @private
 */
lf.index.AATree.prototype.search_ = function(node, key) {
  if (node == this.nullNode_) {
    return null;
  }

  var favor = this.comparator_.compare(key, node.key);
  return (favor == lf.index.Favor.TIE) ? node :
      (favor == lf.index.Favor.RHS) ? this.search_(node.left, key) :
      this.search_(node.right, key);
};


/** @override */
lf.index.AATree.prototype.get = function(key) {
  var node = this.search_(this.root_, /** @type {!lf.index.Index.Key} */ (key));
  return node == null ? [] : [node.value];
};


/** @override */
lf.index.AATree.prototype.cost = function(opt_keyRange) {
  return goog.isDefAndNotNull(opt_keyRange) ?
      this.getRange([opt_keyRange]).length :
      this.getRange().length;
};


/**
 * @return {!lf.index.AANode_} The left most node
 * @private
 */
lf.index.AATree.prototype.getLeftMostNode_ = function() {
  var node = this.root_;
  while (node.left != this.nullNode_) {
    node = node.left;
  }
  return node;
};


/**
 * @return {!lf.index.AANode_} The left most node
 * @private
 */
lf.index.AATree.prototype.getRightMostNode_ = function() {
  var node = this.root_;
  while (node.right != this.nullNode_) {
    node = node.right;
  }
  return node;
};


/**
 * @param {!lf.index.AANode_} node
 * @param {!lf.index.KeyRange} keyRange
 * @param {!Array<number>} results
 * @private
 */
lf.index.AATree.prototype.traverse_ = function(node, keyRange, results) {
  if (node == this.nullNode_) {
    return;
  }

  var coverage = this.comparator_.compareRange(node.key, keyRange);
  if (coverage[0]) {
    this.traverse_(node.left, keyRange, results);
    if (coverage[1]) {
      results.push(node.value);
    }
  }

  if (coverage[1]) {
    this.traverse_(node.right, keyRange, results);
  }
};


/** @override */
lf.index.AATree.prototype.getRange = function(
    opt_keyRanges, opt_reverseOrder, opt_limit, opt_skip) {
  var sortedKeyRanges = goog.isDefAndNotNull(opt_keyRanges) ?
      this.comparator_.sortKeyRanges(opt_keyRanges) :
      [this.comparator_.getAllRange()];

  var results = [];
  sortedKeyRanges.forEach(function(range) {
    this.traverse_(this.root_, range, results);
  }, this);
  return lf.index.slice(results, opt_reverseOrder, opt_limit, opt_skip);
};


/** @override */
lf.index.AATree.prototype.clear = function() {
  this.root_ = this.nullNode_;
};


/** @override */
lf.index.AATree.prototype.containsKey = function(key) {
  return this.search_(
      this.root_, /** @type {!lf.index.Index.Key} */ (key)) != null;
};


/** @override */
lf.index.AATree.prototype.min = function() {
  return this.minMax_(goog.bind(this.comparator_.min, this.comparator_));
};


/** @override */
lf.index.AATree.prototype.max = function() {
  return this.minMax_(goog.bind(this.comparator_.max, this.comparator_));
};


/**
 * @param {!function(!lf.index.Index.Key, !lf.index.Index.Key):!lf.index.Favor}
 *     compareFn
 * @return {!Array} See lf.index.Index.min() or max() for details.
 * @private
 */
lf.index.AATree.prototype.minMax_ = function(compareFn) {
  var leftMostNode = this.getLeftMostNode_();
  var rightMostNode = this.getRightMostNode_();

  if (!goog.isDefAndNotNull(leftMostNode.key) &&
      !goog.isDefAndNotNull(rightMostNode.key)) {
    return [null, null];
  }

  return compareFn(leftMostNode.key, rightMostNode.key) == lf.index.Favor.LHS ?
      [leftMostNode.key, [leftMostNode.value]] :
      [rightMostNode.key, [rightMostNode.value]];
};


/** @override */
lf.index.AATree.prototype.serialize = function() {
  goog.asserts.fail('AATree index serialization is not supported.');
  return [];
};


/** @override */
lf.index.AATree.prototype.comparator = function() {
  return this.comparator_;
};


/**
 * @param {!lf.index.AANode_} node
 * @param {!Array<!Array<string>>} buffer
 * @private
 */
lf.index.AATree.prototype.dump_ = function(node, buffer) {
  if (node == this.nullNode_) return;

  var left = node.left == this.nullNode_ ? 0 : node.left.key;
  var right = node.right == this.nullNode_ ? 0 : node.right.key;
  var val = '[' + node.key + '-' + left + '/' + right + ']';
  buffer[node.level - 1].push(val);

  this.dump_(node.left, buffer);
  this.dump_(node.right, buffer);
};


/** @override */
lf.index.AATree.prototype.toString = function() {
  var buffer = [];
  for (var j = 0; j < this.root_.level; ++j) {
    buffer.push([]);
  }

  this.dump_(this.root_, buffer);
  var result = '';
  for (var i = buffer.length - 1; i >= 0; --i) {
    result = result + buffer[i].join('') + '\n';
  }
  return result;
};
