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
var pathMod = require('path');



/** @constructor */
var Config = function() {
  // Closure compiler JAR path.
  this.CLOSURE_COMPILER_PATH =
      pathMod.resolve(pathMod.join(
          __dirname,
          '../node_modules/closurecompiler/compiler/compiler.jar'));

  // Root of Closure library git repo checkout.
  this.CLOSURE_LIBRARY_PATH =
      pathMod.resolve(pathMod.join(
          __dirname,
          '../node_modules/google-closure-library-latest/lib'));

  // Compiler options for all configurations.
  this.COMPILER_FLAGS_COMMON = [
    '--generate_exports',
    '--language_in=ECMASCRIPT5_STRICT',
    '--warning_level=VERBOSE'
  ];

  // Compiler options for release mode.
  this.COMPILER_FLAGS_OPT = this.COMPILER_FLAGS_COMMON.concat([
    '--compilation_level=SIMPLE'
  ]);

  // Compiler options for debug mode.
  this.COMPILER_FLAGS_DEBUG = this.COMPILER_FLAGS_COMMON.concat([
    '--debug',
    '--compilation_level=WHITESPACE_ONLY',
    '--formatting=PRETTY_PRINT'
  ]);
};

function createConfig() {
  return new Config();
}


/** @type {Object.<string, *>} */
module.exports = createConfig;
