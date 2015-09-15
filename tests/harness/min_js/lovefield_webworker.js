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

var goog = {
  require: function() {},
  provide: function() {}
};

importScripts('api_tester.js');
importScripts('../../../dist/lovefield.min.js');

function main() {
  var tester = new ApiTester();
  tester.run().then(function() {
    postMessage({success: true});
  }, function(e) {
    postMessage({success: false, error: e.message});
  });

}

main();
