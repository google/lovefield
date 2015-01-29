/*
 * Copyright 2012 The Closure Compiler Authors.
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
 * @fileoverview Definitions for require.js inside of node.
 * @see http://requirejs.org/docs/api.html
 * @externs
 * @author Daniel Wirtz <dcode@dcode.io>
 */

/**
 * @param {string|Array.<string>|Function} name
 * @param {Array.<string>|Function=} deps
 * @param {Function=} callback
 */
function define(name, deps, callback) {}

/**
 * @type {boolean}
 */
define.amd;

/**
 * @param {string|Array.<string>|Object.<string,*>} deps
 * @param {Function|string|Array.<string>=} callback
 * @param {Function=} errback
 * @param {Function=} optional
 */
function requirejs(deps, callback, errback, optional) {}

/**
 * @typedef {{nodeRequire: ?boolean, baseUrl: string, paths: Object.<string,string>, shim: Object.<string,string>}}
 */
var RequireConfig;

/**
 * @param {RequireConfig} config
 */
requirejs.config = function(config) {}
