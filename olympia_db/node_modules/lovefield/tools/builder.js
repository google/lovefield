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
var glob = require('glob');
var pathMod = require('path');
var fsMod = require('fs');
var tempfile = /** @type {!Function} */ (require('tempfile'));
var noptMod = /** @type {!Function} */ (require('nopt'));
var exec = require('child_process').exec;


/**
 * @type {{
 *   CLOSURE_COMPILER_PATH: string,
 *   COMPILER_FLAGS_OPT: string,
 *   COMPILER_FLAGS_DEBUG: string
 * }}
 */
var config = /** @type {!Function} */ (
    require(pathMod.resolve(__dirname + '/config.js')))();
var scanDeps = require(pathMod.resolve(__dirname + '/scan_deps.js')).scanDeps;


// Command line options
var knownOpts = {
  'mode': [String, null]
};
var options = noptMod(knownOpts);

// Make linter happy
var log = console['log'];


/**
 * @param {string} mode Compile mode: "compiled" or "debug"
 * @param {string} outputFile
 * @return {string} The command line.
 */
function getCommandLine(mode, outputFile) {
  var closureCompiler = pathMod.resolve(config.CLOSURE_COMPILER_PATH);
  var flags = (
      mode == 'compiled' ?
          config.COMPILER_FLAGS_OPT :
          config.COMPILER_FLAGS_DEBUG);
  var command = [
    'java -jar',
    closureCompiler,
    '--js_output_file=' + outputFile
  ].concat(flags);

  var sources = glob.sync('lib/**/*.js').concat(scanDeps()).map(function(file) {
    return '--js ' + file;
  });

  return command.concat(sources).join(' ');
}

function stripLicense(input, output) {
  var contents = fsMod.readFileSync(input).toString();
  var stripped = contents.replace(
      /(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm, '');
  var LICENSE = [
    '/*',
    '  Copyright 2014 Google Inc. All Rights Reserved.',
    '',
    '  Licensed under the Apache License, Version 2.0 (the "License");',
    '  you may not use this file except in compliance with the License.',
    '  You may obtain a copy of the License at',
    '',
    '  http://www.apache.org/licenses/LICENSE-2.0',
    '',
    '  Unless required by applicable law or agreed to in writing, software',
    '  distributed under the License is distributed on an "AS IS" BASIS,',
    '  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or' +
        ' implied.',
    '  See the License for the specific language governing permissions and',
    '  limitations under the License.',
    '*/',
    ''
  ].join('\n');
  fsMod.writeFileSync(output, LICENSE + stripped);
}

function builder(callback) {
  var intermediate = tempfile('.js');
  var compileMode = (options.mode == 'debug') ? 'debug' : 'compiled';
  var command = getCommandLine(compileMode, intermediate);
  exec(command, function(err, stdout, stderr) {
    log(stdout);
    log(stderr);
    if (fsMod.existsSync(intermediate)) {
      stripLicense(
          intermediate,
          pathMod.resolve(pathMod.join(__dirname, '../dist/lf.js')));
    }
    callback(err);
  });
}


/** @type {Function} */
exports.builder = builder;
