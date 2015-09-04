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
goog.setTestOnly();
goog.require('goog.testing.jsunit');
goog.require('lf.structs.TreeNode');
goog.require('lf.tree');



/**
 * @extends {lf.structs.TreeNode}
 * @constructor
 * @private
 *
 * @param {number} id The ID of this node.
 */
var TreeNode_ = function(id) {
  TreeNode_.base(this, 'constructor');

  /** @private {number} */
  this.id_ = id;
};
goog.inherits(TreeNode_, lf.structs.TreeNode);


/** @return {number} */
TreeNode_.prototype.getId = function() {
  return this.id_;
};


/**
 * Creates a tree to be used in various tests.
 * @return {!Array<!TreeNode_>} An array holding all the nodes in
 *     the tree in pre-order traversal order.
 */
function createTestTree1() {
  var nodes = new Array(11);
  for (var i = 0; i < nodes.length; i++) {
    nodes[i] = new TreeNode_(i);
  }

  // Creating a tree that has the following structure.
  //            n0
  //          / | \
  //         /  |  \
  //        /   |  n10
  //       /    |
  //      n1    n5
  //    / | \   |
  //  n2 n3 n4  n6
  //            |
  //            n7
  //           /  \
  //         n8   n9

  nodes[1].addChild(nodes[2]);
  nodes[1].addChild(nodes[3]);
  nodes[1].addChild(nodes[4]);

  nodes[5].addChild(nodes[6]);
  nodes[6].addChild(nodes[7]);

  nodes[7].addChild(nodes[8]);
  nodes[7].addChild(nodes[9]);

  nodes[0].addChild(nodes[1]);
  nodes[0].addChild(nodes[5]);
  nodes[0].addChild(nodes[10]);

  return nodes;
}


/**
 * Creates a different tree to be used in various tests.
 * @return {!Array<!TreeNode_>} An array holding all the nodes in
 *     the tree in pre-order traversal order.
 */
function createTestTree2() {
  var nodes = new Array(7);
  for (var i = 0; i < nodes.length; i++) {
    nodes[i] = new TreeNode_(i);
  }

  // Creating a tree that has the following structure.
  //           n0
  //           |
  //           n1
  //          /  \
  //        n2    n6
  //       /  \
  //      n3  n4
  //            \
  //            n5

  nodes[0].addChild(nodes[1]);

  nodes[1].addChild(nodes[2]);
  nodes[1].addChild(nodes[6]);

  nodes[2].addChild(nodes[3]);
  nodes[2].addChild(nodes[4]);

  nodes[4].addChild(nodes[5]);

  return nodes;
}


/**
 * Tests that lf.tree.map() is constructing a new tree with the exact same
 * structure as the original tree, for a simple tree.
 */
function testMap1() {
  var nodes = new Array(6);
  for (var i = 0; i < nodes.length; i++) {
    nodes[i] = new TreeNode_(i);
  }

  nodes[2].addChild(nodes[3]);
  nodes[1].addChild(nodes[2]);
  nodes[1].addChild(nodes[4]);
  nodes[0].addChild(nodes[1]);

  var rootNode = nodes[0];
  checkMap(rootNode);
}


/**
 * Tests that lf.tree.map() is constructing a new tree with the exact same
 * structure as the original tree, for two more complex trees.
 */
function testMap2() {
  checkMap(createTestTree1()[0]);
  checkMap(createTestTree2()[0]);
}


/**
 * Checks that the given tree is producing a tree with an identical structure
 * when cloned.
 * @param {!TreeNode_} rootNode
 */
function checkMap(rootNode) {
  // Attempting to copy the tree.
  var copy = lf.tree.map(rootNode, function(node) {
    return new TreeNode_(node.getId());
  });

  assertEquals(
      lf.tree.toString(rootNode, stringFn),
      lf.tree.toString(copy, stringFn));
}


/**
 * Testing case where a node that has both parent and children nodes is removed.
 * Ensure that the children of the removed node are re-parented to its parent.
 */
function testRemoveNode_Intermediate() {
  var nodes = createTestTree1();

  var treeAfter =
      '[0]\n' +
      '-[2]\n' +
      '-[3]\n' +
      '-[4]\n' +
      '-[5]\n' +
      '--[6]\n' +
      '---[7]\n' +
      '----[8]\n' +
      '----[9]\n' +
      '-[10]\n';

  // Removing node n1.
  var removeResult = lf.tree.removeNode(nodes[1]);
  assertEquals(nodes[0], removeResult.parent);
  assertArrayEquals(
      [nodes[2], nodes[3], nodes[4]],
      removeResult.children);
  assertEquals(treeAfter, lf.tree.toString(nodes[0], stringFn));
}


/**
 * Testing case where a leaf node is removed.
 */
function testRemoveNode_Leaf() {
  var nodes = createTestTree1();

  var treeAfter =
      '[0]\n' +
      '-[1]\n' +
      '--[3]\n' +
      '--[4]\n' +
      '-[5]\n' +
      '--[6]\n' +
      '---[7]\n' +
      '----[8]\n' +
      '----[9]\n' +
      '-[10]\n';

  // Removing node n2.
  var removeResult = lf.tree.removeNode(nodes[2]);
  assertEquals(nodes[1], removeResult.parent);
  assertArrayEquals([], removeResult.children);
  assertEquals(treeAfter, lf.tree.toString(nodes[0], stringFn));
}


/**
 * Testing case where the root node is removed.
 */
function testRemoveNode_Root() {
  var nodes = createTestTree1();

  var subTree1After =
      '[1]\n' +
      '-[2]\n' +
      '-[3]\n' +
      '-[4]\n';

  var subTree2After =
      '[5]\n' +
      '-[6]\n' +
      '--[7]\n' +
      '---[8]\n' +
      '---[9]\n';

  var subTree3After = '[10]\n';

  // Removing node n0.
  var removeResult = lf.tree.removeNode(nodes[0]);
  assertNull(removeResult.parent);
  assertArrayEquals([nodes[1], nodes[5], nodes[10]], removeResult.children);
  assertEquals(
      subTree1After, lf.tree.toString(removeResult.children[0], stringFn));
  assertEquals(
      subTree2After, lf.tree.toString(removeResult.children[1], stringFn));
  assertEquals(
      subTree3After, lf.tree.toString(removeResult.children[2], stringFn));
}


function testInsertNodeAt() {
  var nodes = createTestTree1();

  var treeAfter =
      '[0]\n' +
      '-[1]\n' +
      '--[2]\n' +
      '--[3]\n' +
      '--[4]\n' +
      '-[5]\n' +
      '--[6]\n' +
      '---[7]\n' +
      '----[11]\n' +
      '-----[8]\n' +
      '-----[9]\n' +
      '-[10]\n';

  var newNode = new TreeNode_(11);
  lf.tree.insertNodeAt(nodes[7], newNode);
  assertEquals(treeAfter, lf.tree.toString(nodes[0], stringFn));
}


function testReplaceChainWithChain() {
  var nodes = createTestTree1();

  var treeAfter =
      '[0]\n' +
      '-[1]\n' +
      '--[2]\n' +
      '--[3]\n' +
      '--[4]\n' +
      '-[11]\n' +
      '--[12]\n' +
      '---[13]\n' +
      '----[8]\n' +
      '----[9]\n' +
      '-[10]\n';

  var newHead = new TreeNode_(11);
  var intermediate = new TreeNode_(12);
  newHead.addChild(intermediate);
  var newTail = new TreeNode_(13);
  intermediate.addChild(newTail);

  var head = nodes[5];
  var tail = nodes[7];
  lf.tree.replaceChainWithChain(head, tail, newHead, newTail);
  assertEquals(treeAfter, lf.tree.toString(nodes[0], stringFn));
}


function testReplaceChainWithNode() {
  var nodes = createTestTree1();

  var treeAfter =
      '[0]\n' +
      '-[1]\n' +
      '--[2]\n' +
      '--[3]\n' +
      '--[4]\n' +
      '-[11]\n' +
      '--[8]\n' +
      '--[9]\n' +
      '-[10]\n';

  var newNode = new TreeNode_(11);
  var head = nodes[5];
  var tail = nodes[7];
  lf.tree.replaceChainWithNode(head, tail, newNode);
  assertEquals(treeAfter, lf.tree.toString(nodes[0], stringFn));
}


function testReplaceNodeWithChain() {
  var nodes = createTestTree1();

  var treeAfter =
      '[0]\n' +
      '-[1]\n' +
      '--[2]\n' +
      '--[3]\n' +
      '--[4]\n' +
      '-[5]\n' +
      '--[6]\n' +
      '---[7]\n' +
      '----[11]\n' +
      '-----[12]\n' +
      '------[13]\n' +
      '----[9]\n' +
      '-[10]\n';

  var head = new TreeNode_(11);
  var other = new TreeNode_(12);
  head.addChild(other);
  var tail = new TreeNode_(13);
  other.addChild(tail);

  lf.tree.replaceNodeWithChain(nodes[8], head, tail);
  assertEquals(treeAfter, lf.tree.toString(nodes[0], stringFn));
}


function testPushNodeBelowChild() {
  var nodes = createTestTree1();

  var treeAfter =
      '[0]\n' +
      '-[1]\n' +
      '--[2]\n' +
      '--[3]\n' +
      '--[4]\n' +
      '-[5]\n' +
      '--[7]\n' +
      '---[6]\n' +
      '----[8]\n' +
      '---[9]\n' +
      '-[10]\n';


  var cloneFn = function(node) {
    return new TreeNode_(node.getId());
  };

  var shouldPushDownFn = function(child) {
    return child.getId() == 8;
  };

  // Pushing down n6, only to above grandchildren that have key == 8.
  lf.tree.pushNodeBelowChild(nodes[6], shouldPushDownFn, cloneFn);
  assertEquals(treeAfter, lf.tree.toString(nodes[0], stringFn));
}


function testSwapNodeWithChild() {
  var nodes = createTestTree1();

  var treeAfter =
      '[0]\n' +
      '-[1]\n' +
      '--[2]\n' +
      '--[3]\n' +
      '--[4]\n' +
      '-[6]\n' +
      '--[5]\n' +
      '---[7]\n' +
      '----[8]\n' +
      '----[9]\n' +
      '-[10]\n';
  var newSubtreeRoot = lf.tree.swapNodeWithChild(nodes[5]);
  assertEquals(nodes[6], newSubtreeRoot);
  assertEquals(treeAfter, lf.tree.toString(nodes[0], stringFn));
}


function testGetLeafNodes() {
  var nodes = createTestTree1();
  var leafNodes = lf.tree.getLeafNodes(nodes[0]);
  var leafNodeKeys = leafNodes.map(
      function(node) {
        return /** @type {!TreeNode_} */ (node).getId();
      });
  assertArrayEquals([2, 3, 4, 8 , 9, 10], leafNodeKeys);
}


function testFind() {
  var nodes = createTestTree1();
  var minId = 6;
  var retrievedNodes = lf.tree.find(
      nodes[0],
      function(node) {
        return /** @type {!TreeNode_} */ (node).getId() >= minId;
      });
  retrievedNodes.forEach(function(node) {
    assertTrue(/** @type {!TreeNode_} */ (node).getId() >= minId);

  });
}


function testFind_Stop() {
  var nodes = createTestTree1();
  var minId = 4;
  var retrievedNodes = lf.tree.find(
      nodes[0],
      function(node) {
        return /** @type {!TreeNode_} */ (node).getId() >= minId;
      },
      function(node) {
        return /** @type {!TreeNode_} */ (node).getId() == 7;
      });
  assertArrayEquals(
      [4, 5, 6, 7, 10],
      retrievedNodes.map(function(node) {
        return /** @type {!TreeNode_} */ (node).getId();
      }));
}


/**
 * @param {!lf.structs.TreeNode} node The node to be stringified.
 * @return {string} A string representation of the node.
 */
function stringFn(node) {
  return '[' + /** @type {!TreeNode_} */ (node).getId() + ']\n';
}
