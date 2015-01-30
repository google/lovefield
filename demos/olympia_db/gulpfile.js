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


gulp.task('generate_db', function(done) {
  var lovefieldSpac = spawn('./node_modules/.bin/lovefield-spac', [
    '--schema', 'schema.yaml',
    '--namespace', 'olympia.db',
    '--outputdir', 'lib'
  ]);

  lovefieldSpac.stdout.on('data', function(data) {
    console.log('stdout: ' + data);
  });

  lovefieldSpac.stderr.on('data', function(data) {
    console.log('stderr: ' + data);
    console.log('This is probably because lovefield-spac is not installed');
    console.log('See: https://github.com/google/lovefield/blob/master/docs/' +
        'quick_start.md');
  });

  lovefieldSpac.on('close', function(code) {
    console.log('child process exited with code ' + code);
    done();
  });
});


gulp.task('copy_lovefield', function() {
  return fs.
      createReadStream('node_modules/lovefield/dist/lovefield.min.js').
      pipe(fs.createWriteStream('lib/lovefield.min.js'));
});


gulp.task('copy_bootstrap', function() {
  return fs.
      createReadStream('bower_components/bootstrap/dist/css/bootstrap.min.css').
      pipe(fs.createWriteStream('lib/bootstrap.min.css'));
});


gulp.task('copy_angular', function() {
  return fs.
      createReadStream('bower_components/angular/angular.min.js').
      pipe(fs.createWriteStream('lib/angular.min.js'));
});

gulp.task(
    'default',
    ['generate_db', 'copy_lovefield', 'copy_bootstrap', 'copy_angular']);

gulp.task('clean', function() {
  var filesToDelete = [
    'lib/angular.min.js',
    'lib/bootstrap.min.css',
    'lib/lovefield.js',
    'lib/olympia_db_gen.js'
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
