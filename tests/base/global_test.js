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
goog.require('lf.Global');
goog.require('lf.service');
goog.require('lf.service.ServiceId');


/** @type {!lf.Global} */
var global;


function setUpPage() {
  global = lf.Global.get();
}


function tearDown() {
  global.clear();
}


function testGlobalGet() {
  var global2 = lf.Global.get();
  assertEquals(global, global2);
}


function testGetService() {
  var serviceId = new lf.service.ServiceId('whatever');
  var service = {};
  global.registerService(serviceId, service);
  var serviceFromGlobal = global.getService(serviceId);
  assertEquals(service, serviceFromGlobal);
  assertFalse(global.isRegistered(lf.service.CACHE));

  var thrower = function() {
    global.getService(lf.service.CACHE);
  };
  assertThrows(thrower);
}


function testClear() {
  var serviceId = new lf.service.ServiceId('whatever');
  var service = {};
  global.registerService(serviceId, service);

  global.clear();
  assertFalse(global.isRegistered(serviceId));
}
