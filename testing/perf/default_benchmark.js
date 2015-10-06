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
goog.provide('lf.testing.perf.FullTableBenchmark');
goog.provide('lf.testing.perf.LoadingEmptyDbBenchmark');
goog.provide('lf.testing.perf.LoadingPopulatedDbBenchmark');
goog.provide('lf.testing.perf.PkTableBenchmark');

goog.require('goog.Promise');
goog.require('goog.net.XhrIo');
goog.require('lf.Order');
goog.require('lf.Row');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.hrSchema.EmployeeDataGenerator');
goog.require('lf.testing.perf.Benchmark');
goog.require('lf.testing.perf.TestCase');
goog.require('lf.testing.perf.hr.db');



/**
 * Class for testing perf regression and benchmark.
 * @constructor @struct
 * @implements {lf.testing.perf.Benchmark}
 * @private
 *
 * @param {boolean=} opt_volatile Use memory DB, default to false.
 */
lf.testing.perf.DefaultBenchmark_ = function(opt_volatile) {
  /** @private {!lf.Database} */
  this.db_;

  /** @private {!lf.testing.perf.hr.db.schema.Employee} */
  this.e_;

  /** @private {!Array<!lf.testing.perf.hr.db.row.Employee>} */
  this.data_;

  /** @private {boolean} */
  this.volatile_ = opt_volatile || false;
};


/** @return {!IThenable} */
lf.testing.perf.DefaultBenchmark_.prototype.init = function() {
  var options = {
    storeType: this.volatile_ ? lf.schema.DataStoreType.MEMORY :
        lf.schema.DataStoreType.INDEXED_DB
  };
  return lf.testing.perf.hr.db.connect(options).then(goog.bind(
      function(db) {
        this.db_ = db;
        this.e_ = db.getSchema().getEmployee();
      }, this));
};


/**
 * @param {boolean=} opt_skipDeletion Whether to simply close the DB connection
 *     without deleting the DB contents. Defaults to false.
 * @return {!IThenable}
 */
lf.testing.perf.DefaultBenchmark_.prototype.close = function(opt_skipDeletion) {
  var skipDeletion = opt_skipDeletion || false;
  if (skipDeletion) {
    this.db_.close();
    return goog.Promise.resolve();
  } else {
    return this.db_.delete().from(this.e_).exec().then(function() {
      this.db_.close();
    }.bind(this));
  }
};


/** @return {!IThenable} */
lf.testing.perf.DefaultBenchmark_.prototype.generateTestData = function() {
  if (goog.isDefAndNotNull(this.data_)) {
    return goog.Promise.resolve();
  }

  var generator = new lf.testing.hrSchema.EmployeeDataGenerator(
      /** @type {!lf.testing.perf.hr.db.schema.Database} */ (
          this.db_.getSchema()));
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
lf.testing.perf.DefaultBenchmark_.prototype.loadTestData = function(filename) {
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
lf.testing.perf.DefaultBenchmark_.prototype.insert = function(rowCount) {
  var data = this.data_.slice(0, rowCount);
  return this.db_.insert().into(this.e_).values(data).exec();
};


/** @return {!IThenable} */
lf.testing.perf.DefaultBenchmark_.prototype.select = function() {
  return this.db_.
      select().
      from(this.e_).
      orderBy(this.e_.id, lf.Order.ASC).
      exec();
};


/** @return {!IThenable} */
lf.testing.perf.DefaultBenchmark_.prototype.updateAll = function() {
  return this.db_.update(this.e_).set(this.e_.salary, 50000).exec();
};


/** @return {!IThenable} */
lf.testing.perf.DefaultBenchmark_.prototype.deleteAll = function() {
  return this.db_.delete().from(this.e_).exec();
};


/**
 * @param {number} rowCount
 * @return {string}
 * @private
 */
lf.testing.perf.DefaultBenchmark_.prototype.getRangeEnd_ = function(rowCount) {
  var id = 10000 + rowCount - 1;
  return ('000000' + id.toString()).slice(-6);
};


/**
 * @param {number} rowCount
 * @return {!IThenable}
 */
lf.testing.perf.DefaultBenchmark_.prototype.deletePartial = function(rowCount) {
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
lf.testing.perf.DefaultBenchmark_.prototype.insertPartial = function(rowCount) {
  var data = this.data_.slice(10000, 10000 + rowCount);
  return this.db_.insert().into(this.e_).values(data).exec();
};


/**
 * @param {number} rowCount
 * @return {!IThenable}
 */
lf.testing.perf.DefaultBenchmark_.prototype.updatePartial = function(rowCount) {
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
lf.testing.perf.DefaultBenchmark_.prototype.selectPartial = function(rowCount) {
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
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.DefaultBenchmark_.prototype.validateInsert =
    function(rowCount) {
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
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.DefaultBenchmark_.prototype.validateUpdateAll = function(
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


/** @return {!IThenable<boolean>} */
lf.testing.perf.DefaultBenchmark_.prototype.validateEmpty = function() {
  return this.select().then(function(results) {
    return results.length == 0;
  });
};


/**
 * @param {number} rowCount
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.DefaultBenchmark_.prototype.validateDeletePartial = function(
    rowCount) {
  return this.selectPartial(rowCount).then(function(rows) {
    return rows.length == 0;
  });
};


/**
 * @param {number} rowCount
 * @param {*} rows
 * @return {!IThenable<boolean>}
 */
lf.testing.perf.DefaultBenchmark_.prototype.validateUpdatePartial = function(
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


/** @override */
lf.testing.perf.DefaultBenchmark_.prototype.getTestCases = goog.abstractMethod;



/**
 * @constructor @struct
 * @extends {lf.testing.perf.DefaultBenchmark_}
 *
 * @param {boolean=} opt_volatile Use memory DB, default to false.
 */
lf.testing.perf.FullTableBenchmark = function(opt_volatile) {
  lf.testing.perf.FullTableBenchmark.base(this, 'constructor', opt_volatile);
};
goog.inherits(
    lf.testing.perf.FullTableBenchmark,
    lf.testing.perf.DefaultBenchmark_);


/** @override */
lf.testing.perf.FullTableBenchmark.prototype.getTestCases = function() {
  var testCases = [
    new lf.testing.perf.TestCase(
        'Init empty DB',
        this.init.bind(this),
        this.validateEmpty.bind(this), true),
    new lf.testing.perf.TestCase(
        'Load test data',
        this.loadTestData.bind(
            this, 'default_benchmark_mock_data_50k.json'), undefined, true)
  ];

  for (var i = 10000; i <= 50000; i += 10000) {
    testCases.push(new lf.testing.perf.TestCase(
        'Insert ' + i,
        goog.bind(this.insert, this, i),
        goog.bind(this.validateInsert, this, i)));
    testCases.push(new lf.testing.perf.TestCase(
        'Select ' + i,
        this.select.bind(this)));
    testCases.push(new lf.testing.perf.TestCase(
        'Update ' + i,
        goog.bind(this.updateAll, this, i),
        goog.bind(this.validateUpdateAll, this, i)));
    testCases.push(new lf.testing.perf.TestCase(
        'Delete ' + i,
        this.deleteAll.bind(this),
        this.validateEmpty.bind(this)));
  }

  return testCases;
};



/**
 * @constructor @struct
 * @extends {lf.testing.perf.DefaultBenchmark_}
 *
 * @param {boolean=} opt_volatile Use memory DB, default to false.
 */
lf.testing.perf.PkTableBenchmark = function(opt_volatile) {
  lf.testing.perf.PkTableBenchmark.base(this, 'constructor', opt_volatile);
};
goog.inherits(
    lf.testing.perf.PkTableBenchmark,
    lf.testing.perf.DefaultBenchmark_);


/** @override */
lf.testing.perf.PkTableBenchmark.prototype.getTestCases = function() {
  var rowCount = 30000;

  var testCases = [
    new lf.testing.perf.TestCase(
        'Init empty DB',
        this.init.bind(this),
        this.validateEmpty.bind(this), true),
    new lf.testing.perf.TestCase(
        'Load test data',
        goog.bind(
            this.loadTestData, this,
            'default_benchmark_mock_data_50k.json'), undefined, true)
  ];

  for (var i = 1; i <= 10000; i *= 10) {
    // Each repetition needs to insert 30000 rows.
    testCases.push(new lf.testing.perf.TestCase(
        'Insert ' + rowCount,
        goog.bind(this.insert, this, rowCount),
        goog.bind(this.validateInsert, this, rowCount), true));

    // Checks for partial SCUD via primary keys.
    testCases.push(new lf.testing.perf.TestCase(
        'Delete ' + i,
        goog.bind(this.deletePartial, this, i),
        goog.bind(this.validateDeletePartial, this, i)));
    testCases.push(new lf.testing.perf.TestCase(
        'Insert ' + i,
        goog.bind(this.insertPartial, this, i),
        goog.bind(this.validateInsert, this, rowCount)));
    testCases.push(new lf.testing.perf.TestCase(
        'Update ' + i,
        goog.bind(this.updatePartial, this, i)));
    testCases.push(new lf.testing.perf.TestCase(
        'Select ' + i,
        goog.bind(this.selectPartial, this, i),
        goog.bind(this.validateUpdatePartial, this, i)));

    // Resets the table.
    testCases.push(new lf.testing.perf.TestCase(
        'Delete ' + i,
        goog.bind(this.deleteAll, this),
        goog.bind(this.validateEmpty, this), true));
  }

  return testCases;
};



/**
 * @constructor @struct
 * @extends {lf.testing.perf.DefaultBenchmark_}
 *
 * @param {boolean=} opt_volatile Use memory DB, default to false.
 */
lf.testing.perf.LoadingEmptyDbBenchmark = function(opt_volatile) {
  lf.testing.perf.LoadingEmptyDbBenchmark.base(
      this, 'constructor', opt_volatile);
};
goog.inherits(
    lf.testing.perf.LoadingEmptyDbBenchmark,
    lf.testing.perf.DefaultBenchmark_);


/** @override */
lf.testing.perf.LoadingEmptyDbBenchmark.prototype.getTestCases = function() {
  return [
    new lf.testing.perf.TestCase(
        'Init empty DB',
        this.init.bind(this),
        this.validateEmpty.bind(this))
  ];
};



/**
 * @constructor @struct
 * @extends {lf.testing.perf.DefaultBenchmark_}
 *
 * @param {boolean=} opt_volatile Use memory DB, default to false.
 */
lf.testing.perf.LoadingPopulatedDbBenchmark = function(opt_volatile) {
  lf.testing.perf.LoadingPopulatedDbBenchmark.base(
      this, 'constructor', opt_volatile);
};
goog.inherits(
    lf.testing.perf.LoadingPopulatedDbBenchmark,
    lf.testing.perf.DefaultBenchmark_);


/** @override */
lf.testing.perf.LoadingPopulatedDbBenchmark.prototype.getTestCases =
    function() {
  return [
    new lf.testing.perf.TestCase(
        'Init populated DB', this.init.bind(this))
  ];
};
