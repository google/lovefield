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
var createServer =
    /** @type {!Function} */ (require('http-server').createServer);
var config =
    /** @type {!Function} */ (
        require(pathMod.resolve(__dirname + '/config.js')))();
var createTestEnv =
    /** @type {!Function} */ (
        require(pathMod.join(__dirname, 'setup_tests.js')).createTestEnv);
var cleanUp =
    /** @type {!Function} */ (
        require(pathMod.join(__dirname, 'setup_tests.js')).cleanUp);


/** @typedef {{listen: !Function, close: !Function}} @private */
var HTTPServerType_;


/** @type {HTTPServerType_} */
var server;

var stdin = process.stdin;
var stdout = process.stdout;


/** @param {number=} opt_port */
function runTestServer(opt_port) {
  var port = opt_port || 4000;
  var onSetupDone = function(tempPath) {
    if (tempPath) {
      server = /** @type {HTTPServerType_} */ (createServer());
      server.listen(port);
      stdout.write('Server path: ' + tempPath + '\r\n');
      stdout.write('Server started at port ' + port + '\r\n');
      waitCtrlC(tempPath);
    } else {
      stdout.write('ERROR: unable to generate code from schema\r\n');
      cleanUp(tempPath);
      process.exit(1);
    }
  };

  createTestEnv(onSetupDone);
}


/**
 * Waits until user press Ctrl-C.
 * @param {string} tempPath Path hosting test environment.
 */
function waitCtrlC(tempPath) {
  // Wait until Ctrl-C is pressed.
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  stdout.write('Press Ctrl-C to stop server ...\r\n');
  stdin.on('data', function(key) {
    if (key == '\u0003') {
      stdout.write('Stopping server ...\r\n');
      server.close();
      cleanUp(tempPath);
      process.exit(0);
    }

    // Write key to stdout as usual.
    stdout.write(key);
  });
}


/** @type {Function} */
exports.runTestServer = runTestServer;
