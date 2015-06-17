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
goog.provide('lf.testing');

goog.require('goog.Promise');
goog.require('lf.Exception');
goog.require('lf.proc.Transaction');
goog.require('lf.query.BaseBuilder');


/**
 * Forces every subsequent query to be rejected (for testing purposes).
 * @param {!goog.testing.PropertyReplacer} propertyReplacer
 */
lf.testing.simulateErrors = function(propertyReplacer) {
  var rejectFn = function() {
    // 999: Simulated error.
    return goog.Promise.reject(new lf.Exception(999));
  };

  propertyReplacer.replace(lf.query.BaseBuilder.prototype, 'exec', rejectFn);
  propertyReplacer.replace(lf.proc.Transaction.prototype, 'exec', rejectFn);
  propertyReplacer.replace(lf.proc.Transaction.prototype, 'attach', rejectFn);
  propertyReplacer.replace(lf.proc.Transaction.prototype, 'commit', rejectFn);
};
