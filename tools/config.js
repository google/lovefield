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
var pathMod = require('path');



/** @constructor */
var Config = function() {
  // Closure compiler JAR path.
  this.CLOSURE_COMPILER_PATH =
      pathMod.resolve(pathMod.join(
          __dirname,
          '../node_modules/google-closure-compiler/compiler.jar'));

  // Root of Closure library git repo checkout.
  this.CLOSURE_LIBRARY_PATH =
      pathMod.resolve(pathMod.join(
          __dirname,
          '../node_modules/google-closure-library'));

  // Externs declarations for third party APIs.
  this.EXTERNS = [
    '--externs=' + pathMod.resolve(pathMod.join(
        __dirname, '../builddef/firebase_externs.js'))
  ];

  // Compiler options for all configurations.
  this.COMPILER_FLAGS_COMMON = {
    generate_exports: null,
    language_in: 'ECMASCRIPT5_STRICT',
    warning_level: 'VERBOSE',
    externs: [
      'builddef/firebase_externs.js'
    ],
    output_wrapper: '(function(){%output%}.bind(window))()'
  };

  // Compiler options for release mode.
  this.COMPILER_FLAGS_OPT = {
    compilation_level: 'ADVANCED'
  };

  // Compiler options for debug mode.
  this.COMPILER_FLAGS_DEBUG = {
    compilation_level: 'WHITESPACE_ONLY',
    debug: null,
    formatting: 'PRETTY_PRINT'
  };

  // Schemas used for tests.
  this.TEST_SCHEMAS = [
    {
      'file': pathMod.resolve(pathMod.join(
          __dirname,
          '../testing/hr_schema/hr_schema.yaml')),
      'namespace': 'hr.db'
    },
    {
      'file': pathMod.resolve(pathMod.join(
          __dirname,
          '../testing/hr_schema/hr_schema_bundled.yaml')),
      'namespace': 'hr.bdb'
    },
    {
      'file': pathMod.resolve(pathMod.join(
          __dirname,
          '../testing/order_schema.yaml')),
      'namespace': 'order.db'
    }
  ];
};

function createConfig() {
  return new Config();
}


/** @type {Object.<string, *>} */
module.exports = createConfig;
