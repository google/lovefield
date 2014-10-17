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
 * @fileoverview Node JS script that starts a test server for running tests.
 */
var fsMod = require('fs');
var pathMod = require('path');
var nopt = /** @type {!Function} */ (require('nopt'));
var mkdir = /** @type {!Function} */ (require('mkdirp').sync);
var rmdir = /** @type {!Function} */ (require('rimraf').sync);
var glob = /** @type {!Function} */ (require('glob').sync);
var fork = /** @type {!Function} */ (require('child_process').fork);
var exec = /** @type {!Function} */ (require('child_process').exec);
var createServer =
    /** @type {!Function} */ (require('http-server').createServer);


/** @typedef {{Dir: !Function}} @private */
var TempType_;
var temp = /** @type {TempType_} */ (require('temporary'));

var stdin = process.stdin;
var stdout = process.stdout;


/** @typedef {{listen: !Function, close: !Function}} @private */
var HTTPServerType_;


/** @type {HTTPServerType_} */
var server;


// Command line options.
var knownOpts = {
  'library': pathMod,
  'target': String,
  'port': [Number, null]
};
var args = nopt(knownOpts);
if (!args.hasOwnProperty('library') || !args.hasOwnProperty('target')) {
  stdout.write('Lovefield test server\r\n');
  stdout.write('Usage:\r\n');
  stdout.write('  --library Closure library location\r\n');
  stdout.write('  --target <perf|tests> Which test set to run\r\n');
  stdout.write('  --port [number] Port number to use, default to 4000\r\n');
  process.exit(1);
}

// Creates a temp directory.
var dir = new temp.Dir();
var tempPath = pathMod.resolve(dir.path);
var origPath = process.cwd();
stdout.write('Serving path is: ' + tempPath + '\r\n');
process.chdir(tempPath);
fsMod.mkdirSync('lovefield');
fsMod.mkdirSync('html');


/** @const {!Array.<string>} */
var SYMLINKS = ['lib', 'perf', 'testing', 'tests'];
createSymLinks();

// Create HR schema for tests
var spacPath = pathMod.resolve(pathMod.join(__dirname, '../spac/spac.js'));
var spac = fork(
    spacPath,
    [
      '--schema=' +
     pathMod.resolve(pathMod.join(__dirname, '../testing/hr_schema.yaml')),
      '--namespace=hr.db',
      '--outputdir=' + pathMod.resolve(pathMod.join(tempPath, 'html'))
    ]);

spac.on('close', function(code) {
  if (code == 0) {
    // Creates deps.js
    var writerPath = pathMod.resolve('closure/bin/build/depswriter.py');
    var command =
        'python ' + writerPath +
        '  --root_with_prefix="' +
        pathMod.resolve(pathMod.join(__dirname, '..')) +
        ' ../../lovefield"  --root_with_prefix="html ../../html" > deps.js';
    exec(command, function(error, cout, cerr) {
      createTestFiles();
      var port = args.port || 4000;
      server = /** @type {HTTPServerType_} */ (createServer());
      server.listen(port);
      stdout.write('Server started at port ' + port + '\r\n');
      waitCtrlC();
    });
  } else {
    stdout.write('ERROR: unable to generate code from schema\r\n');
    cleanUp();
    process.exit(1);
  }
});


/** Creates symbolic links to Closure and Lovefield */
function createSymLinks() {
  fsMod.symlinkSync(
      pathMod.resolve(pathMod.join(args.library, 'closure')),
      pathMod.join(tempPath, 'closure'),
      'junction');
  SYMLINKS.forEach(function(link) {
    fsMod.symlinkSync(
        pathMod.resolve(pathMod.join(__dirname, '../' + link)),
        pathMod.join(tempPath, 'lovefield/' + link),
        'junction');
  });
}


/** Removes previously created symbolic links */
function removeSymLinks() {
  fsMod.unlinkSync('closure');
  SYMLINKS.forEach(function(link) {
    fsMod.unlinkSync('lovefield/' + link);
  });
}


/** Creates stub HTML for test files */
function createTestFiles() {
  var testFiles = glob('lovefield/' + args.target + '/**/*_test.js');
  stdout.write('Generating ' + testFiles.length + ' test files ... ');
  var files = testFiles.map(function(name, index) {
    if (index % 10 == 0) {
      stdout.write(index + ' ');
    }
    return createTestFile(name);
  });

  var title = 'Lovefield ' + args.target;
  var links = files.map(function(file) {
    return '    <a href="' + file + '">' + file.slice(5) + '</a><br />';
  });
  var contents =
      '<!DOCTYPE html>\r\n' +
      '<html>\r\n' +
      '  <head>\r\n' +
      '    <meta charset="utf-8" />\r\n' +
      '    <title>' + title + '</title>\r\n' +
      '  </head>\r\n' +
      '  <body>\r\n' +
      '    <h1>' + title + '</h1>\r\n' +
      links.join('\r\n') +
      '\r\n  </body>\r\n' +
      '</html>\r\n';
  fsMod.writeFileSync('index.html', contents);
  stdout.write('\nTest files generated. Starting server ...\n');
}


/**
 * @param {string} script Path of the script, e.g. lovefield/tests/foo_test.js.
 * @return {string} Generated file path.
 */
function createTestFile(script) {
  var target = 'html/' + script.slice(10, -2) + 'html';
  var level = target.match(/\//g).length;
  var prefix = new Array(level).join('../') + '../';
  var contents =
      '<!DOCTYPE html>\r\n' +
      '<html>\r\n' +
      '  <head>\r\n' +
      '    <meta charset="utf-8" />\r\n' +
      '    <title>' + pathMod.basename(target).slice(0, -5) + '</title>\r\n' +
      '    <script src="' + prefix + 'closure/goog/base.js"></script>\r\n' +
      '    <script src="' + prefix + 'deps.js"></script>\r\n' +
      '  </head>\r\n' +
      '  <body>\r\n' +
      '    <script>\r\n' +
      '      goog.require(\'goog.testing.jsunit\');\r\n' +
      '      goog.require(\'goog.testing.AsyncTestCase\');\r\n' +
      '    </script>\r\n' +
      '    <script src="' + prefix + script + '"></script>\r\n' +
      '  </body>\r\n' +
      '</html>\r\n';
  mkdir(pathMod.dirname(target));
  fsMod.writeFileSync(target, contents);
  return target;
}


/** Waits until user press Ctrl-C */
function waitCtrlC() {
  // Wait until Ctrl-C is pressed.
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  stdout.write('Press Ctrl-C to stop server ...\r\n');
  stdin.on('data', function(key) {
    if (key == '\u0003') {
      stdout.write('Stopping server ...\r\n');
      server.close();
      cleanUp();
      process.exit(0);
    }

    // Write key to stdout as usual.
    stdout.write(key);
  });
}


/** Removes temp folder */
function cleanUp() {
  stdout.write('Removing temp folder ...\r\n');
  removeSymLinks();
  process.chdir(origPath);
  rmdir(tempPath);
}
