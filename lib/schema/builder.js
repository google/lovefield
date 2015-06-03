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
goog.provide('lf.schema');
goog.provide('lf.schema.Builder');
goog.provide('lf.schema.DatabaseSchema');

goog.require('goog.structs.Map');
goog.require('lf.Exception');
goog.require('lf.Global');
goog.require('lf.proc.Database');
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
 * @export
 */
lf.schema.Builder = function(dbName, dbVersion) {
  /** @private {!lf.schema.DatabaseSchema} */
  this.schema_ = new lf.schema.DatabaseSchema(dbName, dbVersion);

  /** @private {!goog.structs.Map<string, !lf.schema.TableBuilder>} */
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
 * @return {!IThenable<!lf.proc.Database>}
 * @export
 */
lf.schema.Builder.prototype.connect = function(opt_options) {
  var global = this.getGlobal();
  if (!global.isRegistered(lf.service.SCHEMA)) {
    global.registerService(lf.service.SCHEMA, this.getSchema());
  }

  var db = new lf.proc.Database(global);
  return db.init(opt_options);
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
 * @param {!lf.schema.Database.Pragma} pragma
 * @return {!lf.schema.Builder}
 * @export
 */
lf.schema.Builder.prototype.setPragma = function(pragma) {
  if (this.finalized_) {
    throw new lf.Exception(
        lf.Exception.Type.SYNTAX,
        'Schema is already finalized.');
  }

  this.schema_.setPragma(pragma);
  return this;
};



/**
 * @implements {lf.schema.Database}
 * @constructor
 * @export
 *
 * @param {string} name
 * @param {number} version
 */
lf.schema.DatabaseSchema = function(name, version) {
  /** @private {string} */
  this.name_ = name;

  /** @private {number} */
  this.version_ = version;

  /** @private {!goog.structs.Map<string, !lf.schema.Table>} */
  this.tables_ = new goog.structs.Map();

  /** @private {!lf.schema.Database.Pragma} */
  this.pragma_ = {
    enableBundledMode: false
  };
};


/** @export @override */
lf.schema.DatabaseSchema.prototype.name = function() {
  return this.name_;
};


/** @export @override */
lf.schema.DatabaseSchema.prototype.version = function() {
  return this.version_;
};


/** @export @override */
lf.schema.DatabaseSchema.prototype.tables = function() {
  return this.tables_.getValues();
};


/** @export @override */
lf.schema.DatabaseSchema.prototype.table = function(tableName) {
  if (!this.tables_.containsKey(tableName)) {
    throw new lf.Exception(
        lf.Exception.Type.NOT_FOUND,
        tableName + ' is not found in database');
  }
  return this.tables_.get(tableName);
};


/** @param {!lf.schema.Table} table */
lf.schema.DatabaseSchema.prototype.setTable = function(table) {
  this.tables_.set(table.getName(), table);
};


/** @export @override */
lf.schema.DatabaseSchema.prototype.pragma = function() {
  return this.pragma_;
};


/** @param {!lf.schema.Database.Pragma} pragma */
lf.schema.DatabaseSchema.prototype.setPragma = function(pragma) {
  this.pragma_ = pragma;
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
