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
var fsMod = require('fs');
var glob = /** @type {{sync:!Function}} */ (require('glob'));


/** @type {{CLOSURE_LIBRARY_PATH: string}} */
var config = /** @type {!Function} */ (
    require(pathMod.resolve(__dirname + '/config.js')))();



/**
 * @constructor @struct
 * @private
 */
var ProvideMap_ = function() {
  this.map_ = {};
  this.reverse_ = {};
};


/**
 * @param {string} ns
 * @param {string} path
 */
ProvideMap_.prototype.set = function(ns, path) {
  this.map_[ns] = path;
  if (!this.reverse_.hasOwnProperty(path)) {
    this.reverse_[path] = [];
  }
  this.reverse_[path].push(ns);
};


/**
 * @param {string} ns
 * @return {?string}
 */
ProvideMap_.prototype.get = function(ns) {
  return this.map_.hasOwnProperty(ns) ? this.map_[ns] : null;
};


/**
 * @return {!Object}
 */
ProvideMap_.prototype.getAllProvides = function() {
  return this.reverse_;
};



/**
 * @constructor @struct
 * @private
 */
var RequireMap_ = function() {
  this.map_ = {};
};


/**
 * @param {string} path
 * @param {string} ns
 */
RequireMap_.prototype.set = function(path, ns) {
  if (!this.map_.hasOwnProperty(path)) {
    this.map_[path] = {};
  }
  this.map_[path][ns] = true;
};


/**
 * @param {!Object} obj
 * @return {!Array.<string>}
 * @private
 */
RequireMap_.prototype.objectKeys_ = function(obj) {
  var results = [];
  for (var key in obj) {
    results.push(key);
  }
  return results;
};


/**
 * @param {string} path
 * @return {!Array.<string>}
 */
RequireMap_.prototype.get = function(path) {
  if (this.map_.hasOwnProperty(path)) {
    return this.objectKeys_(this.map_[path]);
  }
  return [];
};


/** @return {!Array.<string>} */
RequireMap_.prototype.getAllDependencies = function() {
  var results = {};
  for (var path in this.map_) {
    for (var key in this.map_[path]) {
      results[key] = true;
    }
  }

  return this.objectKeys_(results);
};


/** @return {!Object} */
RequireMap_.prototype.getAllRequires = function() {
  var results = {};
  for (var key in this.map_) {
    results[key] = [];
    for (var value in this.map_[key]) {
      results[key].push(value);
    }
  }
  return results;
};


/**
 * @param {string} startPath
 * @return {!Array<string>} relativePaths
 */
function relativeGlob(startPath) {
  return glob.sync(startPath + '/**/*.js');
}


/**
 * @param {!Array.<string>} filePaths
 * @param {!ProvideMap_} provideMap
 * @param {!RequireMap_} requireMap
 */
function scanFiles(filePaths, provideMap, requireMap) {
  /**
   * @param {string} line
   * @param {string} pattern
   * @return {?string} Extracted namespace or null.
   */
  var extractNamespace = function(line, pattern) {
    if (line.slice(0, pattern.length) == pattern) {
      return line.substring(pattern.length + 2, line.indexOf(';') - 2);
    }
    return null;
  };

  filePaths.forEach(function(path) {
    var realPath = pathMod.resolve(path);
    var contents = fsMod.readFileSync(realPath).toString().split('\n');
    contents.forEach(function(line) {
      var ns = extractNamespace(line, 'goog.require');
      if (ns) {
        requireMap.set(realPath, ns);
      }
      ns = extractNamespace(line, 'goog.provide');
      if (ns) {
        provideMap.set(ns, realPath);
      }
    });
  });
}


/**
 * @param {string} filePath
 * @return {string} requires
 */
function extractRequires(filePath) {
  var provideMap = new ProvideMap_();
  var requireMap = new RequireMap_();
  scanFiles([filePath], provideMap, requireMap);
  return requireMap.get(filePath).map(function(ns) {
    return '\'' + ns + '\'';
  }).join(', ');
}


/**
 * @param {!RequireMap_} codeRequire
 * @return {!Array.<string>} Associated Closure files
 */
function extractClosureDependencies(codeRequire) {
  var closureRequire = new RequireMap_();
  var closureProvider = new ProvideMap_();
  var closurePath = config.CLOSURE_LIBRARY_PATH + '/closure/goog';
  scanFiles(relativeGlob(closurePath), closureProvider, closureRequire);

  var closureDeps = codeRequire.getAllDependencies().filter(function(element) {
    return element.slice(0, 4) == 'goog';
  });

  var map = {};
  closureDeps.forEach(function(ns) {
    map[ns] = closureProvider.get(ns);
  });

  var countKeys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    return keys.length;
  };

  var oldCount;
  do {
    oldCount = countKeys(map);
    for (var key in map) {
      var requires = closureRequire.get(map[key]);
      requires.forEach(function(ns) {
        map[ns] = closureProvider.get(ns);
      });
    }
  } while (countKeys(map) != oldCount);

  var closureFiles = [];
  for (var key in map) {
    closureFiles.push(map[key]);
  }
  return closureFiles;
}


/**
 * Find Closure dependency files for the lib.
 * @return {!Array.<string>}
 */
function scanDeps() {
  var provideMap = new ProvideMap_();
  var requireMap = new RequireMap_();
  scanFiles(relativeGlob('lib'), provideMap, requireMap);
  return extractClosureDependencies(requireMap).concat(
      pathMod.resolve(
          pathMod.join(config.CLOSURE_LIBRARY_PATH, 'closure/goog/base.js')));
}


/**
 * Generates goog.addDependency.
 * @param {string} basePath
 * @param {!ProvideMap_} provideMap
 * @param {!RequireMap_} requireMap
 * @return {!Array.<string>}
 */
function genAddDependency(basePath, provideMap, requireMap) {
  var provide = provideMap.getAllProvides();
  var require = requireMap.getAllRequires();
  var set = {};

  for (var key in provide) {
    set[key] = true;
  }
  for (var key in require) {
    set[key] = true;
  }

  var results = [];
  for (var key in set) {
    var servePath = pathMod.relative(basePath, key);
    var line = 'goog.addDependency("../../' + servePath + '", ';

    if (provide.hasOwnProperty(key)) {
      line += JSON.stringify(provide[key]) + ', ';
    } else {
      line += '[], ';
    }

    if (require.hasOwnProperty(key)) {
      line += JSON.stringify(require[key]) + ');';
    } else {
      line += '[]);';
    }
    results.push(line);
  }
  return results;
}


/**
 * Generates deps.js used for testing.
 * @param {string} basePath
 * @param {!Array.<string>} targets
 * @return {string}
 */
function genDeps(basePath, targets) {
  var provideMap = new ProvideMap_();
  var requireMap = new RequireMap_();

  var files = [];
  targets.forEach(function(target) {
    files = files.concat(relativeGlob(target));
  });
  scanFiles(files, provideMap, requireMap);

  var results = genAddDependency(basePath, provideMap, requireMap);
  return results.join('\n');
}


/** @type {Function} */
exports.scanDeps = scanDeps;


/** @type {Function} */
exports.genDeps = genDeps;


/** @type {Function} */
exports.extractRequires = extractRequires;



/**
 * A helper class for getting a the minimal list of files that need to be passed
 * to the compiler such that a given test can be compiled.
 * @constructor
 *
 * @param {string} generatedFilesDir The folder that holds auto-generated code.
 */
var TransitiveDepsScanner = function(generatedFilesDir) {
  /** @private {string} */
  this.generatedFilesDir_ = pathMod.resolve(generatedFilesDir);

  /** @private {?ProvideMap_} */
  this.provideMap_;

  /** @private {?RequireMap_} */
  this.requireMap_;
};


/**
 * @private
 */
TransitiveDepsScanner.prototype.buildRequireProvideMaps_ = function() {
  if (this.provideMap_ != null && this.requireMap_ != null) {
    // Require/Provide maps have already been constructed from a previous
    // invocation, no need to re-construct.
    return;
  }

  this.provideMap_ = new ProvideMap_();
  this.requireMap_ = new RequireMap_();
  scanFiles(relativeGlob('lib'), this.provideMap_, this.requireMap_);
  scanFiles(relativeGlob('testing'), this.provideMap_, this.requireMap_);
  scanFiles(relativeGlob('tests'), this.provideMap_, this.requireMap_);
  scanFiles(
      relativeGlob(this.generatedFilesDir_),
      this.provideMap_, this.requireMap_);

  var closurePath = config.CLOSURE_LIBRARY_PATH + '/closure/goog';
  scanFiles(relativeGlob(closurePath), this.provideMap_, this.requireMap_);
};


/**
 * @param {string} dependency The namespace being visited.
 * @param {!Set<string>} depsSoFar The set of transitive dependencies that have
 *     been visited so far.
 * @private
 */
TransitiveDepsScanner.prototype.gatherDepsRec_ = function(
    dependency, depsSoFar) {
  if (depsSoFar.has(dependency)) {
    return;
  }
  depsSoFar.add(dependency);
  var provider = this.provideMap_.get(dependency);
  var deps = this.requireMap_.get(/** @type {string} */ (provider));
  deps.forEach(function(dep) {
    this.gatherDepsRec_(dep, depsSoFar);
  }, this);
};


/**
 * Gathers all transitive dependencies.
 * @param {string} filepath The absolute path of the file to be compiled.
 * @return {!Set<string>}
 * @private
 */
TransitiveDepsScanner.prototype.gatherDeps_ = function(filepath) {
  var testProvideMap = new ProvideMap_();
  var testRequireMap = new RequireMap_();
  scanFiles([filepath], testProvideMap, testRequireMap);
  var topLevelDeps = testRequireMap.get(filepath);

  var transitiveDeps = new Set();
  topLevelDeps.forEach(
      function(dependency) {
        this.gatherDepsRec_(dependency, transitiveDeps);
      }, this);
  return transitiveDeps;
};


/**
 * Gets a list of all files (absolute file paths) that need to be passed to the
 * compiler.
 * @param {string} testFile The test file to be compiled.
 * @return {!Array<string>}
 */
TransitiveDepsScanner.prototype.getDeps = function(testFile) {
  var filepath = pathMod.resolve(testFile);

  this.buildRequireProvideMaps_();
  var transitiveDeps = this.gatherDeps_(filepath);

  var transitiveFileDeps = new Set();
  transitiveDeps.forEach(function(dep) {
    transitiveFileDeps.add(this.provideMap_.get(dep));
  }, this);

  // Manually adding Closure's base.js file to the deps. Because this file is
  // not goog.providing anything it is not detected above.
  var closureBaseFile = pathMod.resolve(
      pathMod.join(config.CLOSURE_LIBRARY_PATH, 'closure/goog/base.js'));
  transitiveFileDeps.add(closureBaseFile);

  // Manually adding the test file that it is compiled as a dependency, such
  // that it is included during compilation.
  transitiveFileDeps.add(filepath);

  return setToArray(transitiveFileDeps);
};


/**
 * TODO(dpapad): Replace this method with Array.from once it becomes available.
 * @param {!Set<T>} set
 * @return {!Array<T>}
 * @template T
 */
function setToArray(set) {
  var array = new Array();
  set.forEach(function(value) {
    array.push(value);
  }, null);
  return array;
}


/**
 * Singleton TransitiveDepsScanner instance, instantiated lazily.
 * @private {?TransitiveDepsScanner}
 */
TransitiveDepsScanner.instance_ = null;


/**
 * @param {string} generatedFilesDir The folder that holds auto-generated code.
 * @return {!TransitiveDepsScanner}
 */
TransitiveDepsScanner.getInstance = function(generatedFilesDir) {
  if (TransitiveDepsScanner.instance_ == null) {
    TransitiveDepsScanner.instance_ =
        new TransitiveDepsScanner(generatedFilesDir);
  }
  return TransitiveDepsScanner.instance_;
};


/**
 * @param {string} testFile The test file to be compiled.
 * @param {string} generatedFilesDir The folder that holds auto-generated code.
 * @return {!Array<string>}
 */
function getTransitiveDeps(testFile, generatedFilesDir) {
  var depsScanner = TransitiveDepsScanner.getInstance(generatedFilesDir);
  return depsScanner.getDeps(testFile);
}


/** @type {Function} */
exports.getTransitiveDeps = getTransitiveDeps;
