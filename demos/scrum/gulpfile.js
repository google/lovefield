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

var gjslint = require('gulp-gjslint');
var gulp = require('gulp');
var nopt = require('nopt');
var webserver = require('gulp-webserver');

gulp.task('default', function() {
  var log = console['log'];
  log('Usage:');
  log('gulp lint: check js files');
  log('gulp debug [--port=<number>]: start debug server (default port 8000)');
});

gulp.task('lint', function() {
  return gulp.src('src/**/*.js').
      pipe(gjslint()).
      pipe(gjslint.reporter('console'), {fail: true});
});

gulp.task('debug', function() {
  var knownOps = {
    'port': [Number, null]
  };
  var portNumber = nopt(knownOps).port || 8000;

  gulp.src('.').pipe(webserver({
    livereload: true,
    port: portNumber
  }));
});
