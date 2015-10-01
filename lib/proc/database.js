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
goog.provide('lf.proc.Database');

goog.require('lf.Database');
goog.require('lf.Exception');
goog.require('lf.base');
goog.require('lf.proc.ExportTask');
goog.require('lf.proc.ImportTask');
goog.require('lf.proc.Transaction');
goog.require('lf.query.DeleteBuilder');
goog.require('lf.query.InsertBuilder');
goog.require('lf.query.SelectBuilder');
goog.require('lf.query.UpdateBuilder');
goog.require('lf.service');



/**
 * @implements {lf.Database}
 * @constructor @struct
 * @export
 *
 * @param {!lf.Global} global
 */
lf.proc.Database = function(global) {
  /** @private {!lf.Global} */
  this.global_ = global;

  /** @private {!lf.schema.Database} */
  this.schema_ = global.getService(lf.service.SCHEMA);

  /**
   * Whether this connection to the database is active.
   * @private {boolean}
   */
  this.isActive_ = false;

  /** @private {!lf.proc.Runner} */
  this.runner_;
};


/**
 * @param {!lf.schema.ConnectOptions=} opt_options
 * @return {!IThenable<!lf.proc.Database>}
 * @export
 */
lf.proc.Database.prototype.init = function(opt_options) {
  // The SCHEMA might have been removed from this.global_ in the case where
  // lf.proc.Database#close() was called, therefore it needs to be re-added.
  this.global_.registerService(lf.service.SCHEMA, this.schema_);

  return /** @type  {!IThenable<!lf.proc.Database>} */ (
      lf.base.init(this.global_, opt_options).then(function() {
        this.isActive_ = true;
        this.runner_ = this.global_.getService(lf.service.RUNNER);
        return this;
      }.bind(this)));
};


/** @override @export */
lf.proc.Database.prototype.getSchema = function() {
  return this.schema_;
};


/** @private */
lf.proc.Database.prototype.checkActive_ = function() {
  if (!this.isActive_) {
    // 2: The database connection is not active.
    throw new lf.Exception(2);
  }
};


/** @override @export */
lf.proc.Database.prototype.select = function(var_args) {
  this.checkActive_();
  var columns =
      arguments.length == 1 && !goog.isDefAndNotNull(arguments[0]) ?
      [] : Array.prototype.slice.call(arguments);
  return new lf.query.SelectBuilder(this.global_, columns);
};


/** @override @export */
lf.proc.Database.prototype.insert = function() {
  this.checkActive_();
  return new lf.query.InsertBuilder(this.global_);
};


/** @override @export */
lf.proc.Database.prototype.insertOrReplace = function() {
  this.checkActive_();
  return new lf.query.InsertBuilder(this.global_, /* allowReplace */ true);
};


/** @override @export */
lf.proc.Database.prototype.update = function(table) {
  this.checkActive_();
  return new lf.query.UpdateBuilder(this.global_, table);
};


/** @override @export */
lf.proc.Database.prototype.delete = function() {
  this.checkActive_();
  return new lf.query.DeleteBuilder(this.global_);
};


/** @override @export */
lf.proc.Database.prototype.observe = function(query, callback) {
  this.checkActive_();
  var observerRegistry = this.global_.getService(
      lf.service.OBSERVER_REGISTRY);
  observerRegistry.addObserver(query, callback);
};


/** @override @export */
lf.proc.Database.prototype.unobserve = function(query, callback) {
  this.checkActive_();
  var observerRegistry = this.global_.getService(
      lf.service.OBSERVER_REGISTRY);
  observerRegistry.removeObserver(query, callback);
};


/** @override @export */
lf.proc.Database.prototype.createTransaction = function(opt_type) {
  this.checkActive_();
  return new lf.proc.Transaction(this.global_);
};


/** @override @export */
lf.proc.Database.prototype.close = function() {
  lf.base.closeDatabase(this.global_);
  this.global_.clear();
  this.isActive_ = false;
};


/** @override @export */
lf.proc.Database.prototype.export = function() {
  this.checkActive_();
  var task = new lf.proc.ExportTask(this.global_);
  return this.runner_.scheduleTask(task).then(function(results) {
    return results[0].getPayloads()[0];
  });
};


/** @override @export */
lf.proc.Database.prototype.import = function(data) {
  this.checkActive_();
  var task = new lf.proc.ImportTask(this.global_, data);
  return this.runner_.scheduleTask(task).then(function() {
    return null;
  });
};


/** @return {boolean} */
lf.proc.Database.prototype.isOpen = function() {
  return this.isActive_;
};
