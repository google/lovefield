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
goog.provide('lf.testing.backstore.MockSchema');

goog.require('lf.Order');
goog.require('lf.Type');
goog.require('lf.schema.Database');
goog.require('lf.schema.Info');
goog.require('lf.schema.TableBuilder');



/**
 * Dummy schema implementation to be used in tests.
 * @implements {lf.schema.Database}
 * @constructor
 */
lf.testing.backstore.MockSchema = function() {

  var createTable = function(tableName) {
    return new lf.schema.TableBuilder(tableName).
        addColumn('id', lf.Type.STRING).
        addColumn('name', lf.Type.STRING).
        addPrimaryKey(['id']).
        addIndex('idxName', [{'name': 'name', 'order': lf.Order.DESC}]).
        getSchema();
  };

  /** @private {!lf.schema.Table} */
  this.tableA_ = createTable('tableA');

  /** @private {!lf.schema.Table} */
  this.tableB_ = createTable('tableB');

  /** @private {!lf.schema.Table} */
  this.tablePlusOne_ = createTable('tablePlusOne');

  /** @private {string} */
  this.name_ = 'mock_schema';

  /** @private {number} */
  this.version_ = 1;

  /** @private {boolean} */
  this.simulateDropTableA_ = false;

  /** @private {!lf.schema.Database.Pragma} */
  this.pragma_ = {
    enableBundledMode: false
  };

  /** @private {!lf.schema.Info} */
  this.info_;
};


/** @override */
lf.testing.backstore.MockSchema.prototype.tables = function() {
  var tables = [
    this.tableB_
  ];

  if (!this.simulateDropTableA_) {
    tables.unshift(this.tableA_);
  }
  if (this.version_ > 1) {
    tables.push(this.tablePlusOne_);
  }
  return tables;
};


/** @override */
lf.testing.backstore.MockSchema.prototype.name = function() {
  return this.name_;
};


/** @override */
lf.testing.backstore.MockSchema.prototype.version = function() {
  return this.version_;
};


/** @override */
lf.testing.backstore.MockSchema.prototype.table = function(tableName) {
  var tables = {
    'tableB': this.tableB_
  };
  if (!this.simulateDropTableA_) {
    tables['tableA'] = this.tableA_;
  }
  if (this.version_ > 1) {
    tables['tablePlusOne'] = this.tablePlusOne_;
  }
  return tables[tableName] || null;
};


/** @override */
lf.testing.backstore.MockSchema.prototype.pragma = function() {
  return this.pragma_;
};


/** @param {string} name */
lf.testing.backstore.MockSchema.prototype.setName = function(name) {
  this.name_ = name;
};


/** @param {number} version */
lf.testing.backstore.MockSchema.prototype.setVersion = function(version) {
  this.version_ = version;
};


/** @param {boolean} mode */
lf.testing.backstore.MockSchema.prototype.setBundledMode = function(mode) {
  this.pragma_.enableBundledMode = mode;
};


/** @param {boolean} mode */
lf.testing.backstore.MockSchema.prototype.setDropTableA = function(mode) {
  this.simulateDropTableA_ = mode;
};


/** @override */
lf.testing.backstore.MockSchema.prototype.info = function() {
  if (!this.info_) {
    this.info_ = new lf.schema.Info(this);
  }
  return this.info_;
};
