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
var fsMod = require('fs');
var gulp = /** @type {{src: !Function, dest: !Function}} */ (require('gulp'));
var pathMod = require('path');
var closureCompiler = /** @type {!Function} */ (
    require('gulp-closure-compiler'));
var temporary = /** @type {{Dir: !Function, File: !Function}} */ (
    require('temporary'));
var childProcess = require('child_process');


/**
 * @type {{
 *   CLOSURE_COMPILER_PATH: string,
 *   CLOSURE_LIBRARY_PATH: string,
 *   COMPILER_FLAGS_COMMON: !Object,
 *   COMPILER_FLAGS_DEBUG: !Object,
 *   COMPILER_FLAGS_OPT: !Object,
 *   FIREBASE_EXTERNS: string,
 *   LOVEFIELD_EXTERNS: string,
 *   TEST_SCHEMAS: !Array<{file: string, namespace: string}>
 * }}
 */
var config = /** @type {!Function} */ (
    require(pathMod.resolve(__dirname + '/config.js')))();
var depsHelper = /** @type {{
    scanDeps: !Function, getTransitiveDeps: !Function}} */ (
        require(pathMod.resolve(__dirname + '/scan_deps.js')));
var StripLicense = require(pathMod.resolve(
    pathMod.join(__dirname, '/strip_license.js'))).StripLicense;
var batchRun = require(pathMod.resolve(
    pathMod.join(__dirname, '/promise_util.js'))).batchRun;

// Make linter happy
var log = console['log'];


function buildLib(options) {
  var closureDependencies = depsHelper.scanDeps();
  return gulp.src(closureDependencies.concat('lib/**/*.js')).
      pipe(closureCompiler({
        compilerPath: config.CLOSURE_COMPILER_PATH,
        fileName: 'lf.js',
        compilerFlags: mergeObjects(
            {externs: [config.FIREBASE_EXTERNS]},
            getCompilerFlags(options.mode))
      })).
      pipe(new StripLicense({objectMode: true})).
      pipe(gulp.dest('dist'));
}


/**
 * @param {string} testFilePath
 * @return {!IThenable}
 */
function buildTest(testFilePath) {
  // Some tests are built against the distritbuted lovefield.min.js and require
  // different setup.
  var testFile = pathMod.normalize(testFilePath);
  if (testFile.indexOf(pathMod.join('harness', 'min_js')) != -1) {
    return buildMinJsTest_(testFile);
  }

  var compilerFlags = mergeObjects({
    export_local_property_definitions: null,
    externs: [config.FIREBASE_EXTERNS]
  }, getCompilerFlags('debug'));

  return new Promise(function(resolve, reject) {
    var spacTemporaryDir = new temporary.Dir().path;
    generateTestSchemas(spacTemporaryDir).then(
        function() {
          var transitiveDeps;
          try {
            transitiveDeps = depsHelper.getTransitiveDeps(
                testFile, spacTemporaryDir);
          } catch (e) {
            reject(e);
          }

          gulp.src(transitiveDeps).pipe(closureCompiler({
            compilerPath: config.CLOSURE_COMPILER_PATH,
            fileName: new temporary.File().path,
            compilerFlags: compilerFlags
          })).on('end', function() {
            resolve();
          });
        }, reject);
  });
}


/**
 * Builds tests that pull lovefield.min.js as an external script.
 * @param {string} testFile
 * @return {!IThenable}
 */
function buildMinJsTest_(testFile) {
  var compilerFlags = mergeObjects({
    export_local_property_definitions: null,
    externs: [config.LOVEFIELD_EXTERNS]
  }, getCompilerFlags('debug'));

  var dir = pathMod.dirname(testFile);
  var apiTester = pathMod.join(dir, 'api_tester.js');
  var testReporter = pathMod.join(dir, 'test_reporter.js');
  return new Promise(function(resolve, reject) {
    gulp.src([apiTester, testReporter, testFile]).pipe(closureCompiler({
      compilerPath: config.CLOSURE_COMPILER_PATH,
      fileName: new temporary.File().path,
      compilerFlags: compilerFlags
    })).on('end', resolve, reject);
  });
}


/**
 * Builds tests that pull lovefield.min.js as an external script.
 * @param {{filter: string}} options
 * @return {!IThenable}
 */
function buildAllTests(options) {
  var glob = /** @type {{sync:!Function}} */ (require('glob'));
  var testFiles = glob.sync('tests/**/*_test.js');
  if (options.filter) {
    var filters = typeof(options.filter) == 'string' ? [options.filter] :
        options.filter;
    testFiles = testFiles.filter(function(file) {
      return filters.some(function(filter) {
        return file.indexOf(filter) != -1;
      });
    });
  }

  var functionItems = testFiles.map(function(file) {
    return {
      fn: buildTest.bind(null, pathMod.resolve(file)),
      name: file
    };
  });

  var total = functionItems.length;
  var maxRunners = process.env['CONCURRENT_BUILDER'] || 8;
  var onStart = function(functionItem, index) {
    log('Building...', index + 1, 'of', total, functionItem.name);
  };
  return batchRun(functionItems, maxRunners, onStart);
}


/**
 * Generates SPAC code for all test schemas.
 * @param {string} outputDir The directory where generated code should be
 *     placed.
 * @return {!IThenable}
 */
function generateTestSchemas(outputDir) {
  var promises = config.TEST_SCHEMAS.map(
      function(testSchema) {
        return runSpac(testSchema.file, testSchema.namespace, outputDir);
      });
  return Promise.all(promises);
}


/**
 * @param {string} mode One of "debug" or "opt".
 * @return {!Object} An object holding all compiler flags and their values.
 */
function getCompilerFlags(mode) {
  return mode == 'debug' ?
      mergeObjects(config.COMPILER_FLAGS_COMMON, config.COMPILER_FLAGS_DEBUG) :
      mergeObjects(config.COMPILER_FLAGS_COMMON, config.COMPILER_FLAGS_OPT);
}


/**
 * Merges objects into a single object.
 * TODO(dpapad): Replace this with Object.assign once it becomes available in
 * node.
 * @param {...!Object} var_args The objects to be merged.
 * @return {!Object} The merged object.
 */
function mergeObjects(var_args) {
  var merged = {};
  var objects = Array.prototype.slice.call(arguments);
  objects.forEach(function(obj) {
    Object.keys(obj).forEach(function(key) {
      merged[key] = obj[key];
    });
  });
  return merged;
}


/**
 * Runs SPAC to generate code.
 * @param {string} schemaFilePath
 * @param {string} namespace
 * @param {string} outputDir
 * @return {!IThenable}
 */
function runSpac(schemaFilePath, namespace, outputDir) {
  var spacPath = pathMod.resolve(pathMod.join(__dirname, '../spac/spac.js'));
  var spac = childProcess.fork(
      spacPath,
      [
        '--schema=' + schemaFilePath,
        '--namespace=' + namespace,
        '--outputdir=' + outputDir,
        '--nocombine=true'
      ]);

  return new Promise(function(resolve, reject) {
    spac.on('close', function(code) {
      if (code == 0) {
        resolve();
      } else {
        var error = new Error(
            'ERROR: unable to generate code from ' + schemaFilePath + '\r\n');
        log(error);
        reject(error);
      }
    });
  });
}


/** @type {!Function} */
exports.buildLib = buildLib;


/** @type {!Function} */
exports.buildTest = buildTest;


/** @type {!Function} */
exports.buildAllTests = buildAllTests;


/** @type {!Function} */
exports.generateTestSchemas = generateTestSchemas;
