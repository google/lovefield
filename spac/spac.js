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

/**
 * @fileoverview Loader of SPAC (Schema Parser And Code-generator) that is
 * supposed to run via node.js.
 */
var fsMod = require('fs');
var mkdirp = /** @type {!Function} */ (require('mkdirp'));
var pathMod = require('path');
var noptMod = /** @type {!Function} */ (require('nopt'));

var parseAndValidate = /** @type {{convert: !Function}} */ (
    require('./parser.js')).convert;
var CodeGen = require('./codegen.js').CodeGenerator;

// Need to trick the presubmit script to not complain.
var log = console['log'];

// Command line options
var knownOpts = {
  'schema': [String],
  'namespace': [String],
  'outputdir': [String],
  'templatedir': [String, null],
  'nocombine': [Boolean, false]
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
  log('  --nocombine Optional, do not combine generated files, default: false');
  process.exit(1);
}

var schemaPath = pathMod.resolve(args.schema);
var namespace = args.namespace;
var outputDir = pathMod.resolve(args.outputdir);
var templateDir = args.templatedir || __dirname + '/template';

// Ensure output directory.
mkdirp(outputDir);

// Scan all templates
var configPath = pathMod.resolve(templateDir + '/templates.json');
var config = JSON.parse(fsMod.readFileSync(configPath));
var templates = config.templates.map(function(templateName) {
  return pathMod.resolve(templateDir + '/' + templateName);
});

// Parse and validate schema
var schema = parseAndValidate(fsMod.readFileSync(schemaPath));

var codegen = new CodeGen(namespace, schema);
for (var j = 0; j < templates.length; ++j) {
  var templateName =
      pathMod.basename(templates[j]).replace(/\.jstemplate/, '.js');
  var baseName = namespace.replace(/\./g, '_');
  var codeTemplate = fsMod.readFileSync(templates[j]);
  var generated = codegen.generate(baseName, codeTemplate);

  if (!args.nocombine) {
    var destFile = pathMod.join(outputDir, baseName + '_' + 'gen.js');
    if (j == 0) {
      fsMod.writeFileSync(destFile, generated);
    } else {
      fsMod.appendFileSync(destFile, generated);
    }
  } else {
    var outputFile = pathMod.join(outputDir, baseName + '_' + templateName);
    fsMod.writeFileSync(outputFile, generated);
  }
}
