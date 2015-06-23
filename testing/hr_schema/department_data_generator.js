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
goog.provide('lf.testing.hrSchema.DepartmentDataGenerator');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('lf.testing.hrSchema.samples');



/**
 * Generates sample data for the Department table.
 * @constructor
 * @struct
 *
 * @param {!lf.schema.Database} schema
 */
lf.testing.hrSchema.DepartmentDataGenerator = function(schema) {
  /** @private {!lf.schema.Database} */
  this.schema_ = schema;

  /** @private {!Array<string>} */
  this.names_ = lf.testing.hrSchema.samples.DEPARTMENT_NAMES.slice();
  goog.array.shuffle(this.names_);
};


/**
 * @param {number} count The number of rows to generate.
 * @return {!Array<!Object>}
 * @private
 */
lf.testing.hrSchema.DepartmentDataGenerator.prototype.generateRaw_ =
    function(count) {
  goog.asserts.assert(
      count <= this.names_.length,
      'count can be at most ' + this.names_.length);

  var departments = new Array(count);
  for (var i = 0; i < count; i++) {
    departments[i] = {
      id: 'departmentId' + i.toString(),
      name: this.names_.shift(),
      managerId: 'managerId',
      locationId: 'locationId'
    };
  }

  return departments;
};


/**
 * @param {number} count The number of rows to generate.
 * @return {!Array<!Object>}
 */
lf.testing.hrSchema.DepartmentDataGenerator.prototype.generate =
    function(count) {
  var rawData = this.generateRaw_(count);

  return rawData.map(function(object) {
    return this.schema_.table('Department').createRow(object);
  }, this);
};
