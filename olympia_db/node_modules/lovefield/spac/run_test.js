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
var minijl = require('minijasminenode');
var glob = require('glob');
var path = require('path');


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


/**
 * @param {string} module
 * @return {!Object}
 */
global.userRequire = function(module) {
  var moduleFile = path.resolve(__dirname + '/' + module + '.js');
  return require(moduleFile);
};

var testFiles = glob.sync('**/*_test.js', {cwd: __dirname});
for (var i = 0; i < testFiles.length; ++i) {
  minijl.addSpecs(path.resolve(__dirname, testFiles[i]));
}

// Run the tests and give correct exit code if error happened.
minijl.executeSpecs({
  onComplete: function(runner, log) {
    var exitCode = (runner.results().failedCount > 0) ? 1 : 0;
    process.exit(exitCode);
  }
});
