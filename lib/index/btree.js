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

/**
 * @fileoverview B+ Tree implementation. See "Database Systems: The Complete
 * Book" by Hector Garcia-Molina, Jeff Ullman, and Jennifer Widom, 2nd ed. pp.
 * 622 for the algorithm this code is based on.
 */
goog.provide('lf.index.BTree');

goog.require('goog.array');
goog.require('lf.Exception');
goog.require('lf.Row');
goog.require('lf.index');
goog.require('lf.index.Favor');
goog.require('lf.index.Index');
goog.require('lf.index.SingleKeyRange');



/**
 * Wrapper of the BTree.
 * @implements {lf.index.Index}
 * @param {string} name
 * @param {!lf.index.Comparator} comparator
 * @param {boolean} uniqueKeyOnly The tree does not allow duplicate keys.
 * @param {!Array.<!lf.index.BTreeNode_.Payload>=} opt_data Init sorted
 *     key-value pairs. This is used to quickly construct the tree from already
 *     stored and sorted data (about 5x to 6x faster according to benchmark).
 *     However, the caller should understand if they construct the pairs from
 *     unsorted rows and use that to construct the tree, the overhead of
 *     preprocessing will cancel out the performance gain.
 * @constructor
 * @struct
 * @final
 */
lf.index.BTree = function(name, comparator, uniqueKeyOnly, opt_data) {
  /** @private {string} */
  this.name_ = name;

  /** @private {!lf.index.Comparator} */
  this.comparator_ = comparator;

  /** @private {boolean} */
  this.uniqueKeyOnly_ = uniqueKeyOnly;

  /** @private {!lf.index.BTreeNode_} */
  this.root_;

  if (opt_data) {
    this.root_ = lf.index.BTreeNode_.fromData(this, opt_data);
  } else {
    this.clear();
  }
};


/** @override */
lf.index.BTree.prototype.getName = function() {
  return this.name_;
};


/** @override */
lf.index.BTree.prototype.toString = function() {
  return this.root_.toString();
};


/** @override */
lf.index.BTree.prototype.add = function(key, value) {
  this.root_ = this.root_.insert(key, value);
};


/** @override */
lf.index.BTree.prototype.set = function(key, value) {
  this.root_ = this.root_.insert(key, value, true);
};


/** @override */
lf.index.BTree.prototype.remove = function(key, opt_rowId) {
  this.root_ = this.root_.remove(key, opt_rowId);
};


/** @override */
lf.index.BTree.prototype.get = function(key) {
  return this.root_.get(key);
};


/** @override */
lf.index.BTree.prototype.cost = function(opt_keyRange) {
  // TODO(arthurhsu): B-Tree should have better cost calculation.
  return goog.isDefAndNotNull(opt_keyRange) ?
      this.getRange([opt_keyRange]).length :
      this.getRange().length;
};


/** @override */
lf.index.BTree.prototype.getRange = function(
    opt_keyRanges, opt_reverseOrder, opt_limit, opt_skip) {
  var normalizedKeyRanges;
  var min = this.root_.getLeftMostNode().keys_[0];
  var rightMostKeys = this.root_.getRightMostNode().keys_;
  var max = rightMostKeys[rightMostKeys.length - 1];
  if (goog.isDefAndNotNull(opt_keyRanges)) {
    normalizedKeyRanges = opt_keyRanges.map(function(range) {
      var normalized = this.comparator_.normalizeKeyRange(range);
      normalized.from = goog.isNull(normalized.from) ? min : normalized.from;
      normalized.to = goog.isNull(normalized.to) ? max : normalized.to;
      return normalized;
    }, this).sort(goog.bind(function(lhs, rhs) {
      return this.comparator_.compare(lhs.from, rhs.from);
    }, this));
  } else {
    // TODO(dpapad,arthurhsu): Need to address the case where getRange() is
    // called without a specified range for a cross-column index. Currently
    // getRange only works for a single column index.
    normalizedKeyRanges = [new lf.index.SingleKeyRange(
        /** @type {!lf.index.Index.SingleKey} */ (min),
        /** @type {!lf.index.Index.SingleKey} */ (max),
        false, false)];
  }

  var results = [];
  normalizedKeyRanges.forEach(function(range) {
    // Although the leaf nodes are represented in a linked list, we cannot
    // use the recursion of BTreeNode.getRange to retrieve the results.
    // The leaf span can be big enough to cause IE running out of stack.
    var start = this.root_.getContainingLeaf(range.from);
    var end = this.root_.getContainingLeaf(range.to);
    while (start != end.next()) {
      start.getRange(range, results);
      start = start.next();
    }
  }, this);

  return lf.index.slice(results, opt_reverseOrder, opt_limit, opt_skip);
};


/** @override */
lf.index.BTree.prototype.clear = function() {
  this.root_ = lf.index.BTreeNode_.create(this);
};


/** @override */
lf.index.BTree.prototype.containsKey = function(key) {
  return this.root_.containsKey(key);
};


/** @override */
lf.index.BTree.prototype.min = function() {
  return this.minMax_(goog.bind(this.comparator_.min, this.comparator_));
};


/** @override */
lf.index.BTree.prototype.max = function() {
  return this.minMax_(goog.bind(this.comparator_.max, this.comparator_));
};


/**
 * @param {!function(!lf.index.Index.Key, !lf.index.Index.Key):!lf.index.Favor}
 *     compareFn
 * @return {!Array} See lf.index.Index.min() or max() for details.
 * @private
 */
lf.index.BTree.prototype.minMax_ = function(compareFn) {
  var leftMostNode = this.root_.getLeftMostNode();
  var rightMostNode = this.root_.getRightMostNode();

  if (leftMostNode.keys_.length == 0 && rightMostNode.keys_.length == 0) {
    return [null, null];
  }

  var leftMostKey = leftMostNode.keys_[0];
  var leftMostValues = leftMostNode.values_[0];
  var rightMostKey = rightMostNode.keys_[rightMostNode.keys_.length - 1];
  var rightMostValues =
      rightMostNode.values_[rightMostNode.keys_.length - 1];

  return compareFn(leftMostKey, rightMostKey) == lf.index.Favor.LHS ?
      [leftMostKey, this.uniqueKeyOnly_ ? [leftMostValues] : leftMostValues] :
      [rightMostKey, this.uniqueKeyOnly_ ? [rightMostValues] : rightMostValues];
};


/** @return {boolean} */
lf.index.BTree.prototype.isUniqueKeyOnly = function() {
  return this.uniqueKeyOnly_;
};


/** @override */
lf.index.BTree.prototype.comparator = function() {
  return this.comparator_;
};


/**
 * @param {?lf.index.Index.Key} lhs
 * @param {lf.index.Index.Key} rhs
 * @return {boolean}
 */
lf.index.BTree.prototype.lt = function(lhs, rhs) {
  if (goog.isDefAndNotNull(lhs)) {
    return this.comparator_.compare(lhs, rhs) == lf.index.Favor.RHS;
  }
  return false;
};


/**
 * @param {?lf.index.Index.Key} lhs
 * @param {!lf.index.Index.Key} rhs
 * @return {boolean}
 */
lf.index.BTree.prototype.eq = function(lhs, rhs) {
  if (goog.isDefAndNotNull(lhs)) {
    return this.comparator_.compare(lhs, rhs) == lf.index.Favor.TIE;
  }
  return false;
};


/**
 * Converts the tree leaves into serializable rows that can be written into
 * persistent stores. Each leaf node is one row.
 * @override
 */
lf.index.BTree.prototype.serialize = function() {
  var start = this.root_.getLeftMostNode();
  return lf.index.BTreeNode_.serialize(start);
};


/**
 * Creates tree from serialized leaves.
 * @param {!lf.index.Comparator} comparator
 * @param {!Array.<!lf.Row>} rows
 * @param {string} name
 * @param {boolean} uniqueKeyOnly
 * @return {!lf.index.BTree}
 */
lf.index.BTree.deserialize = function(comparator, rows, name, uniqueKeyOnly) {
  var tree = new lf.index.BTree(name, comparator, uniqueKeyOnly);
  var newRoot = lf.index.BTreeNode_.deserialize(rows, tree);
  tree.root_ = newRoot;
  return tree;
};



/**
 * @param {number} id
 * @param {!lf.index.BTree} tree
 * @constructor
 * @struct
 * @private
 */
lf.index.BTreeNode_ = function(id, tree) {
  /** @private {number} */
  this.id_ = id;

  /** @private {!lf.index.BTree} */
  this.tree_ = tree;

  /** @private {number} */
  this.height_ = 0;

  /** @private {?lf.index.BTreeNode_} */
  this.parent_ = null;

  /** @private {?lf.index.BTreeNode_} */
  this.prev_ = null;

  /** @private {?lf.index.BTreeNode_} */
  this.next_ = null;

  /** @private {!Array.<!lf.index.Index.Key>} */
  this.keys_ = [];

  /** @private {!Array.<number|!Array.<number>>} */
  this.values_ = [];

  /** @private {!Array.<!lf.index.BTreeNode_>} */
  this.children_ = [];
};


/**
 * Maximum number of children a node can have (i.e. order of the B-Tree, denoted
 * as N in the following comments). This number must be greater or equals to 4
 * for the implemented deletion algorithm to function correctly.
 * @const {number}
 * @private
 */
lf.index.BTreeNode_.MAX_COUNT_ = 512;


/**
 * @const {number}
 * @private
 */
lf.index.BTreeNode_.MAX_KEY_LEN_ = lf.index.BTreeNode_.MAX_COUNT_ - 1;


/**
 * @const {number}
 * @private
 */
lf.index.BTreeNode_.MIN_KEY_LEN_ = lf.index.BTreeNode_.MAX_COUNT_ >> 1;


/**
 * @param {!lf.index.BTree} tree
 * @return {!lf.index.BTreeNode_}
 */
lf.index.BTreeNode_.create = function(tree) {
  // TODO(arthurhsu): Should distinguish internal nodes from leaf nodes to avoid
  //     unnecessary row id wasting.
  var node = new lf.index.BTreeNode_(lf.Row.getNextId(), tree);
  return node;
};


/**
 * @return {boolean}
 * @private
 */
lf.index.BTreeNode_.prototype.isLeaf_ = function() {
  return this.height_ == 0;
};


/**
 * @return {boolean}
 * @private
 */
lf.index.BTreeNode_.prototype.isRoot_ = function() {
  return this.parent_ == null;
};


/** @return {?lf.index.BTreeNode_} */
lf.index.BTreeNode_.prototype.next = function() {
  return this.next_;
};


/**
 * Dump the contents of node of the same depth.
 * @param {!lf.index.BTreeNode_} node Left-most node in the level.
 * @return {!Array.<string>} Key and contents string in pair.
 * @private
 */
lf.index.BTreeNode_.dumpLevel_ = function(node) {
  var key = node.id_ + '[' + node.keys_.join('|') + ']';
  var childrenIds = node.children_.map(function(n) {
    return n.id_;
  });
  var children = childrenIds.join('|');
  var values = node.values_.join('/');
  var getNodeId = function(node) {
    return goog.isDefAndNotNull(node) ? node.id_.toString() : '_';
  };

  var contents = getNodeId(node.prev_) + '{';
  if (node.isLeaf_()) {
    contents = contents + values;
  } else {
    contents = contents + children;
  }
  contents = contents + '}' + getNodeId(node.parent_);
  if (node.next_) {
    var next = lf.index.BTreeNode_.dumpLevel_(node.next_);
    key = key + '  ' + next[0];
    contents = contents + '  ' + next[1];
  }
  return [key, contents];
};


/**
 * Dump the tree as string. For example, if the tree is
 *
 *                     15
 *          /                      \
 *        9|13                   27|31
 *  /      |       \        /      |      \
 * 1|3  9|10|11  13|14    15|16  27|29  31|38|45
 *
 * and the values of the tree are identical to the keys, then the output will be
 *
 * 11[15]
 * _{2|12}_
 * 2[9|13]  12[27|31]
 * _{0|15|1}11  2{17|5|7}11
 * 0[1|3]  15[9|10|11]  1[13|14]  17[15|16]  5[27|29]  7[31|38|45]
 * _{1/3}2  0{9/10/11}2  15{13/14}2  1{15/16}12  17{27/29}12  5{31/38/45}12
 *
 * Each tree level contains two lines, the first line is the key line containing
 * keys of each node in the format of <node_id>[<key0>|<key1>|...|<keyN-1>]. The
 * second line is the value line containing values of each node in the format of
 * <left_node_id>[<value0>|<value1>|...|<valueN>]<parent_node_id>. The root node
 * does not have parent so its parent node id is denoted as underscore.
 *
 * Nodes in each level is a doubly-linked list therefore BFS traversal from
 * left-most to right-most is used. As a result, if the right link is
 * broken, the result will be partial.
 *
 * @override
 */
lf.index.BTreeNode_.prototype.toString = function() {
  var result = '';
  var level = lf.index.BTreeNode_.dumpLevel_(this);
  result += level[0] + '\n' + level[1] + '\n';
  if (this.children_.length) {
    result += this.children_[0].toString();
  }
  return result;
};


/** @return {!lf.index.BTreeNode_} Left most leaf of the sub-tree */
lf.index.BTreeNode_.prototype.getLeftMostNode = function() {
  if (this.isLeaf_()) {
    return this;
  }
  return this.children_[0].getLeftMostNode();
};


/** @return {!lf.index.BTreeNode_} Right most leaf of the sub-tree */
lf.index.BTreeNode_.prototype.getRightMostNode = function() {
  if (this.isLeaf_()) {
    return this;
  }
  return this.children_[this.children_.length - 1].getRightMostNode();
};


/**
 * Associates two nodes.
 * @param {?lf.index.BTreeNode_} left
 * @param {?lf.index.BTreeNode_} right
 * @private
 */
lf.index.BTreeNode_.associate_ = function(left, right) {
  if (right) {
    right.prev_ = left;
  }
  if (left) {
    left.next_ = right;
  }
};


/**
 * Returns appropriate node length for direct construction.
 * @param {number} remaining
 * @return {number}
 * @private
 */
lf.index.BTreeNode_.calcNodeLen_ = function(remaining) {
  var maxLen = lf.index.BTreeNode_.MAX_KEY_LEN_;
  var minLen = lf.index.BTreeNode_.MIN_KEY_LEN_ + 1;
  return (remaining >= maxLen + minLen) ? maxLen :
      ((remaining >= minLen && remaining <= maxLen) ? remaining : minLen);
};


/**
 * Serialized node data.
 * @typedef {{
 *   key: !lf.index.Index.Key,
 *   value: number
 * }}
 */
lf.index.BTreeNode_.Payload;


/**
 * Create leaf nodes from given data.
 * @param {!lf.index.BTree} tree
 * @param {!Array.<!lf.index.BTreeNode_.Payload>} data Sorted array.
 * @return {!lf.index.BTreeNode_} Left most node of the leaves.
 * @private
 */
lf.index.BTreeNode_.createLeaves_ = function(tree, data) {
  var remaining = data.length;
  var dataIndex = 0;

  var curNode = lf.index.BTreeNode_.create(tree);
  var node = curNode;
  while (remaining > 0) {
    var nodeLen = lf.index.BTreeNode_.calcNodeLen_(remaining);
    var target = data.slice(dataIndex, dataIndex + nodeLen);
    curNode.keys_ = target.map(function(e) { return e.key; });
    curNode.values_ = target.map(function(e) { return e.value; });
    dataIndex += nodeLen;
    remaining -= nodeLen;
    if (remaining > 0) {
      var newNode = lf.index.BTreeNode_.create(curNode.tree_);
      lf.index.BTreeNode_.associate_(curNode, newNode);
      curNode = newNode;
    }
  }

  return node;
};


/**
 * Creates parent node from children nodes.
 * @param {!Array.<lf.index.BTreeNode_>} nodes
 * @return {!lf.index.BTreeNode_}
 * @private
 */
lf.index.BTreeNode_.createParent_ = function(nodes) {
  var node = nodes[0];
  var root = lf.index.BTreeNode_.create(node.tree_);
  root.height_ = node.height_ + 1;
  root.children_ = nodes;
  for (var i = 0; i < nodes.length; ++i) {
    nodes[i].parent_ = root;
    if (i > 0) {
      root.keys_.push(nodes[i].keys_[0]);
    }
  }
  return root;
};


/**
 * @param {!lf.index.BTreeNode_} node Left-most leaf node.
 * @return {!lf.index.BTreeNode_} Root of the tree.
 * @private
 */
lf.index.BTreeNode_.createInternals_ = function(node) {
  var curNode = node;
  var data = [];
  do {
    data.push(curNode);
    curNode = curNode.next_;
  } while (curNode);

  var root;
  if (data.length <= lf.index.BTreeNode_.MAX_KEY_LEN_ + 1) {
    // Create a root node and return.
    root = lf.index.BTreeNode_.createParent_(data);
  } else {
    var remaining = data.length;
    var dataIndex = 0;

    root = lf.index.BTreeNode_.create(node.tree_);
    root.height_ = node.height_ + 2;
    while (remaining > 0) {
      var nodeLen = lf.index.BTreeNode_.calcNodeLen_(remaining);
      var target = data.slice(dataIndex, dataIndex + nodeLen);
      var newNode = lf.index.BTreeNode_.createParent_(target);
      newNode.parent_ = root;
      if (root.children_.length) {
        root.keys_.push(target[0].keys_[0]);
        lf.index.BTreeNode_.associate_(
            root.children_[root.children_.length - 1], newNode);
      }
      root.children_.push(newNode);
      dataIndex += nodeLen;
      remaining -= nodeLen;
    }
  }
  return root;
};


/**
 * Create B-Tree from sorted array of key-value pairs.
 * @param {!lf.index.BTree} tree
 * @param {!Array.<!lf.index.BTreeNode_.Payload>} data Initial sorted tree data.
 * @return {!lf.index.BTreeNode_} Root of the B-Tree.
 */
lf.index.BTreeNode_.fromData = function(tree, data) {
  var max = lf.index.BTreeNode_.MAX_KEY_LEN_;
  max = max * max * max;
  if (data.length >= max) {
    // Tree has more than three levels, need to use a bigger N!
    throw new lf.Exception(lf.Exception.Type.TOO_MANY_ROWS,
        'B-Tree implementation supports at most ' + max + ' rows.');
  }
  var node = lf.index.BTreeNode_.createLeaves_(tree, data);
  node = lf.index.BTreeNode_.createInternals_(node);
  return node;
};


/**
 * Returns an element.
 * @param {!lf.index.Index.Key} key
 * @return {!Array.<number>}
 */
lf.index.BTreeNode_.prototype.get = function(key) {
  var pos = this.searchKey_(key);
  if (this.isLeaf_()) {
    var results = [];
    if (this.tree_.eq(this.keys_[pos], key)) {
      // Use concat here because this.values_[pos] can be number or array.
      results = results.concat(this.values_[pos]);
    }
    return results;
  } else {
    pos = (this.tree_.eq(this.keys_[pos], key)) ? pos + 1 : pos;
    return this.children_[pos].get(key);
  }
};


/**
 * @param {!lf.index.Index.Key} key
 * @return {boolean}
 */
lf.index.BTreeNode_.prototype.containsKey = function(key) {
  var pos = this.searchKey_(key);
  if (this.tree_.eq(this.keys_[pos], key)) {
    return true;
  }

  return this.isLeaf_() ? false : this.children_[pos].containsKey(key);
};


/**
 * Deletes an element.
 * @param {!lf.index.Index.Key} key
 * @param {number=} opt_value
 * @return {!lf.index.BTreeNode_} Root node after deletion.
 */
lf.index.BTreeNode_.prototype.remove = function(key, opt_value) {
  this.delete_(key, -1, opt_value);

  if (this.isRoot_()) {
    var root = this;
    if (this.children_.length == 1) {
      root = this.children_[0];
      root.parent_ = null;
    }
    return root;
  }

  return this;
};


/**
 * Returns left most key of the subtree.
 * @param {!lf.index.BTreeNode_} node
 * @return {!lf.index.Index.Key}
 * @private
 */
lf.index.BTreeNode_.leftMostKey_ = function(node) {
  if (node.isLeaf_()) {
    return node.keys_[0];
  }

  return lf.index.BTreeNode_.leftMostKey_(node.children_[0]);
};


/**
 * Reconstructs internal node keys.
 * @private
 */
lf.index.BTreeNode_.prototype.fix_ = function() {
  this.keys_ = [];
  for (var i = 1; i < this.children_.length; ++i) {
    this.keys_.push(lf.index.BTreeNode_.leftMostKey_(this.children_[i]));
  }
};


/**
 * Deletes a key from a given node. If the key length is smaller than required,
 * execute the following operations according to order:
 * 1. Steal a key from right sibling, if there is one with key > N/2
 * 2. Steal a key from left sibling, if there is one with key > N/2
 * 3. Merge to right sibling, if any
 * 4. Merge to left sibling, if any
 *
 * When stealing and merging happens on internal nodes, the key_ array of that
 * node will be obsolete and need to be reconstructed by fix_().
 *
 * @param {!lf.index.Index.Key} key
 * @param {number} parentPos Position of this node in parent's children.
 * @param {number=} opt_value Match the value to delete.
 * @return {boolean} Whether a fix is needed or not.
 * @private
 */
lf.index.BTreeNode_.prototype.delete_ = function(key, parentPos, opt_value) {
  var pos = this.searchKey_(key);
  if (!this.isLeaf_()) {
    var index = this.tree_.eq(this.keys_[pos], key) ? pos + 1 : pos;
    if (this.children_[index].delete_(key, index, opt_value)) {
      this.fix_();
    } else {
      return false;
    }
  } else if (!this.tree_.eq(this.keys_[pos], key)) {
    return false;
  }

  if (this.keys_.length > pos && this.tree_.eq(this.keys_[pos], key)) {
    if (goog.isDef(opt_value) &&
        !this.tree_.isUniqueKeyOnly() &&
        this.isLeaf_()) {
      goog.array.binaryRemove(
          /** @type {!Array.<number>} */ (this.values_[pos]), opt_value);
      if (this.values_[pos].length) {
        return false;  // No need to fix.
      }
    }

    this.keys_.splice(pos, 1);
    if (this.isLeaf_()) {
      this.values_.splice(pos, 1);
    }
  }

  if (this.keys_.length < lf.index.BTreeNode_.MIN_KEY_LEN_ && !this.isRoot_()) {
    if (!this.steal_()) {
      this.merge_(parentPos);
    }
    return true;
  }

  return true;
};


/**
 * Steals key from adjacent nodes.
 * @return {boolean} Successfully stole a key from adjacent node.
 * @private
 */
lf.index.BTreeNode_.prototype.steal_ = function() {
  var from = null;
  var fromIndex;
  var fromChildIndex;
  var toIndex;
  if (this.next_ &&
      this.next_.keys_.length > lf.index.BTreeNode_.MIN_KEY_LEN_) {
    from = this.next_;
    fromIndex = 0;
    fromChildIndex = 0;
    toIndex = this.keys_.length + 1;
  } else if (this.prev_ &&
      this.prev_.keys_.length > lf.index.BTreeNode_.MIN_KEY_LEN_) {
    from = this.prev_;
    fromIndex = this.prev_.keys_.length - 1;
    fromChildIndex = this.isLeaf_() ? fromIndex : fromIndex + 1;
    toIndex = 0;
  } else {
    return false;
  }

  this.keys_.splice(toIndex, 0, from.keys_[fromIndex]);
  from.keys_.splice(fromIndex, 1);
  var child = this.isLeaf_() ? this.values_ : this.children_;
  var fromChild = this.isLeaf_() ? from.values_ : from.children_;
  child.splice(toIndex, 0, fromChild[fromChildIndex]);
  fromChild[fromChildIndex].parent_ = this;
  fromChild.splice(fromChildIndex, 1);
  if (!from.isLeaf_()) {
    from.fix_();
    this.fix_();
  }

  return true;
};


/**
 * Merges with adjacent nodes.
 * @param {number} parentPos Position of this node in parent's children.
 * @private
 */
lf.index.BTreeNode_.prototype.merge_ = function(parentPos) {
  var mergeTo;
  var keyOffset;
  var childOffset;
  if (this.next_ &&
      this.next_.keys_.length < lf.index.BTreeNode_.MAX_KEY_LEN_) {
    mergeTo = this.next_;
    keyOffset = 0;
    childOffset = 0;
  } else if (this.prev_) {
    mergeTo = this.prev_;
    keyOffset = mergeTo.keys_.length;
    childOffset = mergeTo.isLeaf_() ? mergeTo.values_.length :
        mergeTo.children_.length;
  }
  var args = [keyOffset, 0].concat(this.keys_);
  Array.prototype.splice.apply(mergeTo.keys_, args);
  var myChildren = this.isLeaf_() ? this.values_ : this.children_;
  myChildren.forEach(function(node) {
    node.parent_ = mergeTo;
  });
  args = [childOffset, 0].concat(myChildren);
  Array.prototype.splice.apply(
      mergeTo.isLeaf_() ? mergeTo.values_ : mergeTo.children_, args);
  lf.index.BTreeNode_.associate_(this.prev_, this.next_);
  if (!mergeTo.isLeaf_()) {
    mergeTo.fix_();
  }
  if (parentPos != -1) {
    this.parent_.keys_.splice(parentPos, 1);
    this.parent_.children_.splice(parentPos, 1);
  }
};


/**
 * Insert node into this subtree.
 * @param {!lf.index.Index.Key} key
 * @param {number} value
 * @param {boolean=} opt_replace Replace the value if key existed.
 * @return {!lf.index.BTreeNode_} The new root if any.
 */
lf.index.BTreeNode_.prototype.insert = function(key, value, opt_replace) {
  var pos = this.searchKey_(key);
  if (this.isLeaf_()) {
    if (this.tree_.eq(this.keys_[pos], key)) {
      if (opt_replace) {
        this.values_[pos] = this.tree_.isUniqueKeyOnly() ? value : [value];
        return this;
      } else if (this.tree_.isUniqueKeyOnly()) {
        throw new lf.Exception(
            lf.Exception.Type.CONSTRAINT,
            'Duplicate key not allowed');
      } else {
        if (this.values_[pos]) {
          goog.array.binaryInsert(
              /** @type {!Array.<number>} */ (this.values_[pos]), value);
          return this;
        } else {
          this.values_[pos] = [value];
        }
      }
    }
    this.keys_.splice(pos, 0, key);
    this.values_.splice(pos, 0, this.tree_.isUniqueKeyOnly() ? value : [value]);
    return (this.keys_.length == lf.index.BTreeNode_.MAX_COUNT_) ?
        this.splitLeaf_() : this;
  } else {
    pos = this.tree_.eq(this.keys_[pos], key) ? pos + 1 : pos;
    var node = this.children_[pos].insert(key, value, opt_replace);
    if (!node.isLeaf_() && node.keys_.length == 1) {
      // Merge the internal to self.
      this.keys_.splice(pos, 0, node.keys_[0]);
      node.children_[1].parent_ = this;
      node.children_[0].parent_ = this;
      this.children_.splice(pos, 1, node.children_[1]);
      this.children_.splice(pos, 0, node.children_[0]);
    }
    return (this.keys_.length == lf.index.BTreeNode_.MAX_COUNT_) ?
        this.splitInternal_() : this;
  }
};


/**
 * Split leaf node into two nodes.
 * @return {!lf.index.BTreeNode_} The splitted internal node.
 * @private
 */
lf.index.BTreeNode_.prototype.splitLeaf_ = function() {
  var half = lf.index.BTreeNode_.MIN_KEY_LEN_;

  var right = lf.index.BTreeNode_.create(this.tree_);
  var root = lf.index.BTreeNode_.create(this.tree_);

  root.height_ = 1;
  root.keys_ = [this.keys_[half]];
  root.children_ = [this, right];
  root.parent_ = this.parent_;

  this.parent_ = root;
  right.keys_ = this.keys_.splice(half);
  right.values_ = this.values_.splice(half);
  right.parent_ = root;
  lf.index.BTreeNode_.associate_(right, this.next_);
  lf.index.BTreeNode_.associate_(this, right);
  return root;
};


/**
 * Split internal node into two nodes.
 * @return {!lf.index.BTreeNode_} The splitted internal node.
 * @private
 */
lf.index.BTreeNode_.prototype.splitInternal_ = function() {
  var half = lf.index.BTreeNode_.MIN_KEY_LEN_;
  var root = lf.index.BTreeNode_.create(this.tree_);
  var right = lf.index.BTreeNode_.create(this.tree_);

  root.parent_ = this.parent_;
  root.height_ = this.height_ + 1;
  root.keys_ = [this.keys_[half]];
  root.children_ = [this, right];

  this.keys_.splice(half, 1);
  right.parent_ = root;
  right.height_ = this.height_;
  right.keys_ = this.keys_.splice(half);
  right.children_ = this.children_.splice(half + 1);
  right.children_.forEach(function(node) {
    node.parent_ = right;
  });

  this.parent_ = root;
  lf.index.BTreeNode_.associate_(right, this.next_);
  lf.index.BTreeNode_.associate_(this, right);
  return root;
};


/**
 * @param {!lf.index.Index.Key} key
 * @return {number} The position where the key is the closest smaller or
 *     equals to.
 * @private
 */
lf.index.BTreeNode_.prototype.searchKey_ = function(key) {
  // Binary search variation.
  var left = 0;
  var right = this.keys_.length;
  while (left < right) {
    var middle = (left + right) >> 1;
    if (this.tree_.lt(this.keys_[middle], key)) {
      left = middle + 1;
    } else {
      right = middle;
    }
  }

  return left;
};


/**
 * @param {!lf.index.Index.Key} key
 * @return {!lf.index.BTreeNode_}
 */
lf.index.BTreeNode_.prototype.getContainingLeaf = function(key) {
  if (!this.isLeaf_()) {
    var pos = this.searchKey_(key);
    if (this.tree_.eq(this.keys_[pos], key)) {
      pos++;
    }
    return this.children_[pos].getContainingLeaf(key);
  }

  return this;
};


/**
 * @param {lf.index.SingleKeyRange=} opt_keyRange
 * @param {!Array.<number>=} opt_results An array holding any results found from
 *     previous calls to getRange(). If specified any new results will be
 *     appended to this array.
 * @return {!Array.<number>}
 */
lf.index.BTreeNode_.prototype.getRange = function(opt_keyRange, opt_results) {
  var start = 0;
  var end = this.keys_.length - 1;

  if (goog.isDefAndNotNull(opt_keyRange)) {
    var comparator = this.tree_.comparator();
    var c = goog.bind(comparator.compare, comparator);

    if (!goog.isNull(opt_keyRange.to)) {
      if (c(this.keys_[0], opt_keyRange.to) == lf.index.Favor.LHS) {
        return [];
      } else if (c(this.keys_[end], opt_keyRange.to) != lf.index.Favor.RHS) {
        end = this.searchKey_(opt_keyRange.to);
        if ((opt_keyRange.excludeUpper &&
            c(this.keys_[end], opt_keyRange.to) == lf.index.Favor.TIE) ||
            c(this.keys_[end], opt_keyRange.to) == lf.index.Favor.LHS) {
          end--;
        }
      }
    }
    if (!goog.isNull(opt_keyRange.from) &&
        c(this.keys_[0], opt_keyRange.from) != lf.index.Favor.LHS) {
      start = this.searchKey_(opt_keyRange.from);
      if (opt_keyRange.excludeLower &&
          c(this.keys_[start], opt_keyRange.from) == lf.index.Favor.TIE) {
        start++;
      }
    }
  }

  var results = opt_results || [];
  if (end == this.keys_.length - 1) {
    this.appendResults_(results, this.values_.slice(start));
  } else if (end >= start) {
    this.appendResults_(results, this.values_.slice(start, end + 1));
  }

  return results;
};


/**
 * Appends newly found results to an existing bag of results.
 * @param {!Array.<number>} currentResults
 * @param {!Array.<number>|!Array.<!Array.<number>>} newResults
 * @private
 */
lf.index.BTreeNode_.prototype.appendResults_ = function(
    currentResults, newResults) {
  currentResults.push.apply(
      currentResults,
      this.tree_.isUniqueKeyOnly() ?
          newResults : goog.array.flatten(newResults));
};


/**
 * @param {!lf.index.BTreeNode_} start
 * @return {!Array.<!lf.Row>}
 */
lf.index.BTreeNode_.serialize = function(start) {
  var rows = [];
  var node = start;
  while (node) {
    var payload = [node.keys_, node.values_];
    rows.push(new lf.Row(node.id_, payload));
    node = node.next_;
  }
  return rows;
};


/**
 * @param {!Array.<!lf.Row>} rows
 * @param {!lf.index.BTree} tree
 * @return {!lf.index.BTreeNode_} New root node.
 */
lf.index.BTreeNode_.deserialize = function(rows, tree) {
  var leaves = rows.map(function(row) {
    var node = new lf.index.BTreeNode_(row.id(), tree);
    node.keys_ = row.payload()[0];
    node.values_ = row.payload()[1];
    return node;
  });
  for (var i = 0; i < leaves.length - 1; ++i) {
    lf.index.BTreeNode_.associate_(leaves[i], leaves[i + 1]);
  }
  return (leaves.length > 1) ?
      lf.index.BTreeNode_.createInternals_(leaves[0]) :
      leaves[0];
};
