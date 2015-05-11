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
var gulp = require('gulp');
var webserver = /** @type {!Function} */ (require('gulp-webserver'));
var config =
    /** @type {!Function} */ (
        require(pathMod.resolve(__dirname + '/config.js')))();
var createTestEnv =
    /** @type {!Function} */ (
        require(pathMod.join(__dirname, 'setup_tests.js')).createTestEnv);
var cleanUp =
    /** @type {!Function} */ (
        require(pathMod.join(__dirname, 'setup_tests.js')).cleanUp);


var stdin = process.stdin;
var stdout = process.stdout;


/**
 * @param {string} testsFolder The folder that contains the test to be included
 *     in the server.
 * @return {!IThenable}
 */
function runTestServer(testsFolder) {
  return createTestEnv(testsFolder).then(function(tempPath) {
    var serverStream = webserver({
      livereload: true,
      fallback: 'index.html'
    });

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', function(key) {
      if (key == '\u0003') {
        serverStream.emit('kill');
        cleanUp(tempPath);
        process.exit(0);
      }
    });

    stdout.write('Server path: ' + tempPath + '\r\n');
    gulp.src(tempPath).pipe(serverStream);
  });
}


function runUnitTestServer() {
  return runTestServer('tests');
}


function runPerfTestServer() {
  return runTestServer('perf');
}


/** @type {!Function} */
exports.runUnitTestServer = runUnitTestServer;


/** @type {!Function} */
exports.runPerfTestServer = runPerfTestServer;
