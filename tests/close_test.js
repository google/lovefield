/**
 * @license
 * Copyright 2014 Google Inc. All Rights Reserved.
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
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('hr.db');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall('CloseTest');


function testClose() {
  asyncTestCase.waitForAsync('testClose');
  hr.db.getInstance().then(function(database) {
    // Test that all queries after closing are throwing.
    database.close();
    var thrower = function() {
      var query = database.select().from(database.getSchema().getEmployee());
    };
    assertThrows(thrower);

    // Test that db can be opened again.
    return hr.db.getInstance();
  }, fail).then(function(database) {
    assertNotNull(database);
    asyncTestCase.continueTesting();
  }, fail);
}
