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
 *
 * @fileoverview Simulate one scenario of real-world usage.
 */
goog.setTestOnly();
goog.provide('lf.testing.perf.ScenarioBenchmark');

goog.require('goog.Promise');
goog.require('lf.Type');
goog.require('lf.bind');
goog.require('lf.schema');
goog.require('lf.schema.DataStoreType');
goog.require('lf.testing.perf.Benchmark');
goog.require('lf.testing.perf.TestCase');



/**
 * @constructor @struct @final
 * @implements {lf.testing.perf.Benchmark}
 */
lf.testing.perf.ScenarioBenchmark = function() {
  /** @private {!lf.Database} */
  this.db_;

  /** @private {!lf.schema.Table} */
  this.brand_;

  /** @private @const {number} */
  this.REPETITIONS_ = 1000;
};


/** @return {!IThenable} */
lf.testing.perf.ScenarioBenchmark.prototype.init = function() {
  var schemaBuilder = lf.schema.create('scenario0', 1);
  schemaBuilder.createTable('Brand').
      addColumn('rowId', lf.Type.INTEGER).
      addColumn('brandId', lf.Type.INTEGER).
      addPrimaryKey(['rowId']).
      addIndex('idxBrandId', ['brandId']);
  return schemaBuilder.connect({
    storeType: lf.schema.DataStoreType.MEMORY
  }).then(goog.bind(function(db) {
    this.db_ = db;
    this.brand_ = db.getSchema().table('Brand');
  }, this));
};


/** @return {!IThenable} */
lf.testing.perf.ScenarioBenchmark.prototype.tearDown = function() {
  return this.db_.delete().from(this.brand_).exec();
};


/**
 * @return {!Array<!lf.Row>}
 * @private
 */
lf.testing.perf.ScenarioBenchmark.prototype.createRows_ = function() {
  var rows = [];
  for (var i = 0; i < this.REPETITIONS_; ++i) {
    rows.push(this.brand_.createRow({
      rowId: i,
      brandId: i
    }));
  }
  return rows;
};


/** @return {!IThenable} */
lf.testing.perf.ScenarioBenchmark.prototype.insertTxAttach = function() {
  var resolver = goog.Promise.withResolver();
  var tx = this.db_.createTransaction();
  var rows = this.createRows_();
  var fn = goog.bind(function() {
    if (rows.length == 0) {
      return goog.Promise.resolve();
    }
    var row = rows.shift();
    return tx.attach(
        this.db_.insert().into(this.brand_).values([row])).then(fn);
  }, this);

  tx.begin([this.brand_]).then(function() {
    return fn();
  }).then(function() {
    return tx.commit();
  }).then(function() {
    resolver.resolve();
  });

  return resolver.promise;
};


/** @return {!IThenable} */
lf.testing.perf.ScenarioBenchmark.prototype.select = function() {
  var queries = [];
  for (var i = 0; i < this.REPETITIONS_; ++i) {
    queries.push(
        this.db_.select(this.brand_['rowId']).
            from(this.brand_).
            where(this.brand_['brandId'].eq(i)).exec());
  }
  return goog.Promise.all(queries);
};


/** @return {!IThenable} */
lf.testing.perf.ScenarioBenchmark.prototype.selectBinding = function() {
  var q = this.db_.select(this.brand_['rowId']).
      from(this.brand_).
      where(this.brand_['brandId'].eq(lf.bind(0)));
  var queries = [];
  for (var i = 0; i < this.REPETITIONS_; ++i) {
    queries.push(q.bind([i]).exec());
  }
  return goog.Promise.all(queries);
};


/** @override */
lf.testing.perf.ScenarioBenchmark.prototype.getTestCases = function() {
  return [
    new lf.testing.perf.TestCase(
        'Insert via Tx Attach', this.insertTxAttach.bind(this)),
    new lf.testing.perf.TestCase('Select',
        this.select.bind(this)),
    new lf.testing.perf.TestCase(
        'Select Binding', this.selectBinding.bind(this)),
    new lf.testing.perf.TestCase(
        'Teardown', this.tearDown.bind(this), undefined, true)
  ];
};
