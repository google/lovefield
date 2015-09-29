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

/*
 * Usage:
 * 1) Include one of the following lines in foo.js
 *    require('./tools/node_bootstrap').loadMinJs(); // loads lovefield.min.js
 *    require('./tools/node_bootstrap').loadDebugJs(); // loads lovefield.min.js
 * 2) Start using lovefield in foo.js.
 *    var schemaBuilder = lf.schema.create(...); // use lovefield here.
 */
var fsMod = require('fs');
var pathMod = require('path');
var vmMod = require('vm');


/**
 * Bootstraps a lovefield binary such that is runnable in nodejs.
 * @param {string} lovefieldBinary The aboslute path of the binary file.
 */
function bootstrap(lovefieldBinary) {
  // Setting "window" to be Node's global context.
  global.window = global;

  // Setting "self" to be Node's global context. This must be placed after
  // global.window.
  global.self = global;

  // Setting "document" to a dummy object, even though it is not actually used,
  // because it results in a runtime error when using lovefield.min.js.
  global.document = {};

  vmMod.runInThisContext(fsMod.readFileSync(lovefieldBinary), lovefieldBinary);
}


/** @type {?Object<string,*>} */
module.exports = {
  // Loads ../dist/lovefield.js.
  loadDebugJs: function() {
    bootstrap(pathMod.resolve(__dirname, '..', 'dist', 'lovefield.js'));
  },
  // Loads ../dist/lovefield.min.js.
  loadMinJs: function() {
    bootstrap(pathMod.resolve(__dirname, '..', 'dist', 'lovefield.min.js'));
  },
  // Loads lovefield from a custom location.
  loadCustomJs: function(filepath) {
    bootstrap(filepath);
  },
  loadLkgrJs: function() {
    var filepath = pathMod.resolve(__dirname, 'dist', 'lovefield-lkgr.js');
    if (!fsMod.existsSync(filepath)) {
      filepath = pathMod.resolve(__dirname, '..', 'dist', 'lovefield-lkgr.js');
    }

    fsMod.existsSync(filepath) ?
        bootstrap(filepath) :
        bootstrap(pathMod.resolve(__dirname, '..', 'dist', 'lovefield.js'));
  }
};
