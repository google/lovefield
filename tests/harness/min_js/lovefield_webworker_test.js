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
goog.require('TestReporter');


function main() {
  var testReporter = new TestReporter();
  window['G_testRunner'] = testReporter;
  var header = document.getElementById('header');
  var worker = new Worker('lovefield_webworker.js');

  var onSuccess = function() {
    testReporter.finished = true;
    testReporter.success = true;
    testReporter.report = 'Tests PASSED';
    header.classList.add('pass');
    header.textContent = testReporter.getReport();
    worker.terminate();
  };

  var onError = function(errorMessage) {
    testReporter.finished = true;
    testReporter.success = false;
    testReporter.report = 'Tests FAILED: ' + errorMessage;
    header.classList.add('fail');
    header.textContent = testReporter.getReport();
    worker.terminate();
  };

  worker.addEventListener('message', function(e) {
    var message = e.data;
    message.success ? onSuccess() : onError(message.error);
  }, false);
  worker.addEventListener('error', function(e) {
    onError(e.message);
  }, false);
}


main();
