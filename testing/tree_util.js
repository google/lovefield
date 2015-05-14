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
goog.provide('lf.testing.treeutil');
goog.provide('lf.testing.treeutil.Tree');

goog.require('goog.testing.jsunit');
goog.require('lf.tree');


goog.scope(function() {


/**
 * @typedef {{
 *   queryContext: !lf.query.SelectContext,
 *   root: !lf.proc.PhysicalQueryPlanNode
 * }}
 */
lf.testing.treeutil.Tree;


/**
 * Asserts that the given tree is transformed as expected.
 * @param {!lf.testing.treeutil.Tree} treeBefore The initial tree and
 *     corresponding query context.
 * @param {string} treeStringBefore
 * @param {string} treeStringAfter
 * @param {!lf.proc.RewritePass} pass
 */
lf.testing.treeutil.assertTreeTransformation = function(
    treeBefore, treeStringBefore, treeStringAfter, pass) {
  var toStringFn = toString.bind(null, treeBefore.queryContext);
  assertEquals(treeStringBefore, lf.tree.toString(treeBefore.root, toStringFn));
  var rootNodeAfter = pass.rewrite(treeBefore.root, treeBefore.queryContext);
  assertEquals(treeStringAfter, lf.tree.toString(rootNodeAfter, toStringFn));
};


function toString(queryContext, node) {
  return node.toContextString(queryContext) + '\n';
}

});  // goog.scope
