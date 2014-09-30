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
goog.setTestOnly();
goog.require('goog.structs.TreeNode');
goog.require('goog.testing.jsunit');
goog.require('lf.tree');


/**
 * Creates a tree to be used in various tests.
 * @return {!Array.<!goog.structs.TreeNode>} An array holding all the nodes in
 *     the tree in pre-order traversal order.
 */
function createTestTree() {
  var nodes = new Array(10);
  for (var i = 0; i < nodes.length; i++) {
    nodes[i] = new goog.structs.TreeNode(i, null);
  }

  // Creating a tree that has the following structure.
  //          n0
  //         /  \
  //        /    \
  //       /      \
  //      n1      n5
  //    / | \       \
  //  n2 n3 n4       n6
  //                  \
  //                   n7
  //                  /  \
  //                n8   n9

  nodes[1].addChild(nodes[2]);
  nodes[1].addChild(nodes[3]);
  nodes[1].addChild(nodes[4]);

  nodes[5].addChild(nodes[6]);
  nodes[6].addChild(nodes[7]);

  nodes[7].addChild(nodes[8]);
  nodes[7].addChild(nodes[9]);

  nodes[0].addChild(nodes[1]);
  nodes[0].addChild(nodes[5]);

  return nodes;
}


/**
 * Tests that lf.tree.map() is constructing a new tree with the exact same
 * structure as the original tree.
 */
function testMap() {
  var rootNode = createTestTree()[0];

  // Creating a new tree where each new node has an key that is 10 units bigger
  // than the original node's key. Setting the original node as a value such
  // that the tree structures can be compared a few lines below.
  var keyDelta = 10;
  var copy = lf.tree.map(rootNode, function(node) {
    return new goog.structs.TreeNode(node.getKey() + keyDelta, node);
  });

  // Traversing the new tree and ensuring that it has the same structure as the
  // original tree.
  copy.traverse(function(node) {
    assertEquals(node.getValue().getKey() + keyDelta, node.getKey());
    if (!goog.isNull(node.getParent())) {
      assertEquals(
          node.getParent().getValue().getKey() + keyDelta,
          node.getParent().getKey()); }
  });
}


/**
 * Testing case where a node that has both parent and children nodes is removed.
 * Ensure that the children of the removed node are re-parented to its parent.
 */
function testRemoveNode_Intermediate() {
  var nodes = createTestTree();

  var treeAfter =
      '[0,null]\n' +
      '-[5,null]\n' +
      '--[6,null]\n' +
      '---[7,null]\n' +
      '----[8,null]\n' +
      '----[9,null]\n' +
      '-[2,null]\n' +
      '-[3,null]\n' +
      '-[4,null]\n';

  // Removing node n1.
  lf.tree.removeNode(nodes[1]);
  assertEquals(treeAfter, lf.tree.toString(nodes[0], stringFn));
}


/**
 * Testing case where a leaf node is removed.
 */
function testRemoveNode_Leaf() {
  var nodes = createTestTree();

  var treeAfter =
      '[0,null]\n' +
      '-[1,null]\n' +
      '--[3,null]\n' +
      '--[4,null]\n' +
      '-[5,null]\n' +
      '--[6,null]\n' +
      '---[7,null]\n' +
      '----[8,null]\n' +
      '----[9,null]\n';

  // Removing node n2.
  lf.tree.removeNode(nodes[2]);
  assertEquals(treeAfter, lf.tree.toString(nodes[0], stringFn));
}


function testInsertNodeAt() {
  var nodes = createTestTree();

  var treeAfter =
      '[0,null]\n' +
      '-[1,null]\n' +
      '--[2,null]\n' +
      '--[3,null]\n' +
      '--[4,null]\n' +
      '-[5,null]\n' +
      '--[6,null]\n' +
      '---[7,null]\n' +
      '----[10,null]\n' +
      '-----[8,null]\n' +
      '-----[9,null]\n';

  var newNode = new goog.structs.TreeNode(10, null);
  lf.tree.insertNodeAt(nodes[7], newNode);
  assertEquals(treeAfter, lf.tree.toString(nodes[0], stringFn));
}


function testReplaceChainWithChain() {
  var nodes = createTestTree();

  var treeAfter =
      '[0,null]\n' +
      '-[1,null]\n' +
      '--[2,null]\n' +
      '--[3,null]\n' +
      '--[4,null]\n' +
      '-[10,null]\n' +
      '--[11,null]\n' +
      '---[12,null]\n' +
      '----[8,null]\n' +
      '----[9,null]\n';

  var newHead = new goog.structs.TreeNode(10, null);
  var intermediate = new goog.structs.TreeNode(11, null);
  newHead.addChild(intermediate);
  var newTail = new goog.structs.TreeNode(12, null);
  intermediate.addChild(newTail);

  var head = nodes[5];
  var tail = nodes[7];
  lf.tree.replaceChainWithChain(head, tail, newHead, newTail);
  assertEquals(treeAfter, lf.tree.toString(nodes[0], stringFn));
}


function testReplaceChainWithNode() {
  var nodes = createTestTree();

  var treeAfter =
      '[0,null]\n' +
      '-[1,null]\n' +
      '--[2,null]\n' +
      '--[3,null]\n' +
      '--[4,null]\n' +
      '-[10,null]\n' +
      '--[8,null]\n' +
      '--[9,null]\n';

  var newNode = new goog.structs.TreeNode(10, null);
  var head = nodes[5];
  var tail = nodes[7];
  lf.tree.replaceChainWithNode(head, tail, newNode);
  assertEquals(treeAfter, lf.tree.toString(nodes[0], stringFn));
}


function testReplaceNodeWithChain() {
  var nodes = createTestTree();

  var treeAfter =
      '[0,null]\n' +
      '-[1,null]\n' +
      '--[2,null]\n' +
      '--[3,null]\n' +
      '--[4,null]\n' +
      '-[5,null]\n' +
      '--[6,null]\n' +
      '---[7,null]\n' +
      '----[9,null]\n' +
      '----[10,null]\n' +
      '-----[11,null]\n' +
      '------[12,null]\n';

  var head = new goog.structs.TreeNode(10, null);
  var other = new goog.structs.TreeNode(11, null);
  head.addChild(other);
  var tail = new goog.structs.TreeNode(12, null);
  other.addChild(tail);

  lf.tree.replaceNodeWithChain(nodes[8], head, tail);
  assertEquals(treeAfter, lf.tree.toString(nodes[0], stringFn));
}


function testPushNodeBelowChild() {
  var nodes = createTestTree();

  var treeAfter =
      '[0,null]\n' +
      '-[1,null]\n' +
      '--[2,null]\n' +
      '--[3,null]\n' +
      '--[4,null]\n' +
      '-[5,null]\n' +
      '--[7,null]\n' +
      '---[6,null]\n' +
      '----[8,null]\n' +
      '---[9,null]\n';


  var cloneFn = function(node) {
    return new goog.structs.TreeNode(node.getKey(), null);
  };

  var shouldPushDownFn = function(child) {
    return child.getKey() == 8;
  };

  // Pushing down n6, only to above grandchildren that have key == 8.
  lf.tree.pushNodeBelowChild(nodes[6], shouldPushDownFn, cloneFn);
  assertEquals(treeAfter, lf.tree.toString(nodes[0], stringFn));
}


function testSwapNodeWithChild() {
  var nodes = createTestTree();

  var treeAfter =
      '[0,null]\n' +
      '-[1,null]\n' +
      '--[2,null]\n' +
      '--[3,null]\n' +
      '--[4,null]\n' +
      '-[6,null]\n' +
      '--[5,null]\n' +
      '---[7,null]\n' +
      '----[8,null]\n' +
      '----[9,null]\n';
  var newSubtreeRoot = lf.tree.swapNodeWithChild(nodes[5]);
  assertEquals(nodes[6], newSubtreeRoot);
  assertEquals(treeAfter, lf.tree.toString(nodes[0], stringFn));
}


/**
 * @param {!goog.structs.TreeNode} node The node to be stringified.
 * @return {string} A string representation of the node.
 */
function stringFn(node) {
  return '[' + node.getKey() + ',' + node.getValue() + ']\n';
}
