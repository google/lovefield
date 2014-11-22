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
goog.provide('lf.testing.perf.DefaultBenchmark');

goog.require('goog.Promise');
goog.require('goog.net.XhrIo');
goog.require('hr.db');
goog.require('lf.Row');
goog.require('lf.testing.hrSchema.EmployeeDataGenerator');



/**
 * Class for testing perf regression and benchmark.
 * @constructor
 * @struct
 * @final
 */
lf.testing.perf.DefaultBenchmark = function() {
  /** @private {!hr.db.Database} */
  this.db_;

  /** @private {!hr.db.schema.Employee} */
  this.e_;

  /** @private {!Array.<!hr.db.row.Employee>} */
  this.data_;
};


/** @return {!IThenable} */
lf.testing.perf.DefaultBenchmark.prototype.init = function() {
  return hr.db.getInstance().then(goog.bind(function(db) {
    this.db_ = db;
    this.e_ = db.getSchema().getEmployee();
  }, this));
};


/** @return {!IThenable} */
lf.testing.perf.DefaultBenchmark.prototype.close = function() {
  return this.db_.delete().from(this.e_).exec().then(goog.bind(function() {
    return this.db_.close();
  }, this));
};


/** @return {!IThenable} */
lf.testing.perf.DefaultBenchmark.prototype.generateTestData = function() {
  if (goog.isDefAndNotNull(this.data_)) {
    return goog.Promise.resolve();
  }

  var generator = new lf.testing.hrSchema.EmployeeDataGenerator(
      /** @type {!hr.db.schema.Database} */ (this.db_.getSchema()));
  this.data_ = generator.generate(50000);
  this.data_.forEach(function(row, i) {
    var id = ('000000' + i.toString()).slice(-6);
    row.setId(id);
  });

  for (var i = 10000; i < 20000; ++i) {
    this.data_[i].setSalary(30000 + i);
  }
  return goog.Promise.resolve();
};


/**
 * @param {string} filename The filename of the JSON file holding the raw data.
 * @return {!IThenable}
 */
lf.testing.perf.DefaultBenchmark.prototype.loadTestData = function(filename) {
  var employeeSchema = this.e_;

  return new goog.Promise(goog.bind(function(resolve, reject) {
    goog.net.XhrIo.send(filename, goog.bind(function(e) {
      var xhr = e.target;
      var rawData = JSON.parse(xhr.getResponseText());
      this.data_ = rawData.map(function(obj) {
        return employeeSchema.deserializeRow({
          'id': lf.Row.getNextId(),
          'value': obj
        });
      });
      resolve();
    }, this));
  }, this));
};


/**
 * @param {number} rowCount
 * @return {!IThenable}
 */
lf.testing.perf.DefaultBenchmark.prototype.insert = function(rowCount) {
  var data = this.data_.slice(0, rowCount);
  return this.db_.insert().into(this.e_).values(data).exec();
};


/** @return {!IThenable} */
lf.testing.perf.DefaultBenchmark.prototype.select = function() {
  return this.db_.select().from(this.e_).exec();
};


/** @return {!IThenable} */
lf.testing.perf.DefaultBenchmark.prototype.updateAll = function() {
  return this.db_.update(this.e_).set(this.e_.salary, 50000).exec();
};


/** @return {!IThenable} */
lf.testing.perf.DefaultBenchmark.prototype.deleteAll = function() {
  return this.db_.delete().from(this.e_).exec();
};


/**
 * @param {number} rowCount
 * @return {string}
 * @private
 */
lf.testing.perf.DefaultBenchmark.prototype.getRangeEnd_ = function(rowCount) {
  var id = 10000 + rowCount - 1;
  return ('000000' + id.toString()).slice(-6);
};


/**
 * @param {number} rowCount
 * @return {!IThenable}
 */
lf.testing.perf.DefaultBenchmark.prototype.deletePartial = function(rowCount) {
  if (rowCount == 1) {
    return this.db_.
        delete().from(this.e_).where(this.e_.id.eq('010000')).exec();
  } else {
    return this.db_.
        delete().
        from(this.e_).
        where(this.e_.id.between('010000', this.getRangeEnd_(rowCount))).
        exec();
  }
};


/**
 * @param {number} rowCount
 * @return {!IThenable}
 */
lf.testing.perf.DefaultBenchmark.prototype.insertPartial = function(rowCount) {
  var data = this.data_.slice(10000, 10000 + rowCount);
  return this.db_.insert().into(this.e_).values(data).exec();
};


/**
 * @param {number} rowCount
 * @return {!IThenable}
 */
lf.testing.perf.DefaultBenchmark.prototype.updatePartial = function(rowCount) {
  if (rowCount == 1) {
    return this.db_.
        update(this.e_).set(this.e_.salary, 50000).where(
            this.e_.id.eq('010000')).exec();
  } else {
    return this.db_.
        update(this.e_).set(this.e_.salary, 50000).where(
            this.e_.id.between('010000', this.getRangeEnd_(rowCount))).exec();
  }
};


/**
 * @param {number} rowCount
 * @return {!IThenable}
 */
lf.testing.perf.DefaultBenchmark.prototype.selectPartial = function(rowCount) {
  if (rowCount == 1) {
    return this.db_.
        select().from(this.e_).where(this.e_.id.eq('010000')).exec();
  } else {
    return this.db_.
        select().from(this.e_).where(
            this.e_.id.between('010000', this.getRangeEnd_(rowCount))).exec();
  }
};


/**
 * @param {number} rowCount
 * @return {!IThenable.<boolean>}
 */
lf.testing.perf.DefaultBenchmark.prototype.validateInsert = function(rowCount) {
  return this.select().then(goog.bind(function(results) {
    if (results.length != rowCount) {
      return false;
    }

    var data = this.data_.slice(0, rowCount);
    return data.every(function(expected, index) {
      var row = results[index];
      return expected.getId() == row['id'] &&
          expected.getFirstName() == row['firstName'] &&
          expected.getLastName() == row['lastName'] &&
          expected.getSalary() == row['salary'];
    });
  }, this));
};


/**
 * @param {number} rowCount
 * @return {!IThenable.<boolean>}
 */
lf.testing.perf.DefaultBenchmark.prototype.validateUpdateAll = function(
    rowCount) {
  return this.select().then(goog.bind(function(results) {
    if (results.length != rowCount) {
      return false;
    }

    var data = this.data_.slice(0, rowCount);
    return data.every(function(expected, index) {
      var row = results[index];
      return expected.getId() == row['id'] &&
          expected.getFirstName() == row['firstName'] &&
          expected.getLastName() == row['lastName'] &&
          50000 == row['salary'];
    });
  }, this));
};


/** @return {!IThenable.<boolean>} */
lf.testing.perf.DefaultBenchmark.prototype.validateEmpty = function() {
  return this.select().then(function(results) {
    return results.length == 0;
  });
};


/**
 * @param {number} rowCount
 * @return {!IThenable.<boolean>}
 */
lf.testing.perf.DefaultBenchmark.prototype.validateDeletePartial = function(
    rowCount) {
  return this.selectPartial(rowCount).then(function(rows) {
    return rows.length == 0;
  });
};


/**
 * @param {number} rowCount
 * @param {*} rows
 * @return {!IThenable.<boolean>}
 */
lf.testing.perf.DefaultBenchmark.prototype.validateUpdatePartial = function(
    rowCount, rows) {
  if (rowCount != rows.length) {
    return goog.Promise.resolve(false);
  }

  var data = this.data_.slice(10000, 10000 + rowCount);
  var validated = data.every(function(expected, index) {
    var row = rows[index];
    return expected.getId() == row['id'] &&
        expected.getFirstName() == row['firstName'] &&
        expected.getLastName() == row['lastName'] &&
        50000 == row['salary'];
  });
  return goog.Promise.resolve(validated);
};
