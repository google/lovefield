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
    'data'
  ];

  foldersToDelete.forEach(function(folder) {
    if (fs.existsSync(folder)) {
      fs.removeSync(folder);
    }
  });
});


gulp.task('debug', ['copy_data'], function() {
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
