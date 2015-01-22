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
goog.provide('lf.testing.MockSchema');
goog.provide('lf.testing.MockSchema.Row');

goog.require('goog.string');
goog.require('lf.Row');
goog.require('lf.Type');
goog.require('lf.schema.BaseColumn');
goog.require('lf.schema.Constraint');
goog.require('lf.schema.Database');
goog.require('lf.schema.Index');
goog.require('lf.schema.Table');



/**
 * Dummy schema implementation to be used in tests.
 * @implements {lf.schema.Database}
 * @constructor
 */
lf.testing.MockSchema = function() {
  /** @private {!lf.schema.Table} */
  this.tableA_ = new Table_('tableA');

  /** @private {!lf.schema.Table} */
  this.tableB_ = new Table_('tableB');

  /** @private {!lf.schema.Table} */
  this.tableC_ = new TableWithNoIndex_('tableC');

  /** @private {!lf.schema.Table} */
  this.tableD_ = new Table_('tableD');

  /** @private {!lf.schema.Table} */
  this.tableE_ = new TableWithUnique_('tableE');

  /** @private {!lf.schema.Table} */
  this.tablePlusOne_ = new Table_('tablePlusOne');

  /** @type {string} */
  this.name = 'mock_schema';

  /** @type {number} */
  this.version = 1;
};


/** @override */
lf.testing.MockSchema.prototype.getTables = function() {
  var tables = [
    this.tableA_, this.tableB_, this.tableC_,
    this.tableD_, this.tableE_
  ];
  if (this.version > 1) {
    tables.push(this.tablePlusOne_);
  }
  return tables;
};


/** @override */
lf.testing.MockSchema.prototype.getName = function() {
  return this.name;
};


/** @override */
lf.testing.MockSchema.prototype.getVersion = function() {
  return this.version;
};



/**
 * Dummy row implementation to be used in tests.
 * @param {number} id
 * @param {!Object} payload
 * @extends {lf.Row}
 * @constructor
 */
lf.testing.MockSchema.Row = function(id, payload) {
  lf.testing.MockSchema.Row.base(this, 'constructor', id, payload);
};
goog.inherits(lf.testing.MockSchema.Row, lf.Row);


/** @override */
lf.testing.MockSchema.Row.prototype.keyOfIndex = function(indexName) {
  if (indexName.substr(-1) == '#') {
    return /** @type {lf.index.Index.Key} */ (this.id());
  } else if (goog.string.endsWith(indexName, 'pkId')) {
    return this.payload()['id'];
  } else if (goog.string.endsWith(indexName, 'idxName')) {
    return this.payload()['name'];
  } else if (goog.string.endsWith(indexName, 'idxBoth')) {
    return this.payload()['id'] + '_' + this.payload()['name'];
  } else if (goog.string.endsWith(indexName, 'uq_email')) {
    return this.payload()['email'];
  }
  return null;
};



/**
 * Dummy table implementation to be used in tests.
 * @extends {lf.schema.Table}
 * @constructor
 * @private
 *
 * @param {string} tableName The name of this table.
 */
var Table_ = function(tableName) {
  /** @type {!lf.schema.Column.<string>} */
  this.id = new lf.schema.BaseColumn(this, 'id', true, lf.Type.STRING);

  /** @type {!lf.schema.Column.<string>} */
  this.name = new lf.schema.BaseColumn(this, 'name', false, lf.Type.STRING);

  var indices = [
    new lf.schema.Index(tableName, 'pkId', true, [{'name': 'id'}]),
    new lf.schema.Index(tableName, 'idxName', false, [{'name': 'name'}])
  ];

  if (tableName == 'tableD') {
    indices.push(
        new lf.schema.Index(tableName, 'idxBoth', true,
            [{'name': 'id'}, {'name': 'name'}]));
  }

  Table_.base(this, 'constructor',
      tableName, [this.id, this.name], indices, false);
};
goog.inherits(Table_, lf.schema.Table);


/** @override */
Table_.prototype.createRow = function(value) {
  return new lf.testing.MockSchema.Row(
      lf.Row.getNextId(),
      {
        'id': value['id'],
        'name': value['name']
      });
};


/** @override */
Table_.prototype.deserializeRow = function(dbPayload) {
  return lf.Row.deserialize(dbPayload);
};


/** @override */
Table_.prototype.getConstraint = function() {
  return new lf.schema.Constraint(
      new lf.schema.Index(this.getName(), 'pkId', true, [{'name': 'id'}]),
      [this.id, this.name] /* notNullable */,
      [], []);
};



/**
 * Dummy table implementation to be used in tests.
 * @extends {lf.schema.Table}
 * @constructor
 * @private
 *
 * @param {string} tableName The name of this table.
 */
var TableWithNoIndex_ = function(tableName) {
  /** @type {!lf.schema.Column.<string>} */
  this.id = new lf.schema.BaseColumn(this, 'id', false, lf.Type.STRING);

  /** @type {!lf.schema.Column.<string>} */
  this.name = new lf.schema.BaseColumn(this, 'name', false, lf.Type.STRING);

  TableWithNoIndex_.base(this, 'constructor',
      tableName, [this.id, this.name], [], false);
};
goog.inherits(TableWithNoIndex_, lf.schema.Table);


/** @override */
TableWithNoIndex_.prototype.createRow = function(value) {
  return lf.Row.create({
    'id': value['id'],
    'name': value['name']
  });
};


/** @override */
TableWithNoIndex_.prototype.deserializeRow = function(dbPayload) {
  return lf.Row.deserialize(dbPayload);
};


/** @override */
TableWithNoIndex_.prototype.getConstraint = function() {
  return new lf.schema.Constraint(
      null, [this.id, this.name] /* notNullable */, [], []);
};



/**
 * Dummy table implementation with a uniqueness constraint to be used in tests.
 * @extends {lf.schema.Table}
 * @constructor
 * @private
 *
 * @param {string} tableName The name of this table.
 */
var TableWithUnique_ = function(tableName) {
  /** @type {!lf.schema.Column.<string>} */
  this.id = new lf.schema.BaseColumn(this, 'id', true, lf.Type.STRING);

  /** @type {!lf.schema.Column.<string>} */
  this.email = new lf.schema.BaseColumn(this, 'email', true, lf.Type.STRING);

  var indices = [
    new lf.schema.Index(tableName, 'pkId', true, [{'name': 'id'}]),
    new lf.schema.Index(tableName, 'uq_email', true, [{'name': 'email'}])
  ];
  TableWithUnique_.base(this, 'constructor',
      tableName, [this.id, this.email], indices, false);
};
goog.inherits(TableWithUnique_, lf.schema.Table);


/** @override */
TableWithUnique_.prototype.createRow = function(payload) {
  return new lf.testing.MockSchema.Row(lf.Row.getNextId(), payload);
};


/** @override */
TableWithUnique_.prototype.deserializeRow = function(dbPayload) {
  return lf.Row.deserialize(dbPayload);
};


/** @override */
TableWithUnique_.prototype.getConstraint = function() {
  return new lf.schema.Constraint(
      new lf.schema.Index(this.getName(), 'pkId', true, [{'name': 'id'}]),
      [this.id, this.email] /* notNullable */, [],
      [new lf.schema.Index(this.getName(), 'uq_email', true,
       [{'name': 'email'}])]);
};
