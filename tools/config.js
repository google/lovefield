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

  // Externs declarations for Firebase API.
  this.FIREBASE_EXTERNS = pathMod.resolve(
      pathMod.join(__dirname, '../builddef/firebase_externs.js'));

  // Externs declarations for lovefield.min.js.
  this.LOVEFIELD_EXTERNS = pathMod.resolve(
      pathMod.join(__dirname, '../dist/lovefield.externs.js'));

  // Compiler options for all configurations.
  this.COMPILER_FLAGS_COMMON = {
    generate_exports: null,
    jscomp_error: [
      'accessControls',
      'ambiguousFunctionDecl',
      'checkDebuggerStatement',
      'checkRegExp',
      'checkTypes',
      'checkVars',
      'const',
      'constantProperty',
      'duplicate',
      'es5Strict',
      'externsValidation',
      'fileoverviewTags',
      'globalThis',
      'internetExplorerChecks',
      'invalidCasts',
      'missingProperties',
      'missingProvide',
      'missingRequire',
      'missingReturn',
      'nonStandardJsDocs',
      'strictModuleDepCheck',
      'suspiciousCode',
      'undefinedNames',
      'undefinedVars',
      'unknownDefines',
      'uselessCode',
      'visibility'
    ],
    jscomp_off: 'deprecated',
    language_in: 'ECMASCRIPT5_STRICT',
    output_wrapper: '(function(){%output%}.bind(window))()',
    warning_level: 'VERBOSE'
  };

  // Compiler options for release mode.
  this.COMPILER_FLAGS_OPT = {
    compilation_level: 'ADVANCED',
    create_source_map: 'dist/lf.js.map',
    define: 'goog.DEBUG=false'
  };

  // Compiler options for debug mode.
  this.COMPILER_FLAGS_DEBUG = {
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
    },
    {
      'file': pathMod.resolve(pathMod.join(
          __dirname,
          '../testing/perf/hr_schema_no_fk.yaml')),
      'namespace': 'lf.testing.perf.hr.db'
    }
  ];
};


var config = null;


/** @return {!Config} */
function createConfig() {
  if (config == null) {
    config = new Config();
  }

  return config;
}


/** @type {Object.<string, *>} */
module.exports = createConfig;
