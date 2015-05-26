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
var fs = require('fs');
var gulp = require('gulp');
var webserver = require('gulp-webserver');
var rmdir = require('rimraf').sync;


gulp.task('copy_data', function() {
  if (!fs.existsSync('data')) { fs.mkdirSync('data'); }
  fs.createReadStream('../data/olympic_medalists.json').
      pipe(fs.createWriteStream('data/olympic_medalists.json'));
  fs.createReadStream('../data/column_domains.json').
      pipe(fs.createWriteStream('data/column_domains.json'));
});


gulp.task('default', ['copy_data']);


gulp.task('clean', function() {
  var foldersToDelete = [
    'data'
  ];

  foldersToDelete.forEach(function(folder) {
    if (fs.existsSync(folder)) {
      rmdir(folder);
    }
  });
});


gulp.task('webserver', ['copy_data'], function() {
  gulp.src('.').pipe(webserver({
    livereload: true,
    directoryListing: true,
    open: false
  }));
});
