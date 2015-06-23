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
goog.provide('lf.testing.hrSchema.JobDataGenerator');

goog.require('goog.array');
goog.require('goog.asserts');
goog.require('lf.testing.hrSchema.samples');



/**
 * Generates sample data for the Job table.
 * @constructor
 * @struct
 *
 * @param {!lf.schema.Database} schema
 */
lf.testing.hrSchema.JobDataGenerator = function(schema) {
  /** @private {!lf.schema.Database} */
  this.schema_ = schema;

  /** @private {!Array<string>} */
  this.titles_ = lf.testing.hrSchema.samples.JOB_TITLES.slice();
  goog.array.shuffle(this.titles_);
};


/**
 * A pool of possible values for the minSalary/maxSalary fields.
 * @private {!Array<number>}
 */
lf.testing.hrSchema.JobDataGenerator.SALARY_POOL_ =
    [100000, 200000, 300000, 400000, 500000, 600000];


/**
 * @param {number} count The number of rows to generate.
 * @return {!Array<!Object>}
 * @private
 */
lf.testing.hrSchema.JobDataGenerator.prototype.generateRaw_ = function(count) {
  goog.asserts.assert(
      count <= this.titles_.length,
      'count can be at most ' + this.titles_.length);

  var jobs = new Array(count);
  for (var i = 0; i < count; i++) {
    var salaries = this.genSalaries_();
    jobs[i] = {
      id: 'jobId' + i.toString(),
      title: this.titles_.shift(),
      minSalary: salaries[0],
      maxSalary: salaries[1]
    };
  }

  return jobs;
};


/**
 * @param {number} count The number of rows to generate.
 * @return {!Array<!lf.Row>}
 */
lf.testing.hrSchema.JobDataGenerator.prototype.generate = function(count) {
  var rawData = this.generateRaw_(count);

  return rawData.map(function(object) {
    return this.schema_.table('Job').createRow(object);
  }, this);
};


/**
 * @return {!Array<number>}
 * @private
 */
lf.testing.hrSchema.JobDataGenerator.prototype.genSalaries_ = function() {
  var salary1Index = Math.floor(Math.random() *
      lf.testing.hrSchema.JobDataGenerator.SALARY_POOL_.length);
  var salary2Index = Math.floor(Math.random() *
      lf.testing.hrSchema.JobDataGenerator.SALARY_POOL_.length);
  return [
    lf.testing.hrSchema.JobDataGenerator.SALARY_POOL_[salary1Index],
    lf.testing.hrSchema.JobDataGenerator.SALARY_POOL_[salary2Index]
  ].sort(function(a, b) { return a - b;});
};
