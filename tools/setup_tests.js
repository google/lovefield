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
var fsMod =
    /**
     * @type {{
     *   ensureDirSync: function(string),
     *   removeSync: function(string)
     * }}
     */ (require('fs-extra'));
var glob = /** @type {{sync: !Function}} */ (require('glob')).sync;
var pathMod = /** @type {{sep: string}} */ (require('path'));
var temp = /** @type {{Dir: !Function}} */ (require('temporary'));


/**
 * @type {{
 *   CLOSURE_LIBRARY_PATH: string,
 *   TEST_SCHEMAS: !Array.<{file: string, namespace: string}>
 *   }
 * }}
 */
var config = /** @type {!Function} */ (require(
    pathMod.resolve(__dirname + '/config.js')))();
var genDeps = /** @type {!Function} */ (require(
    pathMod.join(__dirname, 'scan_deps.js')).genDeps);
var genModuleDeps = /** @type {!Function} */ (require(
    pathMod.join(__dirname, 'scan_deps.js')).genModuleDeps);
var extractRequires = /** @type {!Function} */ (require(
    pathMod.join(__dirname, 'scan_deps.js')).extractRequires);
var generateTestSchemas = /** @type {!Function} */ (require(
    pathMod.join(__dirname, 'builder.js')).generateTestSchemas);



// Make linter happy.
var log = console['log'];


/** @const {!Array<string>} */
var SYMLINKS = ['lib', 'perf', 'testing', 'tests', 'dist'];


// Firebase tests need special treatment.
var FIREBASE_TESTS = [
  'tests/backstore/firebase_raw_back_store_test.html',
  'tests/backstore/firebase_test.html'
];



/**
 * @constructor
 * A helper class for creating a temporary directory that is capable of
 * executing tests.
 * @param {string} testsDir The folder that contains all the tests.
 */
var TestEnv = function(testsDir) {
  /** @type {string} */
  this.testsDir = testsDir;

  /** @type {string} */
  this.tempPath = pathMod.resolve(new temp.Dir().path);

  /** @type {string} */
  this.origPath = process.cwd();

  /** @type {string} */
  this.genDir = pathMod.join(this.tempPath, 'gen');

  /** @type {string} */
  this.htmlDir = pathMod.join(this.tempPath, 'html');
};


/**
 * @return {!IThenable<string>} A promise holding the path of the temporary
 *     directory.
 */
TestEnv.prototype.create = function() {
  process.chdir(this.tempPath);

  // Generating gen and html folders.
  fsMod.mkdirSync('html');
  this.createSymLinks(config.CLOSURE_LIBRARY_PATH);

  var allHtmlFiles = this.setupTestsWithoutHtml();
  allHtmlFiles.push.apply(
      allHtmlFiles,
      this.setupTestsWithHtml());
  this.setupTestResources();
  allHtmlFiles.sort();
  generateIndexHtml(allHtmlFiles);

  return generateTestSchemas(this.genDir).then(
      function() {
        this.setupTestDeps();
        return this.tempPath;
      }.bind(this),
      function(e) {
        process.chdir(this.origPath);
        cleanUp(this.tempPath);
        throw e;
      }.bind(this));
};


/**
 * Performs necessary setup for tests that do not provide their own HTML file.
 * @return {!Array<string>} A list of all HTML files in the temp directory.
 */
TestEnv.prototype.setupTestsWithoutHtml = function() {
  // Generating HTML files for tests that don't already have one.
  var testFilesWithoutHtml = this.queryTestFiles(false);
  log('Generating', testFilesWithoutHtml.length, 'HTML test files ... ');
  return testFilesWithoutHtml.map(function(name) {
    return generateHtmlFile(name);
  });
};


/**
 * Performs necessary setup for tests that provide their own HTML file.
 * @return {!Array<string>} A list of all HTML files in the temp directory.
 */
TestEnv.prototype.setupTestsWithHtml = function() {
  // Creating symlinks for existing HTML files.
  var testFilesWithHtml = this.queryTestFiles(true).filter(function(test) {
    return FIREBASE_TESTS.indexOf(test) == -1;
  });
  log('Found', testFilesWithHtml.length, 'test files with existing HTML... ');
  return testFilesWithHtml.map(function(testFile) {
    var htmlFile = testFile.substr(0, testFile.length - 3) + '.html';
    // Replacing tests/ with html/ in the name.
    var link = htmlFile.replace('tests/', 'html/');

    // Creating a symlink for the directory.
    // For Windows to work, one must comply
    // 1. use absolute path
    // 2. create junctions (ignored on platforms other than Windows)
    // 3. directories only
    // 4. both directories on the same volume
    var src = pathMod.dirname(pathMod.resolve(this.origPath, htmlFile));
    var dst = pathMod.dirname(pathMod.join(this.tempPath, link));

    // Ensure that the parent dir of link target is constructed.
    fsMod.ensureDirSync(pathMod.dirname(dst));
    if (!fsMod.existsSync(dst)) {
      fsMod.symlinkSync(src, dst, 'junction');
    }

    return link;
  }, this);
};


/**
 * Creates symlinks for any json files such that the HTML files can refer to
 * them (used when running perf tests).
 */
TestEnv.prototype.setupTestResources = function() {
  var jsonFiles = glob(this.testsDir + '/**/*.json');
  jsonFiles.forEach(function(jsonFile) {
    var link = pathMod.join('html', pathMod.basename(jsonFile));
    fsMod.symlinkSync(
        pathMod.resolve(jsonFile),
        pathMod.join(this.tempPath, link), 'junction');
  }, this);
};


/**
 * Sets up the deps.js file needed for the tests to run.
 */
TestEnv.prototype.setupTestDeps = function() {
  var directories = SYMLINKS.map(
      function(dir) {
        return pathMod.join(this.tempPath, dir);
      }, this).concat([this.htmlDir, this.genDir]);
  var deps = genDeps(this.tempPath, directories);
  fsMod.writeFileSync('deps.js', deps);
};


/**
 * @param {boolean} withHtml Whether to look for files that already have an
 *     associating HTML file.
 * @return {!Array<string>}
 */
TestEnv.prototype.queryTestFiles = function(withHtml) {
  var testFiles = glob(this.testsDir + '/**/*_test.js');
  var htmlFiles = glob(this.testsDir + '/**/*_test.html');

  var existingHtmlFilesSet = new Set();
  htmlFiles.forEach(function(file) {
    if (FIREBASE_TESTS.indexOf(file) == -1) {
      // Stripping away the '.html' suffix and adding to the set.
      existingHtmlFilesSet.add(file.substr(0, file.length - '.html'.length));
    }
  });
  return testFiles.filter(function(jsFileName) {
    // Stripping away the '.js'.
    var testName = jsFileName.substr(0, jsFileName.length - '.js'.length);
    return existingHtmlFilesSet.has(testName) == withHtml;
  });
};


/**
 * Creates symbolic links to Closure and Lovefield.
 * @param {string} libraryPath Closure library path.
 */
TestEnv.prototype.createSymLinks = function(libraryPath) {
  fsMod.symlinkSync(
      pathMod.resolve(pathMod.join(libraryPath, 'closure')),
      pathMod.join(this.tempPath, 'closure'),
      'junction');
  SYMLINKS.forEach(function(link) {
    fsMod.symlinkSync(
        pathMod.resolve(pathMod.join(__dirname, '../' + link)),
        pathMod.join(this.tempPath, link),
        'junction');
  }, this);
};


/** Removes previously created symbolic links */
function removeSymLinks() {
  fsMod.unlinkSync('closure');
  SYMLINKS.forEach(function(link) {
    fsMod.unlinkSync(link);
  });
}


/**
 * Creates stub HTML file with links to all individual tests.
 * @param {!Array<string>} testFiles
 */
function generateIndexHtml(testFiles) {
  var links = testFiles.map(function(file) {
    return '    <a href="' + file + '">' + file.slice('html/'.length) +
        '</a><br />';
  });
  var contents =
      '<!DOCTYPE html>\r\n' +
      '<html>\r\n' +
      '  <head>\r\n' +
      '    <meta charset="utf-8" />\r\n' +
      '    <title>Lovefield tests</title>\r\n' +
      '  </head>\r\n' +
      '  <body>\r\n' +
      '    <h1>Lovefield tests</h1>\r\n' +
      links.join('\r\n') +
      '\r\n  </body>\r\n' +
      '</html>\r\n';
  fsMod.writeFileSync('index.html', contents);
  log('\nTest files generated. Starting server @' + process.cwd() + ' ...\n');
}


/**
 * Generates test HTML for a given test script. Depending on how the test is
 * written (i.e. goog.module or not), the HTML generated will be different since
 * different code injection is needed.
 * @param {string} script Path of the script, e.g. tests/foo_test.js.
 * @return {string} Generated file path.
 */
function generateHtmlFile(script) {
  var scriptPath = pathMod.resolve(pathMod.join(__dirname, '../', script));
  var contents = fsMod.readFileSync(scriptPath, {'encoding': 'utf-8'});
  var LITERAL = 'goog.module';
  var pos = contents.indexOf(LITERAL);
  if (pos != -1) {
    var pos2 = contents.indexOf(';', pos);
    var moduleName = contents.substring(pos + LITERAL.length + 2, pos2 - 2);
    return createTestModule(script, moduleName);
  } else {
    return createTestFile(script);
  }
}


/**
 * @param {string} script
 * @return {string}
 */
function getFirebaseSpecial(script) {
  var firebaseSpecial = '';
  if (script.indexOf('firebase') != -1 &&
      process.env['FIREBASE_URL'] &&
      process.env['FIREBASE_TOKEN']) {
    firebaseSpecial = [
      '<script>',
      'window.MANUAL_MODE = true;',
      'window.FIREBASE_URL = \'' + process.env['FIREBASE_URL'] + '\';',
      'window.FIREBASE_TOKEN = \'' + process.env['FIREBASE_TOKEN'] + '\';',
      '</script>'
    ].join('\r\n') + '\r\n';
    firebaseSpecial =
        '<script src="https://cdn.firebase.com/js/client/2.3.0/firebase.js">' +
        '</script>\r\n' + firebaseSpecial;
  }
  return firebaseSpecial;
}


/**
 * @param {string} script Path of the script, e.g. tests/foo_test.js.
 * @param {string} moduleName Test module name.
 * @return {string} Generated file path.
 */
function createTestModule(script, moduleName) {
  var sliceIndex = script.indexOf('/') + 1;
  var target = 'html/' + script.slice(sliceIndex, -2) + 'html';
  var level = target.match(/\//g).length;
  var prefix = new Array(level).join('../') + '../';

  var firebaseSpecial = getFirebaseSpecial(script);
  var contents =
      '<!DOCTYPE html>\r\n' +
      '<html>\r\n' +
      '  <head>\r\n' +
      '    <meta charset="utf-8" />\r\n' +
      '    <title>' + pathMod.basename(target).slice(0, -5) + '</title>\r\n' +
      '    <script src="' + prefix + 'closure/goog/base.js"></script>\r\n' +
      '    <script src="' + prefix + 'deps.js"></script>\r\n' +
      firebaseSpecial +
      '    <script>' + genModuleDeps(script) + '</script>\r\n' +
      '    <script>goog.require(\'' + moduleName + '\');\r\n' +
      '    </script>\r\n' +
      '  </head>\r\n' +
      '</html>\r\n';

  fsMod.ensureDirSync(pathMod.dirname(target));
  fsMod.writeFileSync(target, contents);

  return target;
}


/**
 * @param {string} script Path of the script, e.g. tests/foo_test.js.
 * @return {string} Generated file path.
 */
function createTestFile(script) {
  var sliceIndex = script.indexOf('/') + 1;
  var target = 'html/' + script.slice(sliceIndex, -2) + 'html';
  var level = target.match(/\//g).length;
  var prefix = new Array(level).join('../') + '../';
  var fakeName = script.replace('/', '$').replace('.', '_');
  var scriptPath = pathMod.resolve(pathMod.join(__dirname, '../' + script));
  var firebaseSpecial = getFirebaseSpecial(script);
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
      firebaseSpecial +
      '    <script>\r\n' +
      '      goog.addDependency(\r\n' +
      '          \'../' + prefix + script + '\',\r\n' +
      '          [\'' + fakeName + '\'],\r\n' +
      '          [' + extractRequires(scriptPath) + '], false);\r\n' +
      '      goog.require(\'goog.testing.AsyncTestCase\');\r\n' +
      '      goog.require(\'goog.testing.jsunit\');\r\n' +
      '      goog.require(\'' + fakeName + '\');\r\n' +
      '    </script>\r\n' +
      '  </body>\r\n' +
      '</html>\r\n';
  fsMod.ensureDirSync(pathMod.dirname(target));
  fsMod.writeFileSync(target, contents);
  return target;
}


/**
 * Removes temp folder.
 * @param {string} tempPath
 */
function cleanUp(tempPath) {
  var origPath = process.cwd();
  removeSymLinks();
  process.chdir(origPath);
  fsMod.removeSync(tempPath);
}


/**
 * @param {string} testsDir
 * @return {!IThenable<string>}
 */
function createTestEnv(testsDir) {
  var testEnv = new TestEnv(testsDir);
  return testEnv.create();
}


/** @type {!Function} */
exports.createTestEnv = createTestEnv;


/** @type {!Function} */
exports.cleanUp = cleanUp;
