/**
 * @license
 * Copyright 2014 The Lovefield Project Authors. All Rights Reserved.
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
goog.require('goog.testing.jsunit');
goog.require('hr.db');
goog.require('lf.Capability');
goog.require('lf.testing.hrSchema.getSchemaBuilder');
goog.require('lf.testing.util');


/** @type {!lf.Capability} */
var capability;


function setUpPage() {
  capability = lf.Capability.get();
}


function testConnectTwiceThrows_SchemaBuilder() {
  return lf.testing.util.assertThrowsError(
      113 /* Connection operation was already in progress. */,
      function() {
        var schemaBuilder = lf.testing.hrSchema.getSchemaBuilder();
        schemaBuilder.connect({storeType: lf.schema.DataStoreType.MEMORY});
        schemaBuilder.connect({storeType: lf.schema.DataStoreType.MEMORY});
      });
}


function testConnectTwiceThrows_SPAC() {
  return lf.testing.util.assertThrowsError(
      113 /* Connection operation was already in progress. */,
      function() {
        hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY});
        hr.db.connect({storeType: lf.schema.DataStoreType.MEMORY});
      });
}


function testClose() {
  if (!capability.indexedDb) {
    return;
  }

  return hr.db.connect().then(function(database) {
    // Test that all queries after closing are throwing.
    database.close();
    var thrower = function() {
      database.select().from(database.getSchema().getEmployee());
    };
    assertThrows(thrower);

    // Test that db can be opened again.
    return hr.db.connect();
  }).then(function(database) {
    assertNotNull(database);
    database.close();
  });
}
