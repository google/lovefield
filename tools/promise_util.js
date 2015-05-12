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


/**
 * @typedef {{
 *   fn: function(): !IThenable,
 *   name: string
 * }}
 * @private
 */
var FunctionItem_;


/**
 * @param {!Array<!FunctionItem_>} functionItems
 * @param {!function(!FunctionItem_):void=} opt_onStart A function to call right
 *     before starting executing the next function.
 * @return {!IThenable}
 */
function sequentiallyRun(functionItems, opt_onStart) {
  var onStart = opt_onStart || null;

  return new Promise(function(resolve, reject) {
    var results = new Array(functionItems.length);
    var i = 0;

    var runner = function() {
      var functionItem = functionItems[i];
      if (onStart != null) {
        onStart(functionItem);
      }
      functionItem.fn().then(function(result) {
        results[i] = result;
        if (i < functionItems.length - 1) {
          i++;
          runner();
        } else {
          resolve(results);
        }
      }, reject);
    };
    runner();
  });
}


/** @type {!Function} */
exports.sequentiallyRun = sequentiallyRun;
