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
goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('goog.userAgent.product');
goog.require('hr.bdb');
goog.require('hr.db');
goog.require('lf.Capability');
goog.require('lf.Global');
goog.require('lf.schema.DataStoreType');
goog.require('lf.service.ServiceId');
goog.require('lf.testing.EndToEndTester');
goog.require('lf.testing.hrSchema.getSchemaBuilder');


/** @type {!goog.testing.AsyncTestCase} */
var asyncTestCase = goog.testing.AsyncTestCase.createAndInstall(
    'EndToEndTest');


/** @type {number} */
asyncTestCase.stepTimeout = 30 * 1000;  // 30 seconds


/** @type {!lf.Capability} */
var capability;


/** @type {!goog.testing.PropertyReplacer} */
var stub;


function setUpPage() {
  capability = lf.Capability.get();
  stub = new goog.testing.PropertyReplacer();
}

function tearDown() {
  stub.reset();
}

function testEndToEnd_StaticSchema() {
  asyncTestCase.waitForAsync('testEndToEnd_StaticSchema');
  var tester = new lf.testing.EndToEndTester(
      hr.db.getGlobal.bind(hr.db),
      hr.db.connect.bind(hr.db, {
        storeType: lf.schema.DataStoreType.MEMORY
      }));
  tester.run().then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}

function testEndToEnd_StaticSchemaBundled() {
  if (!capability.indexedDb || goog.userAgent.product.IE) {
    // Due to sheer amount of data in this test, IE will prompt for permission,
    // which blocks test bot execution. As a result, it is skipped from this
    // test for now.
    return;
  }

  asyncTestCase.waitForAsync('testEndToEnd_StaticSchemaBundled');
  var dbGlobal = new lf.Global();
  var globalFn = function() {
    return dbGlobal;
  };
  var connectFn = function() {
    stub.reset();
    var dbName = 'hrbdb' + goog.now();
    stub.replace(
        goog.getObjectByName('hr.bdb.schema.Database.prototype'),
        'name',
        function() { return dbName; });
    stub.replace(
        goog.getObjectByName('hr.bdb'),
        'getGlobal',
        function() {
          var serviceId = new lf.service.ServiceId(dbName);
          var global = lf.Global.get();
          if (!global.isRegistered(serviceId)) {
            global.registerService(serviceId, dbGlobal);
          }
          return dbGlobal;
        });
    return hr.bdb.connect();
  };

  var tester = new lf.testing.EndToEndTester(globalFn, connectFn);
  tester.run().then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}

function testEndToEnd_DynamicSchema() {
  asyncTestCase.waitForAsync('testEndToEnd_DynamicSchema');
  var builder = lf.testing.hrSchema.getSchemaBuilder();
  var tester = new lf.testing.EndToEndTester(
      builder.getGlobal.bind(builder),
      builder.connect.bind(builder, {
        storeType: lf.schema.DataStoreType.MEMORY
      }));
  tester.run().then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}

function testEndToEnd_DynamicSchemaBundled() {
  if (!capability.indexedDb || goog.userAgent.product.IE) {
    return;
  }

  asyncTestCase.waitForAsync('testEndToEnd_DynamicSchemaBundled');
  /** @type {!lf.schema.Builder} */
  var builder;
  var globalFn = function() {
    return builder.getGlobal();
  };
  var connectFn = function() {
    builder = lf.testing.hrSchema.getSchemaBuilder();
    builder.setPragma(/** @type {!lf.schema.Database.Pragma} */ (
        {enableBundledMode: true}));
    return builder.connect();
  };

  var tester = new lf.testing.EndToEndTester(globalFn, connectFn);
  tester.run().then(function() {
    asyncTestCase.continueTesting();
  }, fail);
}
