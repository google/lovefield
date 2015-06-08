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
var path = require('path');
var ts = require('gulp-typescript');
var fs = require('fs-extra');
var webserver = require('gulp-webserver');


// TODO(dpapad): Remove this target once
// https://github.com/borisyankov/DefinitelyTyped/pull/4558 has been merged and
// grab lovefield externs via tsd instead.
gulp.task('copy_lovefield_definitions', function () {
  var lovefieldTypingsDir = 'typings/lovefield';
  if (!fs.existsSync(lovefieldTypingsDir)) {
    fs.mkdirpSync(lovefieldTypingsDir);
  }

  var fileToCopy = 'bower_components/lovefield/dist/lovefield.d.ts';
  fs.copySync(
      fileToCopy, path.join(lovefieldTypingsDir, path.basename(fileToCopy)));
});


gulp.task('build', ['copy_lovefield_definitions'], function () {
  var tsResult = gulp.src('todo.ts')
    .pipe(ts({
        noEmitOnError: true,
        noImplicitAny: true,
        out: 'todo.js'
      }));
  return tsResult.js.pipe(gulp.dest('.'));
});


gulp.task('webserver', ['build'], function() {
  gulp.src('.').pipe(webserver({
    directoryListing: true,
    open: false
  }));
});
