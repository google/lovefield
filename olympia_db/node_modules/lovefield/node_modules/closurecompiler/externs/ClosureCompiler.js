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
 * @fileoverview Definitions for ClosureCompiler.js
 * @see https://github.com/dcodeIO/ClosureCompiler.js
 * @externs
 */

/**
 BEGIN_NODE_INCLUDE
 var ClosureCompiler = require('closurecompiler');
 END_NODE_INCLUDE
 */

/**
 * @constructor
 * @nosideeffects
 */
var ClosureCompiler = function() {};

/**
 * @type {string}
 */
ClosureCompiler.JAVA_EXT;

/**
 * @return {string}
 * @nosideeffects
 */
ClosureCompiler.getGlobalJava = function() {};

/**
 * @return {string}
 * @nosideeffects
 */
ClosureCompiler.getBundledJava = function() {};

/**
 * @param {string} java
 * @param {function(boolean)} callback
 */
ClosureCompiler.testJava = function(java, callback) {};

/**
 * @param {string|Array.<string>} files
 * @param {Object.<string,*|Array>} options
 * @param {function(Error,string)} callback
 * @throws {Error}
 */
ClosureCompiler.compile = function(files, options, callback) {};

/**
 * @type {Object.<string,*>}
 */
ClosureCompiler.prototype.options;

/**
 * @param {string|Array.<string>} files
 * @param {function(Error,string)} callback
 * @throws {Error}
 */
ClosureCompiler.prototype.compile = function(files, callback) {};

/**
 * @return {string}
 * @nosideeffects
 */
ClosureCompiler.prototype.toString = function() {};
