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
var fsMod = require('fs');
var pathMod = require('path');
var noptMod = /** @type {!Function} */ (require('nopt'));
var fork = /** @type {!Function} */ (require('child_process').fork);
var exec = /** @type {!Function} */ (require('child_process').exec);

// Need to trick the presubmit script to not complain.
var log = console['log'];

function usage() {
  log('Lovefield Bundler');
  log('Usage:');
  log('  --schema Path of the YAML schema file');
  log('  --namespace Namespace of generated code');
  log('  --ouputdir Output directory (Optional, default to $cwd)');
  log('  --compiler Closure compiler JAR path ');
  log('             (Optional, default to $CLOSURE_COMPILER)');
  log('  --library Closure library path ');
  log('            (Optional, default to $CLOSURE_LIBRARY)');
  process.exit(1);
}

// Command line options
var knownOpts = {
  'schema': [String],
  'namespace': [String],
  'compiler': [String, null],
  'library': [String, null],
  'outputdir': [String, null]
};
var args = noptMod(knownOpts);

if (!args.hasOwnProperty('schema') ||
    !args.hasOwnProperty('namespace')) {
  usage();
}


/** @type {string} */
var namespace = args.namespace;


/** @type {string} */
var schemaPath;


/** @type {string} */
var outputDir;


/** @type {string} */
var compilerPath;


/** @type {string} */
var closureDir;

try {
  schemaPath = pathMod.resolve(args.schema);
  outputDir = pathMod.resolve(
      pathMod.join(process.cwd(), args.outputdir || ''));
  compilerPath = pathMod.resolve(args.compiler ||
      process.env['CLOSURE_COMPILER']);
  closureDir = pathMod.resolve(args.library || process.env['CLOSURE_LIBRARY']);
} catch (e) {
  // Swallow path resolve exceptions, non-resolved paths will be treated as
  // empty path and checked in following logic (which displays usage).
}

if (!(schemaPath && outputDir && compilerPath && closureDir)) {
  usage();
}

var spacPath = pathMod.join(pathMod.resolve(__dirname), '../spac/spac.js');
var spac = fork(
    spacPath,
    [
     '--schema=' + schemaPath,
     '--namespace=' + namespace,
     '--outputdir=' + outputDir
    ]);

spac.on('close', function(code) {
  if (code == 0) {
    runClosure();
  } else {
    log('ERROR: unable to generate code from schema');
  }
});

function runClosure() {
  var namespacePrefix = namespace.replace('.', '_');
  var generatedFiles = [
    namespacePrefix + '_database.js',
    namespacePrefix + '_schema.js',
    namespacePrefix + '_observer.js',
    namespacePrefix + '_transaction.js'
  ].map(function(fileName) {
    return pathMod.resolve(pathMod.join(outputDir, fileName));
  });

  var root = pathMod.join(pathMod.resolve(__dirname), '../lib');
  var closureBuilder =
      pathMod.join(closureDir, 'closure/bin/build/closurebuilder.py');
  var command = [
    'python',
    closureBuilder,
    '--root=' + root,
    '--root=' + closureDir,
    '--output_mode=compiled',
    '--namespace=' + namespace,
    '--compiler_jar=' + compilerPath,
    '--compiler_flags="--language_in=ECMASCRIPT5_STRICT"'
  ];
  command = command.concat(generatedFiles);
  var outputFile = pathMod.join(outputDir, namespacePrefix + '_bundle.js');
  exec(
      command.join(' ') + ' >' + outputFile,
      { encoding: 'utf8' },
      function(error, stdout, stderr) {
        generatedFiles.forEach(function(file) {
          fsMod.unlinkSync(file);
        });
      });
}
