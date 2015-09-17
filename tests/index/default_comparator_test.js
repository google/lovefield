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
goog.require('goog.testing.jsunit');
goog.require('lf.index.ComparatorFactory');
goog.require('lf.index.MultiKeyComparator');
goog.require('lf.index.SimpleComparator');
goog.require('lf.testing.hrSchema.getSchemaBuilder');


function testFactory() {
  var schema = lf.testing.hrSchema.getSchemaBuilder().getSchema();

  var maxSalary = schema.table('Job').getIndices().filter(function(index) {
    return index.getNormalizedName() == 'Job.idx_maxSalary';
  })[0];
  assertTrue(lf.index.ComparatorFactory.create(maxSalary) instanceof
      lf.index.SimpleComparator);

  var uqConstraint = schema.table('DummyTable').getIndices().filter(
      function(index) {
        return index.getNormalizedName() == 'DummyTable.uq_constraint';
      })[0];
  assertTrue(lf.index.ComparatorFactory.create(uqConstraint) instanceof
      lf.index.MultiKeyComparator);
}
