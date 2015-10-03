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
goog.provide('lf.testing.backstore.ScudTester');

goog.require('lf.Row');
goog.require('lf.TransactionType');
goog.require('lf.backstore.TableType');
goog.require('lf.cache.Journal');
goog.require('lf.service');
goog.require('lf.structs.set');



/**
 * Helper class for performing SCUD tests on a given database instance.
 * @constructor @struct
 *
 * @param {!lf.BackStore} db
 * @param {!lf.Global} global
 * @param {function():!lf.BackStore=} opt_reload Reload DB before verification.
 */
lf.testing.backstore.ScudTester = function(db, global, opt_reload) {
  /** @private {!lf.BackStore} */
  this.db_ = db;

  /** @private {!lf.Global} */
  this.global_ = global;

  var schema = /** @type {!lf.schema.Database} */ (
      global.getService(lf.service.SCHEMA));

  /** @private {!lf.schema.Table} */
  this.tableSchema_ = schema.tables()[0];

  /** @private {!lf.cache.Cache} */
  this.cache_ = global.getService(lf.service.CACHE);

  /** @private {?function():!lf.BackStore} */
  this.reload_ = opt_reload || null;
};


/**
 * @param {!Array<!lf.Row>} rows
 * @return {!IThenable}
 * @private
 */
lf.testing.backstore.ScudTester.prototype.insert_ = function(rows) {
  var tx = this.db_.createTx(
      lf.TransactionType.READ_WRITE,
      [this.tableSchema_],
      new lf.cache.Journal(
          this.global_, lf.structs.set.create([this.tableSchema_])));
  var store = /** @type {!lf.Table} */ (tx.getTable(
      this.tableSchema_.getName(),
      this.tableSchema_.deserializeRow.bind(this.tableSchema_),
      lf.backstore.TableType.DATA));

  store.put(rows);
  return tx.commit();
};


/**
 * @param {!Array<number>} rowIds
 * @return {!IThenable}
 * @private
 */
lf.testing.backstore.ScudTester.prototype.remove_ = function(rowIds) {
  var tx = this.db_.createTx(
      lf.TransactionType.READ_WRITE,
      [this.tableSchema_],
      new lf.cache.Journal(
          this.global_, lf.structs.set.create([this.tableSchema_])));
  var store = /** @type {!lf.Table} */ (tx.getTable(
      this.tableSchema_.getName(),
      this.tableSchema_.deserializeRow.bind(this.tableSchema_),
      lf.backstore.TableType.DATA));

  store.remove(rowIds);
  return tx.commit();
};


/**
 * @return {!IThenable}
 * @private
 */
lf.testing.backstore.ScudTester.prototype.removeAll_ = function() {
  return this.remove_([]);
};


/**
 * @param {!Array<number>} rowIds
 * @return {!IThenable<!Array<!lf.Row>>}
 * @private
 */
lf.testing.backstore.ScudTester.prototype.select_ = function(rowIds) {
  var tx = this.db_.createTx(lf.TransactionType.READ_ONLY, [this.tableSchema_]);
  var store = /** @type {!lf.Table} */ (tx.getTable(
      this.tableSchema_.getName(),
      this.tableSchema_.deserializeRow.bind(this.tableSchema_),
      lf.backstore.TableType.DATA));

  var promise = store.get(rowIds);
  tx.commit();
  return promise;
};


/**
 * @return {!IThenable<!Array<!lf.Row>>}
 * @private
 */
lf.testing.backstore.ScudTester.prototype.selectAll_ = function() {
  return this.select_([]);
};


/**
 * Asserts that only the given rows exists in the database.
 * @param {!Array<lf.Row>} rows
 * @return {!IThenable}
 * @private
 */
lf.testing.backstore.ScudTester.prototype.assertOnlyRows_ = function(rows) {
  if (!goog.isNull(this.reload_)) {
    this.db_ = this.reload_();
  }
  return this.selectAll_().then(function(results) {
    assertEquals(rows.length, results.length);
    rows.forEach(function(row, index) {
      var retrievedRow = results[index];
      assertEquals(row.id(), retrievedRow.id());
      assertObjectEquals(row.payload(), retrievedRow.payload());
    });
  });
};


/** @return {!IThenable} */
lf.testing.backstore.ScudTester.prototype.run = function() {
  /** @const {!Object} */
  var CONTENTS = {'id': 'hello', 'name': 'world'};
  /** @const {!Object} */
  var CONTENTS2 = {'id': 'hello2', 'name': 'world2'};

  var row1 = lf.Row.create(CONTENTS);
  var row2 = lf.Row.create(CONTENTS);
  var row3 = new lf.Row(row1.id(), CONTENTS2);

  return this.db_.init().then(goog.bind(function() {
    return this.insert_([row1]);
  }, this)).then(goog.bind(function() {
    return this.assertOnlyRows_([row1]);
  }, this)).then(goog.bind(function(results) {
    // Insert row2, update row1.
    return this.insert_([row2, row3]);
  }, this)).then(goog.bind(function() {
    return this.assertOnlyRows_([row3, row2]);
  }, this)).then(goog.bind(function(results) {
    // Update cache, otherwise the bundled operation will fail.
    this.cache_.setMany(this.tableSchema_.getName(), [row2, row3]);

    // Remove row1.
    return this.remove_([row1.id()]);
  }, this)).then(goog.bind(function() {
    return this.assertOnlyRows_([row2]);
  }, this)).then(goog.bind(function(results) {
    // Remove all.
    return this.removeAll_();
  }, this)).then(goog.bind(function() {
    return this.assertOnlyRows_([]);
  }, this));
};
