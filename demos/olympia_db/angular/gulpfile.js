/**
 * @license
 * Copyright 2015 The Lovefield Project Authors. All Rights Reserved.
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
var fs = require('fs-extra');
var gulp = require('gulp');
var path = require('path');
var nopt = require('nopt');
var webserver = require('gulp-webserver');
var log = console['log'];


gulp.task('default', function() {
  log('Usage:');
  log(' gulp clean: clean all temporary files');
  log(' gulp debug [--port=<number>]: start debug server (default port 8000)');
  log(' gulp export: export the demo to dist');
});


gulp.task('copy_dependencies', function() {
  var libDir = 'lib';
  if (!fs.existsSync(libDir)) { fs.mkdirSync(libDir); }

  var filesToCopy = [
    // JS dependencies
    'bower_components/angular/angular.min.js',
    'bower_components/bootstrap/dist/js/bootstrap.min.js',
    'bower_components/bootstrap-table/dist/bootstrap-table.min.js',
    'bower_components/jquery/dist/jquery.min.js',
    'bower_components/lovefield/dist/lovefield.min.js',

    // CSS dependencies
    'bower_components/bootstrap/dist/css/bootstrap.min.css',
    'bower_components/bootstrap-table/dist/bootstrap-table.min.css'
  ];

  filesToCopy.forEach(function(file) {
    fs.copySync(file, path.join(libDir, path.basename(file)));
  });
});


gulp.task('copy_data', function() {
  var dataDir = 'data';
  if (!fs.existsSync(dataDir)) { fs.mkdirSync(dataDir); }

  var filesToCopy = [
    '../data/olympic_medalists.json',
    '../data/column_domains.json'
  ];

  filesToCopy.forEach(function(file) {
    fs.copySync(file, path.join(dataDir, path.basename(file)));
  });
});


gulp.task('clean', function() {
  var foldersToDelete = [
    'lib',
    'data'
  ];

  foldersToDelete.forEach(function(folder) {
    if (fs.existsSync(folder)) {
      fs.removeSync(folder);
    }
  });
});


gulp.task('debug', ['copy_dependencies', 'copy_data'], function() {
  var knownOps = {
    'port': [Number, null]
  };
  var portNumber = nopt(knownOps).port || 8000;

  gulp.src('.').pipe(webserver({
    livereload: true,
    directoryListing: true,
    open: false,
    port: portNumber
  }));
});


gulp.task('export', ['copy_dependencies', 'copy_data'], function() {
  var distDir = 'dist';
  if (!fs.existsSync(distDir)) { fs.mkdirSync(distDir); }

  fs.copySync('lib', path.join(distDir, 'lib'));
  fs.copySync('data', path.join(distDir, 'data'));
  fs.copySync('resources', path.join(distDir, 'resources'));
  fs.copySync('demo.html', path.join(distDir, 'demo.html'));
  fs.copySync('demo.js', path.join(distDir, 'demo.js'));
});
