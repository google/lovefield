/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
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
var spawn = require('child_process').spawn;


gulp.task('copy_lovefield', function() {
  if (!fs.existsSync('lib')) { fs.mkdirSync('lib'); }
  return fs.
      createReadStream('node_modules/lovefield/dist/lovefield.min.js').
      pipe(fs.createWriteStream('lib/lovefield.min.js'));
});


gulp.task('default', ['copy_lovefield']);


gulp.task('clean', function() {
  var filesToDelete = [
    'lib/lovefield.min.js'
  ];

  filesToDelete.forEach(function(file) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
});


gulp.task('webserver', function() {
  gulp.src('.').pipe(webserver({
    livereload: true,
    directoryListing: true,
    open: false
  }));
});
