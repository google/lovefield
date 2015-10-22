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
var zip = require('gulp-zip');
var glob = require('glob');


gulp.task('zip', function() {
  return gulp.src([
    'devtools.html',
    'devtools.js',
    'manifest.json',
    'node_modules/jquery/dist/jquery.min.js',
    'panel.css',
    'panel.html',
    'panel.js',
    'resources/*'
  ], {base: '.'}).pipe(zip('lovefield_inspector.zip')).
      pipe(gulp.dest('.'));
});
