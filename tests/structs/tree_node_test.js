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
goog.setTestOnly();
goog.require('goog.testing.jsunit');
goog.require('lf.structs.TreeNode');


function testConstructor() {
  var node = new lf.structs.TreeNode();
  assertNull(node.getParent());
  assertArrayEquals([], node.getChildren());
  assertTrue(node.isLeaf());
}

function testGetParent() {
  var node1 = new lf.structs.TreeNode();
  var node2 = new lf.structs.TreeNode();
  node1.addChild(node2);
  assertEquals(node1, node2.getParent());
  assertNull(node1.getParent());
}

function testIsLeaf() {
  var node1 = new lf.structs.TreeNode();
  var node2 = new lf.structs.TreeNode();
  node1.addChild(node2);
  assertFalse(node1.isLeaf());
  assertTrue(node2.isLeaf());
}

function testGetChildren() {
  var node1 = new lf.structs.TreeNode();
  var node2 = new lf.structs.TreeNode();
  node1.addChild(node2);
  assertArrayEquals([node2], node1.getChildren());
  assertArrayEquals([], node2.getChildren());
}

function testGetChildAt() {
  var node1 = new lf.structs.TreeNode();
  var node2 = new lf.structs.TreeNode();
  node1.addChild(node2);
  assertNull(node1.getChildAt(-1));
  assertEquals(node2, node1.getChildAt(0));
  assertNull(node1.getChildAt(1));
  assertNull(node2.getChildAt(0));
}

function testGetChildCount() {
  var node1 = new lf.structs.TreeNode();
  var node2 = new lf.structs.TreeNode();
  node1.addChild(node2);
  assertEquals(1, node1.getChildCount());
  assertEquals(0, node2.getChildCount());
}

function testGetDepth() {
  var node1 = new lf.structs.TreeNode();
  var node2 = new lf.structs.TreeNode();
  var node3 = new lf.structs.TreeNode();
  node1.addChild(node2);
  node2.addChild(node3);
  assertEquals(0, node1.getDepth());
  assertEquals(1, node2.getDepth());
  assertEquals(2, node3.getDepth());
}

function testGetRoot() {
  var node1 = new lf.structs.TreeNode();
  var node2 = new lf.structs.TreeNode();
  node1.addChild(node2);
  assertEquals(node1, node1.getRoot());
  assertEquals(node1, node2.getRoot());
}

function testTraverse() {
  var node1 = new lf.structs.TreeNode();
  var node2 = new lf.structs.TreeNode();
  var node3 = new lf.structs.TreeNode();
  var node4 = new lf.structs.TreeNode();
  node1.addChild(node2);
  node2.addChild(node3);
  node2.addChild(node4);

  var thisContext = {};
  var visitedNodes = [];
  node1.traverse(function(node) {
    assertEquals(thisContext, this);
    visitedNodes.push(node);
  }, thisContext);
  assertArrayEquals([node1, node2, node3, node4], visitedNodes);

  visitedNodes = [];
  node1.traverse(function(node) {
    visitedNodes.push(node);
    return node != node2;  // Cut off at node2.
  });
  assertArrayEquals([node1, node2], visitedNodes);
}

function testAddChild() {
  var node1 = new lf.structs.TreeNode();
  var node2 = new lf.structs.TreeNode();
  var node3 = new lf.structs.TreeNode();
  assertArrayEquals([], node1.getChildren());
  node1.addChild(node2);
  assertArrayEquals([node2], node1.getChildren());
  assertEquals(node1, node2.getParent());
  node1.addChild(node3);
  assertArrayEquals([node2, node3], node1.getChildren());
}

function testAddChildAt() {
  var node1 = new lf.structs.TreeNode();
  var node2 = new lf.structs.TreeNode();
  var node3 = new lf.structs.TreeNode();
  var node4 = new lf.structs.TreeNode();
  var node5 = new lf.structs.TreeNode();
  node1.addChildAt(node2, 0);
  assertArrayEquals([node2], node1.getChildren());
  assertEquals(node1, node2.getParent());
  node1.addChildAt(node3, 0);
  assertArrayEquals([node3, node2], node1.getChildren());
  node1.addChildAt(node4, 1);
  assertArrayEquals([node3, node4, node2], node1.getChildren());
  node1.addChildAt(node5, 3);
  assertArrayEquals([node3, node4, node2, node5], node1.getChildren());
}

function testReplaceChildAt() {
  var root = new lf.structs.TreeNode();
  var node1 = new lf.structs.TreeNode();
  root.addChild(node1);

  var node2 = new lf.structs.TreeNode();
  assertEquals(node1, root.replaceChildAt(node2, 0));
  assertEquals(root, node2.getParent());
  assertArrayEquals([node2], root.getChildren());
  assertNull(node1.getParent());
}

function testRemoveChildAt() {
  var node1 = new lf.structs.TreeNode();
  var node2 = new lf.structs.TreeNode();
  var node3 = new lf.structs.TreeNode();
  node1.addChild(node2);
  node1.addChild(node3);

  assertNull(node1.removeChildAt(-1));
  assertNull(node1.removeChildAt(2));
  assertArrayEquals([node2, node3], node1.getChildren());

  assertEquals(node2, node1.removeChildAt(0));
  assertArrayEquals([node3], node1.getChildren());
  assertNull(node2.getParent());

  assertEquals(node3, node1.removeChildAt(0));
  assertArrayEquals([], node1.getChildren());
  assertTrue(node1.isLeaf());
}

function testRemoveChild() {
  var node1 = new lf.structs.TreeNode();
  var node2 = new lf.structs.TreeNode();
  var node3 = new lf.structs.TreeNode();
  node1.addChild(node2);
  node1.addChild(node3);

  assertNull(node1.removeChild(node1));
  assertArrayEquals([node2, node3], node1.getChildren());

  assertEquals(node3, node1.removeChild(node3));
  assertArrayEquals([node2], node1.getChildren());
}
