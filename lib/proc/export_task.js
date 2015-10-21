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
goog.provide('lf.proc.ExportTask');

goog.require('goog.Promise');
goog.require('lf.Row');
goog.require('lf.TransactionType');
goog.require('lf.proc.Relation');
goog.require('lf.proc.RelationEntry');
goog.require('lf.proc.Task');
goog.require('lf.proc.TaskPriority');
goog.require('lf.service');
goog.require('lf.structs.set');



/**
 * An ExportTask exports all existing table/rows in database to a plain JS
 * object. Persistent indices will not be exported.
 * @implements {lf.proc.Task}
 * @constructor
 * @struct
 *
 * @param {!lf.Global} global
 */
lf.proc.ExportTask = function(global) {
  /** @private {!lf.Global} */
  this.global_ = global;

  /** @private {!lf.schema.Database} */
  this.schema_ = global.getService(lf.service.SCHEMA);

  /** @private {!lf.structs.Set<!lf.schema.Table>} */
  this.scope_ = lf.structs.set.create(this.schema_.tables());

  /** @private {!goog.promise.Resolver<!Array<!lf.proc.Relation>>} */
  this.resolver_ = goog.Promise.withResolver();
};


/**
 * Grabs contents from the cache and exports them as a plain object.
 * @return {!Object}
 */
lf.proc.ExportTask.prototype.execSync = function() {
  var indexStore = this.global_.getService(lf.service.INDEX_STORE);
  var cache = this.global_.getService(lf.service.CACHE);

  var tables = {};
  this.schema_.tables().forEach(function(table) {
    var rowIds = indexStore.get(table.getRowIdIndexName()).getRange();
    var payloads = cache.getMany(rowIds).map(function(row) {
      return row.payload();
    });
    tables[table.getName()] = payloads;
  });

  return {
    'name': this.schema_.name(),
    'version': this.schema_.version(),
    'tables': tables
  };
};


/** @override */
lf.proc.ExportTask.prototype.exec = function() {
  var results = this.execSync();
  var entry = new lf.proc.RelationEntry(
      new lf.Row(lf.Row.DUMMY_ID, results), true);

  return goog.Promise.resolve([new lf.proc.Relation([entry], [])]);
};


/** @override */
lf.proc.ExportTask.prototype.getType = function() {
  return lf.TransactionType.READ_ONLY;
};


/** @override */
lf.proc.ExportTask.prototype.getScope = function() {
  return this.scope_;
};


/** @override */
lf.proc.ExportTask.prototype.getResolver = function() {
  return this.resolver_;
};


/** @override */
lf.proc.ExportTask.prototype.getId = function() {
  return goog.getUid(this);
};


/** @override */
lf.proc.ExportTask.prototype.getPriority = function() {
  return lf.proc.TaskPriority.EXPORT_TASK;
};
