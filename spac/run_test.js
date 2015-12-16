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
var JasmineRunner = require('jasmine');
var glob = require('glob');
var path = require('path');

var jRunner = new JasmineRunner();


/** @type {Object} */
global.testdata = {};
var dataFiles = glob.sync('*', {cwd: __dirname + '/testdata'});
for (var i = 0; i < dataFiles.length; ++i) {
  testdata[path.basename(dataFiles[i])] =
      path.resolve(__dirname + '/testdata/' + dataFiles[i]);
}


/** @type {Object} */
global.template = {};
var templateFiles = glob.sync('*', {cwd: __dirname + '/template'});
for (var i = 0; i < templateFiles.length; ++i) {
  template[path.basename(templateFiles[i])] =
      path.resolve(__dirname + '/template/' + templateFiles[i]);
}


/** We resolve the paths manually, so set the base directory to empty string */
jRunner.projectBaseDir = '';


/** specDir must be set or jrunner.addSpecFiles crashes */
jRunner.specDir = '';

var testFiles = glob.sync('**/*_test.js', {cwd: __dirname});
for (var i = 0; i < testFiles.length; ++i) {
  jRunner.addSpecFiles([path.resolve(__dirname, testFiles[i])]);
}

jRunner.onComplete(function(passed) {
  process.exit(passed ? 0 : 1);
});

jRunner.execute();
