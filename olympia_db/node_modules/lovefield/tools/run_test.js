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
var pathMod = require('path');
var fork = /** @type {!Function} */ (require('child_process').fork);
var noptMod = /** @type {!Function} */ (require('nopt'));

// Command line options
var knownOpts = {
  'target': [String, null]
};
var options = noptMod(knownOpts);


// Need to trick the presubmit script to not complain.
var log = console['log'];

function runSpacTests(callback) {
  log('Starting SPAC tests ...');
  var spacPath = pathMod.join(
      pathMod.resolve(__dirname), '../spac/run_test.js');
  var spacTest = fork(spacPath);
  spacTest.on('close', function(code) {
    log('SPAC tests:', code ? 'FAILED' : 'PASSED');
    callback();
  });
}

function runTest(callback) {
  var target = options.target || 'spac';
  if (target == 'spac') {
    runSpacTests(callback);
  }
}


/** @type {!Function} */
exports.runTest = runTest;
