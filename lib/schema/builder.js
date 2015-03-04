/**
 * @license
 * Copyright 2015 Google Inc. All Rights Reserved.
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
goog.provide('lf.schema');
goog.provide('lf.schema.Builder');

goog.require('goog.structs.Map');
goog.require('lf.Exception');
goog.require('lf.Global');
goog.require('lf.proc.Database');
goog.require('lf.schema.DataStoreType');
goog.require('lf.schema.Database');
goog.require('lf.schema.TableBuilder');
goog.require('lf.service');
goog.require('lf.service.ServiceId');



/**
 * Dynamic DB builder.
 * @constructor
 *
 * @param {string} dbName
 * @param {number} dbVersion
 */
lf.schema.Builder = function(dbName, dbVersion) {
  /** @private {!lf.schema.DatabaseSchema_} */
  this.schema_ = new lf.schema.DatabaseSchema_(dbName, dbVersion);

  /** @private {!goog.structs.Map.<string, !lf.schema.TableBuilder>} */
  this.tableBuilders_ = new goog.structs.Map();

  /** @private {boolean} */
  this.finalized_ = false;
};


/** @private */
lf.schema.Builder.prototype.finalize_ = function() {
  if (!this.finalized_) {
    this.tableBuilders_.getKeys().forEach(function(tableName) {
      var builder = this.tableBuilders_.get(tableName);
      this.schema_.setTable(builder.getSchema());
    }, this);
    this.tableBuilders_.clear();
    this.finalized_ = true;
  }
};


/** @export @return {!lf.schema.Database} */
lf.schema.Builder.prototype.getSchema = function() {
  if (!this.finalized_) {
    this.finalize_();
  }
  return this.schema_;
};


/** @export @return {!lf.Global} */
lf.schema.Builder.prototype.getGlobal = function() {
  var namespacedGlobalId =
      new lf.service.ServiceId('ns_' + this.schema_.name());
  var global = lf.Global.get();

  var namespacedGlobal = null;
  if (!global.isRegistered(namespacedGlobalId)) {
    namespacedGlobal = new lf.Global();
    global.registerService(namespacedGlobalId, namespacedGlobal);
  } else {
    namespacedGlobal = global.getService(namespacedGlobalId);
  }

  return namespacedGlobal;
};


/**
 * @param {!lf.schema.ConnectOptions=} opt_options
 * @return {!IThenable.<!lf.proc.Database>}
 * @export
 */
lf.schema.Builder.prototype.connect = function(opt_options) {
  var global = this.getGlobal();
  if (!global.isRegistered(lf.service.SCHEMA)) {
    global.registerService(lf.service.SCHEMA, this.getSchema());
  }
  var upgradeCallback = (opt_options && opt_options.onUpgrade) ?
      opt_options.onUpgrade : undefined;
  var backstoreType = (opt_options && opt_options.storeType) ?
      opt_options.storeType : undefined;
  var bundledMode = this.schema_.getBundledMode();

  var db = new lf.proc.Database(global);
  return db.init(upgradeCallback, backstoreType, bundledMode);
};


/**
 * @param {!function(!lf.raw.BackStore):!IThenable=} opt_onUpgrade
 * @param {boolean=} opt_volatile Default to false
 * @return {!IThenable.<!lf.proc.Database>}
 * @export
 * @deprecated Use connect().
 */
lf.schema.Builder.prototype.getInstance = function(
    opt_onUpgrade, opt_volatile) {
  var global = this.getGlobal();
  if (!global.isRegistered(lf.service.SCHEMA)) {
    global.registerService(lf.service.SCHEMA, this.getSchema());
  }

  var db = new lf.proc.Database(global);
  return db.init(
      opt_onUpgrade,
      opt_volatile ? lf.schema.DataStoreType.MEMORY : undefined,
      false);
};


/**
 * @param {string} tableName
 * @return {!lf.schema.TableBuilder}
 * @export
 */
lf.schema.Builder.prototype.createTable = function(tableName) {
  if (this.tableBuilders_.containsKey(tableName) || this.finalized_) {
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX,
        'Table is already created or schema is already finalized.');
  }
  this.tableBuilders_.set(tableName, new lf.schema.TableBuilder(tableName));
  return this.tableBuilders_.get(tableName);
};


/**
 * @param {string} pragmaName
 * @param {*} value
 */
lf.schema.Builder.prototype.setPragma = function(pragmaName, value) {
  if (pragmaName == 'bundledMode' && typeof(value) == 'boolean') {
    this.schema_.setBundledMode(value);
  }
};



/**
 * @implements {lf.schema.Database}
 * @constructor
 *
 * @param {string} name
 * @param {number} version
 * @private
 */
lf.schema.DatabaseSchema_ = function(name, version) {
  /** @private {string} */
  this.name_ = name;

  /** @private {number} */
  this.version_ = version;

  /** @private {!goog.structs.Map.<string, !lf.schema.Table>} */
  this.tables_ = new goog.structs.Map();

  /** @private {boolean} */
  this.bundledMode_ = false;
};


/** @override */
lf.schema.DatabaseSchema_.prototype.name = function() {
  return this.name_;
};


/** @override */
lf.schema.DatabaseSchema_.prototype.version = function() {
  return this.version_;
};


/** @override */
lf.schema.DatabaseSchema_.prototype.tables = function() {
  return this.tables_.getValues();
};


/** @override */
lf.schema.DatabaseSchema_.prototype.table = function(tableName) {
  if (!this.tables_.containsKey(tableName)) {
    throw new lf.Exception(
        lf.Exception.Type.NOT_FOUND,
        tableName + ' is not found in database');
  }
  return this.tables_.get(tableName);
};


/** @param {!lf.schema.Table} table */
lf.schema.DatabaseSchema_.prototype.setTable = function(table) {
  this.tables_.set(table.getName(), table);
};


/** @return {boolean} */
lf.schema.DatabaseSchema_.prototype.getBundledMode = function() {
  return this.bundledMode_;
};


/** @param {boolean} value */
lf.schema.DatabaseSchema_.prototype.setBundledMode = function(value) {
  this.bundledMode_ = value;
};


/**
 * Global helper to create schema builder.
 * @param {string} dbName Database name
 * @param {number} dbVersion Database version
 * @return {!lf.schema.Builder} Schema builder that can be used to create a
 *     database schema.
 * @export
 */
lf.schema.create = function(dbName, dbVersion) {
  return new lf.schema.Builder(dbName, dbVersion);
};
