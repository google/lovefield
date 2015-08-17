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
var fs = require('fs');
var glob = require('glob');
var path = require('path');

var validate = require('./parser').convert;
var CodeGenerator = require('./codegen').CodeGenerator;


/**
 * @param {string} fileName
 * @param {boolean} expected
 * @return {boolean}
 */
function bundleModeChecker(fileName, expected) {
  var schemaYaml = fs.readFileSync(testdata[fileName]);
  var schema = validate(schemaYaml);
  var codegen = new CodeGenerator('bundled.db', schema);
  var codeTemplate = fs.readFileSync(template['database.jstemplate']);
  var contents = codegen.generate('database.js', codeTemplate);

  // There should be either true or false between lf.base.init and then.
  var string = contents.slice(contents.indexOf('lf.base.init'));
  string = string.slice(0, string.indexOf('then'));
  return string.indexOf(expected.toString()) != -1;
}

describe('Generator Test', function() {
  var schema;
  var codegen;

  it('should parse schema', function() {
    var schemaYaml = fs.readFileSync(testdata['codegen.yaml']);
    schema = validate(schemaYaml);
    expect(schema.name()).toEqual('db');
    expect(schema.version()).toEqual(1);

    // This must be done in the first spec, so that following specs will
    // have the object.
    codegen = new CodeGenerator('lovefield.db', schema);
  });

  it('should generate database.js', function() {
    var codeTemplate = fs.readFileSync(template['database.jstemplate']);
    var expected = fs.readFileSync(testdata['database.js']);
    expect(expected.toString().replace(/\r/gm, '')).toEqual(
        codegen.generate('db.js', codeTemplate).replace(/\r/gm, ''));
  });

  it('should generate schema.js', function() {
    var codeTemplate = fs.readFileSync(template['schema.jstemplate']);
    var expected = fs.readFileSync(testdata['schema.js']);
    expect(expected.toString().replace(/\r/gm, '')).toEqual(
        codegen.generate('schema.js', codeTemplate).replace(/\r/gm, ''));
  });

  it('should honor enableBundledMode', function() {
    expect(bundleModeChecker('bundled_mode.yaml', true));
    expect(bundleModeChecker('bundled_mode_disabled.yaml', false));
  });

  it('should handle index persistence correctly', function() {
    schemaYaml = fs.readFileSync(testdata['persistent_index.yaml']);
    schema = validate(schemaYaml);
    codegen = new CodeGenerator('foo.db', schema);
    var codeTemplate = fs.readFileSync(template['schema.jstemplate']);
    var expected = fs.readFileSync(testdata['foo_schema.js']);
    expect(expected.toString().replace(/\r/gm, '')).toEqual(
        codegen.generate('schema.js', codeTemplate).replace(/\r/gm, ''));
  });
});
