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
goog.module('lf.proc.RewritePass');
// TODO(dpapad): Remove once the codebase has migrated fully to goog.module.
goog.module.declareLegacyNamespace();



exports = goog.defineClass(null, {
  /**
   * @template T
   */
  constructor: function() {
    /** @protected {!T} */
    this.rootNode = undefined;
  },

  /**
   * Rewrites the query plan.
   * @param {!T} rootNode
   * @param {!lf.query.Context=} opt_queryContext
   * @return {!T} The root of the tree after rewriting.
   */
  rewrite: goog.abstractMethod
});
