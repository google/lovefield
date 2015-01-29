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
 * @fileoverview Definitions for Preprocessor.js.
 * @see http://nodejs.org/api/fs.html
 * @externs
 */

/**
 BEGIN_NODE_INCLUDE
 var Preprocessor = require('preprocessor');
 END_NODE_INCLUDE
 */

/**
 * @param {string} source
 * @param {string} baseDir
 * @constructor
 */
var Preprocessor = function(source, baseDir) {};

/**
 * @param {string} str
 * @returns {string}
 * @nosideeffects
 */
Preprocessor.stripSlashes = function(str) {};

/**
 * @param {string} str
 * @return {string}
 * @nosideeffects
 */
Preprocessor.addSlashes = function(str) {};

/**
 * @param {string} str
 * @param {string} indent
 * @return {string}
 * @nosideeffects
 */
Preprocessor.indent = function(str, indent) {};

/**
 * @param {string} str
 * @return {string}
 * @nosideeffects
 */
Preprocessor.nlToStr = function(str) {};

/**
 * @param {Object.<string,string>} defines
 * @param {string} expr
 * @return {*}
 * @throws {Error}
 * @nosideeffects
 */
Preprocessor.evaluate = function(defines, expr) {};

/**
 * @param {Object.<string,*>} directives
 * @return {string}
 */
Preprocessor.prototype.process = function(directives) {};

/**
 * @return {string}
 */
Preprocessor.prototype.toString = function() {};
