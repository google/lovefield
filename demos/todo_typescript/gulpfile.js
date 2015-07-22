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
var gulp = require('gulp');
var nopt = require('nopt');
var ts = require('gulp-typescript');
var tsd = require('gulp-tsd');
var webserver = require('gulp-webserver');


gulp.task('tsd', function(callback) {
  tsd({
    command: 'reinstall',
    config: 'tsd.json'
  }, callback);
});


gulp.task('build', ['tsd'], function() {
  var tsResult = gulp.src('todo.ts')
      .pipe(ts({
        noEmitOnError: true,
        noImplicitAny: true,
        out: 'todo.js'
      }));
  return tsResult.js.pipe(gulp.dest('.'));
});


gulp.task('debug', ['build'], function() {
  var knownOps = {
    'port': [Number, null]
  };
  var portNumber = nopt(knownOps).port || 8000;

  gulp.src('.').pipe(webserver({
    directoryListing: true,
    open: false,
    port: portNumber
  }));
});
