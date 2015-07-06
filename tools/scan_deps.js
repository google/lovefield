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
var pathMod = require('path');
var fsMod = require('fs');
var glob = /** @type {{sync:!Function}} */ (require('glob'));
var osMod = /** @type {{platform:!Function}} */ (require('os'));



/** @constructor */
var Toposort = /** @type {!Function} */ (require('toposort-class'));


/** @type {{CLOSURE_LIBRARY_PATH: string}} */
var config = /** @type {!Function} */ (
    require(pathMod.resolve(__dirname + '/config.js')))();



/**
 * @constructor @struct
 * @private
 */
var ProvideMap_ = function() {
  /** @private {!Map<string, string>} */
  this.map_ = new Map();

  /** @private {!Map<string, !Array<string>>} */
  this.reverse_ = new Map();

  /** @private {!Map<string, boolean>} */
  this.module_ = new Map();
};


/**
 * @param {string} ns
 * @param {string} path
 * @param {boolean=} opt_isModule
 */
ProvideMap_.prototype.set = function(ns, path, opt_isModule) {
  this.map_.set(ns, path);
  if (!this.reverse_.has(path)) {
    this.reverse_.set(path, []);
  }
  this.reverse_.get(path).push(ns);
  this.module_.set(ns, opt_isModule || false);
};


/**
 * @param {string} ns
 * @return {?string}
 */
ProvideMap_.prototype.get = function(ns) {
  return /** @type {?string} */ (
      this.map_.has(ns) ? this.map_.get(ns) : null);
};


/**
 * @param {string} ns
 * @return {boolean}
 */
ProvideMap_.prototype.isModule = function(ns) {
  return /** @type {boolean} */ (
      this.module_.has(ns) ? this.module_.get(ns) : false);
};


/**
 * @return {!Map<string, !Array<string>>}
 */
ProvideMap_.prototype.getAllProvides = function() {
  return this.reverse_;
};



/**
 * @constructor @struct
 * @private
 */
var RequireMap_ = function() {
  /** @private {!Map<string, !Set<string>>} */
  this.map_ = new Map();
};


/**
 * @param {string} path
 * @param {string} ns
 */
RequireMap_.prototype.set = function(path, ns) {
  if (!this.map_.has(path)) {
    this.map_.set(path, new Set());
  }
  this.map_.get(path).add(ns);
};


/**
 * @param {string} path
 * @return {!Array<string>}
 */
RequireMap_.prototype.get = function(path) {
  if (this.map_.has(path)) {
    return setToArray(/** @type {!Set} */ (this.map_.get(path)));
  }
  return [];
};


/** @return {!Array<string>} */
RequireMap_.prototype.getAllDependencies = function() {
  var results = new Set();
  this.map_.forEach(function(set, key) {
    set.forEach(function(value) {
      results.add(value);
    });
  }, this);

  return setToArray(results);
};


/** @return {!Map<string, !Array<string>>} */
RequireMap_.prototype.getAllRequires = function() {
  var results = new Map();
  this.map_.forEach(function(set, key) {
    var array = [];
    results.set(key, array);
    set.forEach(function(value) {
      array.push(value);
    });
  }, this);

  return results;
};


/**
 * @param {!ProvideMap_} provideMap
 * @param {!ProvideMap_} closureProvide
 * @param {!Set<string>=} opt_filter Filter only files specified.
 * @return {!Array<Object>}
 */
RequireMap_.prototype.getTopoSortEntry = function(
    provideMap, closureProvide, opt_filter) {
  var results = [];
  this.map_.forEach(function(set, key) {
    if (opt_filter && !opt_filter.has(key)) {
      return;
    }
    var entry = { name: key, depends: [] };

    set.forEach(function(ns) {
      var provider = (ns.slice(0, 4) == 'goog') ? closureProvide : provideMap;
      entry.depends.push(provider.get(ns));
    });
    results.push(entry);
  });

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
 * @param {!Array<string>} filePaths
 * @param {!ProvideMap_} provideMap
 * @param {!RequireMap_} requireMap
 */
function scanFiles(filePaths, provideMap, requireMap) {
  /**
   * @param {string} line
   * @param {string} pattern Pattern to look for, e.g. goog.module(...).
   * @param {string=} opt_antiPattern Pattern to ignore if it shared same prefix
   *     as pattern, e.g. goog.module.declareLegacyNamespace.
   * @return {?string} Extracted namespace or null.
   */
  var extractNamespace = function(line, pattern, opt_antiPattern) {
    var pos = line.indexOf(pattern);
    if (pos == 0) {
      if (opt_antiPattern && line.indexOf(opt_antiPattern) == 0) {
        return null;
      }
      return line.substring(
          pos + pattern.length + 2, line.indexOf(';', pos) - 2);
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
      ns = extractNamespace(line, 'goog.module',
          'goog.module.declareLegacyNamespace');
      if (ns) {
        provideMap.set(ns, realPath, true);
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
 * @param {!RequireMap_} closureRequire
 * @param {!ProvideMap_} closureProvide
 * @return {!Set<string>} Associated Closure files
 */
function extractClosureDependencies(
    codeRequire, closureRequire, closureProvide) {
  var closureDeps = codeRequire.getAllDependencies().filter(function(element) {
    return element.slice(0, 4) == 'goog';
  });

  var map = new Map();
  closureDeps.forEach(function(ns) {
    map.set(ns, closureProvide.get(ns));
  });

  var oldCount;
  do {
    oldCount = map.size;
    map.forEach(function(value, key) {
      var requires = closureRequire.get(value);
      requires.forEach(function(ns) {
        map.set(ns, closureProvide.get(ns));
      });
    });
  } while (map.size != oldCount);

  var closureFiles = new Set();
  map.forEach(function(value, key) {
    closureFiles.add(value);
  });
  return closureFiles;
}


/**
 * Find Closure dependency files for the lib.
 * @return {!Array<string>}
 */
function scanDeps() {
  var provideMap = new ProvideMap_();
  var requireMap = new RequireMap_();
  scanFiles(relativeGlob('lib'), provideMap, requireMap);

  var closureRequire = new RequireMap_();
  var closureProvide = new ProvideMap_();
  var closurePath = config.CLOSURE_LIBRARY_PATH + '/closure/goog';
  scanFiles(relativeGlob(closurePath), closureProvide, closureRequire);

  var closureDeps =
      extractClosureDependencies(requireMap, closureRequire, closureProvide);

  var edges = requireMap.getTopoSortEntry(provideMap, closureProvide);
  var edgesClosure = closureRequire.getTopoSortEntry(
      closureProvide, closureProvide, closureDeps);

  var topoSorter = new Toposort();
  edges.forEach(function(entry) {
    topoSorter.add(entry.name, entry.depends);
  });
  var topoSorterClosure = new Toposort();
  edgesClosure.forEach(function(entry) {
    topoSorterClosure.add(entry.name, entry.depends);
  });

  var files = [pathMod.resolve(
      pathMod.join(config.CLOSURE_LIBRARY_PATH, 'closure/goog/base.js'))];
  files = files.concat(topoSorterClosure.sort().reverse());
  files = files.concat(topoSorter.sort().reverse());

  return files;
}


/**
 * Generates goog.addDependency.
 * @param {string} basePath
 * @param {!ProvideMap_} provideMap
 * @param {!RequireMap_} requireMap
 * @return {!Array<string>}
 */
function genAddDependency(basePath, provideMap, requireMap) {
  var provide = provideMap.getAllProvides();
  var require = requireMap.getAllRequires();
  var set = new Set();

  provide.forEach(function(value, key) {
    set.add(key);
  });
  require.forEach(function(value, key) {
    set.add(key);
  });

  var results = [];
  set.forEach(function(key) {
    var relativeServePath = pathMod.join(
        '../../', pathMod.relative(basePath, key));

    if (osMod.platform().indexOf('win') != -1) {
      // For the case of Windows relativeServePath contains backslashes. Need to
      // escape the backward slash, otherwise it will not appear in the deps.js
      // file correctly. An alternative would be to convert backslashes to
      // forward slashes which works just as fine in the context of a browser.
      relativeServePath = relativeServePath.replace(/\\/g, '\\\\');
    }
    var line = 'goog.addDependency("' + relativeServePath + '", ';

    var isModule = false;
    if (provide.has(key)) {
      var value = /** @type {!Array<string>} */ (provide.get(key));
      line += JSON.stringify(value) + ', ';
      isModule = provideMap.isModule(key);
    } else {
      line += '[], ';
    }

    if (require.has(key)) {
      line += JSON.stringify(require.get(key));
    } else {
      line += '[]';
    }

    line += isModule ? ', true);' : ');';
    results.push(line);
  });

  return results;
}


/**
 * Generates deps.js used for testing.
 * @param {string} basePath
 * @param {!Array<string>} targets
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


/**
 * Generate addDependency for single module.
 * @param {string} scriptPath
 * @return {string}
 */
function genModuleDeps(scriptPath) {
  var provideMap = new ProvideMap_();
  var requireMap = new RequireMap_();
  scanFiles([scriptPath], provideMap, requireMap);
  var dumpValues = function(map) {
    var results = [];
    map.forEach(function(value, key) {
      results = results.concat(value);
    });
    return results;
  };

  var relativePath = pathMod.join('../..', scriptPath);
  if (osMod.platform().indexOf('win') != -1) {
    relativePath = relativePath.replace(/\\/g, '\\\\');
  }

  var provide = provideMap.getAllProvides();
  var require = requireMap.getAllRequires();
  return 'goog.addDependency("' + relativePath + '", ' +
      JSON.stringify(dumpValues(provide)) + ', ' +
      JSON.stringify(dumpValues(require)) + ', true);';
}


/** @type {Function} */
exports.scanDeps = scanDeps;


/** @type {Function} */
exports.genDeps = genDeps;


/** @type {Function} */
exports.extractRequires = extractRequires;


/** @type {Function} */
exports.genModuleDeps = genModuleDeps;



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
  if (provider == null) {
    throw new Error('Could not find provider for ' + dependency);
  }
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
