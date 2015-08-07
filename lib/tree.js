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
goog.provide('lf.tree');

goog.require('goog.asserts');


/**
 * Creates a new tree with the exact same structure, where every node in the
 * tree has been replaced by a new node according to the mapping function. This
 * is equivalent to Array#map, but for a tree data structure.
 * Note: T1 and T2 are expected to be either lf.structs.TreeNode or subtypes
 * but there is no way to currently express that in JS compiler annotations.
 *
 * @param {T1} original
 * @param {!function(T1):T2} mapFn
 * @return {T2}
 * @template T1, T2
 */
lf.tree.map = function(original, mapFn) {
  // A stack storing nodes that will be used as parents later in the traversal.
  var copyParentStack = [];

  /**
   * Removes a node from the parent stack, if that node has already reached its
   * target number of children.
   * @param {?lf.structs.TreeNode} original The original node.
   * @param {!lf.structs.TreeNode} clone The corresponding cloned node.
   */
  var cleanUpParentStack = function(original, clone) {
    if (goog.isNull(original)) {
      return;
    }

    var cloneFull = original.getChildCount() == clone.getChildCount();
    if (cloneFull) {
      var cloneIndex = copyParentStack.indexOf(clone);
      if (cloneIndex != -1) {
        copyParentStack.splice(cloneIndex, 1);
      }
    }
  };

  // The node that should become the parent of the next traversed node.
  var nextParent = null;
  var copyRoot = null;

  original.traverse(
      /** @param {!lf.structs.TreeNode} node */
      function(node) {
        var newNode = mapFn(node);

        if (node.getParent() == null) {
          copyRoot = newNode;
        } else {
          nextParent.addChild(newNode);
        }

        cleanUpParentStack(node.getParent(), nextParent);
        if (node.getChildCount() > 1) {
          copyParentStack.push(newNode);
        }
        nextParent = node.isLeaf() ?
            copyParentStack[copyParentStack.length - 1] : newNode;
      });

  return copyRoot;
};


/**
 * Finds all leafs node existing in the subtree that starts at the given node.
 * @param {!lf.structs.TreeNode} node
 * @return {!Array<!lf.structs.TreeNode>}
 */
lf.tree.getLeafNodes = function(node) {
  return lf.tree.find(node, function(node) { return node.isLeaf(); });
};


/**
 * Removes a node from a tree. It takes care of re-parenting the children of the
 * removed node with its parent (if any).
 * @param {!lf.structs.TreeNode} node The node to be removed.
 * @return {{
 *   parent: ?lf.structs.TreeNode,
 *   children: !Array<!lf.structs.TreeNode>
 * }} An object holding the parent of the node prior to removal (if any), and
 * the children of the node prior to removal.
 */
lf.tree.removeNode = function(node) {
  var parentNode = node.getParent();
  var originalIndex = 0;
  if (!goog.isNull(parentNode)) {
    originalIndex = parentNode.getChildren().indexOf(node);
    parentNode.removeChild(node);
  }

  var children = node.getChildren().slice();
  children.forEach(
      function(child, index) {
        node.removeChild(child);
        if (!goog.isNull(parentNode)) {
          parentNode.addChildAt(child, originalIndex + index);
        }
      });

  return {
    parent: parentNode,
    children: children
  };
};


/**
 * Inserts a new node under an existing node. The new node inherits all children
 * of the existing node, and the existing node ends up having only the new node
 * as a child.
 * Example: Calling iusertNodeAt(n2, n6) would result in the following
 * transformation.
 *
 *        n1              n1
 *       /  \            /  \
 *      n2  n5          n2  n5
 *     /  \      =>    /
 *    n3  n4          n6
 *                   /  \
 *                  n3  n4
 *
 * @param {!lf.structs.TreeNode} existingNode
 * @param {!lf.structs.TreeNode} newNode
 */
lf.tree.insertNodeAt = function(existingNode, newNode) {
  var children = existingNode.getChildren().slice();
  children.forEach(
      function(child) {
        existingNode.removeChild(child);
        newNode.addChild(child);
      });

  existingNode.addChild(newNode);
};


/**
 * Swaps a node with its only child. The child also needs to have exactly one
 * child.
 * Example: Calling swapNodeWithChild(n2) would result in the following
 * transformation.
 *
 *        n1              n1
 *       /  \            /  \
 *      n2   n6         n3  n6
 *     /         =>    /
 *    n3              n2
 *   /  \            /  \
 *  n4  n5          n4  n5
 *
 * @param {!lf.structs.TreeNode} node The node to be swapped.
 * @return {!lf.structs.TreeNode} The new root of the subtree that used to
 *     start where "node" was before swapping.
 */
lf.tree.swapNodeWithChild = function(node) {
  goog.asserts.assert(node.getChildCount() == 1);
  var child = node.getChildAt(0);
  goog.asserts.assert(child.getChildCount() == 1);

  lf.tree.removeNode(node);
  lf.tree.insertNodeAt(child, node);
  return child;
};


/**
 * Pushes a node below its only child. It takes care of replicating the node
 * only for those branches where it makes sense.
 * Example: Calling
 *   pushNodeBelowChild(
 *       n2,
 *       function(grandChild) {return true;},
 *       function(node) {return node.clone();})
 *  would result in the following transformation.
 *
 *        n1              n1
 *       /  \            /  \
 *      n2   n6         n3  n6
 *     /         =>    /  \
 *    n3             n2'  n2''
 *   /  \            /      \
 *  n4  n5          n4      n5
 *
 *  where n2 has been pushed below n3, on both branches. n2'and n2'' denote that
 *  copies of the original node were made.
 *
 * @param {!lf.structs.TreeNode} node The node to be pushed down.
 * @param {!function(!lf.structs.TreeNode):boolean} shouldPushDownFn
 *     A function that is called on every grandchild to determine whether the
 *     node can be pushed down on that branch.
 * @param {function(!lf.structs.TreeNode):!lf.structs.TreeNode} cloneFn
 *     A function used to clone the node that is being pushed down.
 * @return {!lf.structs.TreeNode} The new parent of the subtree that used to
 *     start at "node" or "node" itself if it could not be pushed down at all.
 */
lf.tree.pushNodeBelowChild = function(node, shouldPushDownFn, cloneFn) {
  goog.asserts.assert(node.getChildCount() == 1);
  var child = node.getChildAt(0);
  goog.asserts.assert(child.getChildCount() > 1);

  var grandChildren = child.getChildren().slice();
  var canPushDown = grandChildren.some(
      function(grandChild) {
        return shouldPushDownFn(grandChild);
      });

  if (!canPushDown) {
    return node;
  }

  lf.tree.removeNode(node);

  grandChildren.forEach(
      function(grandChild, index) {
        if (shouldPushDownFn(grandChild)) {
          var newNode = cloneFn(node);
          child.removeChildAt(index);
          newNode.addChild(grandChild);
          child.addChildAt(newNode, index);
        }
      });

  return child;
};


/**
 * Replaces a chain of nodes with a new chain of nodes.
 * Example: Calling replaceChainWithChain(n2, n3, n7, n8) would result in the
 * following transformation.
 *
 *        n1              n1
 *       /  \            /  \
 *      n2   n6         n7   n6
 *     /         =>    /
 *    n3              n8
 *   /  \            /  \
 *  n4  n5          n4  n5
 *
 * @param {!lf.structs.TreeNode} oldHead The head of the chain to be removed.
 * @param {!lf.structs.TreeNode} oldTail The tail of the chain to be removed.
 * @param {!lf.structs.TreeNode} newHead The head of the chain to be added.
 * @param {!lf.structs.TreeNode} newTail The tail of the chain to be added.
 * @return {!lf.structs.TreeNode} The new root of the subtree that used to
 *     start at "oldhead". Effectively the new root is always equal to
 *     "newHead".
 */
lf.tree.replaceChainWithChain = function(oldHead, oldTail, newHead, newTail) {
  var parentNode = oldHead.getParent();
  if (!goog.isNull(parentNode)) {
    var oldHeadIndex = parentNode.getChildren().indexOf(oldHead);
    parentNode.removeChildAt(oldHeadIndex);
    parentNode.addChildAt(newHead, oldHeadIndex);
  }

  oldTail.getChildren().slice().forEach(
      function(child) {
        oldTail.removeChild(child);
        newTail.addChild(child);
      });

  return newHead;
};


/**
 * Removes a node from the tree, and replaces it with a chain of nodes where
 * each node in the chain (excluding the tail) has exactly one child.
 * Example: Calling replaceNodeWithChain(n6, n10, n12), where the chain consists
 * of n7->n8->n9, would result in the following transformation.
 *
 *        n1               n1
 *       /  \             /  \
 *      n2   n6          n2  n10
 *     /    /  \    =>  /      \
 *    n3   n7  n8      n3      n11
 *   /  \             /  \       \
 *  n4  n5          n4   n5      n12
 *                               /  \
 *                              n7  n8
 *
 * @param {!lf.structs.TreeNode} node The node to be removed.
 * @param {!lf.structs.TreeNode} head The start of the chain to be inserted.
 * @param {!lf.structs.TreeNode} tail The tail of the chain to be inserted.
 * @return {!lf.structs.TreeNode} The new root of the subtree that used to
 *     start at "node". Effectively the new root is always equal to "head".
 */
lf.tree.replaceNodeWithChain = function(node, head, tail) {
  return lf.tree.replaceChainWithChain(node, node, head, tail);
};


/**
 * Replaces a chain of nodes with a new node.
 * Example: Calling replaceChainWithNode(n2, n3, n7) would result in the
 * following transformation.
 *
 *        n1              n1
 *       /  \            /  \
 *      n2   n6         n7   n6
 *     /         =>    /  \
 *    n3              n4  n5
 *   /  \
 *  n4  n5
 *
 * @param {!lf.structs.TreeNode} head The head of the chain.
 * @param {!lf.structs.TreeNode} tail The tail of the chain.
 * @param {!lf.structs.TreeNode} node The node to be added.
 * @return {!lf.structs.TreeNode} The new root of the subtree that used to
 *     start at "head". Effectively the new root is always equal to "node".
 */
lf.tree.replaceChainWithNode = function(head, tail, node) {
  return lf.tree.replaceChainWithChain(head, tail, node, node);
};


/**
 * Finds all nodes in the given tree that satisfy a given condition.
 * @param {!lf.structs.TreeNode} root The root of the tree to search.
 * @param {!function(!lf.structs.TreeNode):boolean} filterFn The filter
 *     function. It will be called on every node of the tree.
 * @param {!function(!lf.structs.TreeNode):boolean=} opt_stopFn A function
 *     that indicates whether searching should be stopped. It will be called on
 *     every visited node on the tree. If false is returned searching will stop
 *     for nodes below that node.
 *     such a function is not provided the entire tree is searched.
 * @return {!Array<!lf.structs.TreeNode>}
 */
lf.tree.find = function(root, filterFn, opt_stopFn) {
  var results = [];

  /** @param {!lf.structs.TreeNode} node */
  var filterRec = function(node) {
    if (filterFn(node)) {
      results.push(node);
    }
    if (!goog.isDefAndNotNull(opt_stopFn) || !opt_stopFn(node)) {
      node.getChildren().forEach(filterRec);
    }
  };

  filterRec(root);

  return results;
};


/**
 * @param {!lf.structs.TreeNode} rootNode The root node of the tree.
 * @param {(!function(!lf.structs.TreeNode):string)=} opt_stringFn The
 *     function to use for converting a single node to a string. If not provided
 *     a default function will be used.
 * @return {string} A string representation of a tree. Useful for
 *     testing/debugging.
 */
lf.tree.toString = function(rootNode, opt_stringFn) {
  var stringFn = opt_stringFn || function(node) {
    return node.toString() + '\n';
  };

  var out = '';
  rootNode.traverse(
      function(node) {
        for (var i = 0; i < node.getDepth(); i++) {
          out += '-';
        }
        out += stringFn(node);
      });
  return out;
};
