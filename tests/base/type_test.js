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
goog.setTestOnly();
goog.require('goog.object');
goog.require('goog.testing.jsunit');
goog.require('lf.Type');
goog.require('lf.type');


/**
 * This test is used to make sure all supported browsers not complaining about
 * default values.
 */
function testDefaultValues() {
  var clone = goog.object.getValues(lf.Type).map(function(type) {
    return lf.type.DEFAULT_VALUES[type];
  });
  assertTrue(clone.length > 0);
}
