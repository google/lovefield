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
/**
 * @fileoverview Loader of SPAC (Schema Parser And Code-generator) that is
 * supposed to run via node.js.
 */
var fsMod = require('fs');
var globMod = require('glob');
var pathMod = require('path');
var noptMod = /** @type {!Function} */ (require('nopt'));

var parseAndValidate = require('./parser.js').parse;
var CodeGen = require('./codegen.js').CodeGenerator;

// Need to trick the presubmit script to not complain.
var log = console['log'];

// Command line options
var knownOpts = {
  'schema': [String],
  'namespace': [String],
  'outputdir': [String],
  'templatedir': [String, null]
};
var args = noptMod(knownOpts);

if (!args.hasOwnProperty('schema') ||
    !args.hasOwnProperty('namespace') ||
    !args.hasOwnProperty('outputdir')) {
  log('Love Field Schema Parser And Code-generator');
  log('Usage:');
  log('  --schema Path of the YAML schema file');
  log('  --namespace Namespace of generated code');
  log('  --outputdir Output directory');
  log('  --templatedir Optional, directory containing templates');
  process.exit(1);
}

var schemaPath = pathMod.resolve(args.schema);
var namespace = args.namespace;
var outputDir = pathMod.resolve(args.outputdir);
var templateDir = args.templatedir || __dirname + '/template';

// Creating output directory, if necessary.
if (!fsMod.existsSync(outputDir)) {
  fsMod.mkdirSync(outputDir);
}

// Scan all templates
var templates = [];
var templateFiles = globMod.sync('*.jstemplate', {cwd: templateDir});
for (var i = 0; i < templateFiles.length; ++i) {
  templates.push(pathMod.resolve(templateDir + '/' + templateFiles[i]));
}

// Parse and validate schema
var schema = parseAndValidate(fsMod.readFileSync(schemaPath));

var codegen = new CodeGen(namespace, schema);
for (var j = 0; j < templates.length; ++j) {
  var baseName = pathMod.basename(templates[j]).replace(/\.jstemplate/, '.js');
  baseName = namespace.replace(/\./g, '_') + '_' + baseName;
  var outputFile = pathMod.join(outputDir, baseName);
  var codeTemplate = fsMod.readFileSync(templates[j]);
  fsMod.writeFileSync(outputFile, codegen.generate(baseName, codeTemplate));
}
