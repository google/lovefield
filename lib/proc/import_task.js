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
goog.provide('lf.proc.ImportTask');

goog.require('goog.Promise');
goog.require('lf.Exception');
goog.require('lf.TransactionType');
goog.require('lf.proc.Task');
goog.require('lf.proc.TaskPriority');
goog.require('lf.service');
goog.require('lf.structs.set');



/**
 * Imports table/rows from given JavaScript object to an empty database.
 * @implements {lf.proc.Task}
 * @constructor
 * @struct
 *
 * @param {!lf.Global} global
 * @param {!Object} data
 */
lf.proc.ImportTask = function(global, data) {
  /** @private {!lf.schema.Database} */
  this.schema_ = global.getService(lf.service.SCHEMA);

  /** @private {!lf.structs.Set<!lf.schema.Table>} */
  this.scope_ = lf.structs.set.create(this.schema_.tables());

  /** @private {!goog.promise.Resolver<!Array<!lf.proc.Relation>>} */
  this.resolver_ = goog.Promise.withResolver();

  /** @private {!Object} */
  this.data_ = data;

  /** @private {!lf.BackStore} */
  this.backStore_ = global.getService(lf.service.BACK_STORE);

  /** @private {!lf.cache.Cache} */
  this.cache_ = global.getService(lf.service.CACHE);

  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = global.getService(lf.service.INDEX_STORE);
};


/** @override */
lf.proc.ImportTask.prototype.exec = function() {
  if (!this.isEmptyDB_()) {
    // 110: Attempt to import into a non-empty database.
    throw new lf.Exception(110);
  }

  if (this.schema_.name() != this.data_['name'] ||
      this.schema_.version() != this.data_['version']) {
    // 111: Database name/version mismatch for import.
    throw new lf.Exception(111);
  }

  if (!goog.isDefAndNotNull(this.data_['tables'])) {
    // 112: Import data not found.
    throw new lf.Exception(112);
  }

  // TODO(arthurhsu): detect backstore type and implement proper import function
  // for IndexedDB.
  return this.importMemory_();
};


/** @override */
lf.proc.ImportTask.prototype.getType = function() {
  return lf.TransactionType.READ_WRITE;
};


/** @override */
lf.proc.ImportTask.prototype.getScope = function() {
  return this.scope_;
};


/** @override */
lf.proc.ImportTask.prototype.getResolver = function() {
  return this.resolver_;
};


/** @override */
lf.proc.ImportTask.prototype.getId = function() {
  return goog.getUid(this);
};


/** @override */
lf.proc.ImportTask.prototype.getPriority = function() {
  return lf.proc.TaskPriority.IMPORT_TASK;
};


/**
 * Checks if DB is empty.
 * @return {boolean}
 * @private
 */
lf.proc.ImportTask.prototype.isEmptyDB_ = function() {
  var tables = this.schema_.tables();
  for (var i = 0; i < tables.length; ++i) {
    var index = this.indexStore_.get(tables[i].getRowIdIndexName());
    if (index.stats().totalRows > 0) {
      return false;
    }
  }
  return true;
};


/**
 * Imports given data into Memory DB.
 * @return {!IThenable<!Array<!lf.proc.Relation>>}
 * @private
 */
lf.proc.ImportTask.prototype.importMemory_ = function() {
  for (var tableName in this.data_['tables']) {
    var table = this.schema_.table(tableName);
    var payloads = this.data_['tables'][tableName];
    var rows = payloads.map(function(value) {
      return table.createRow(value);
    });

    var memoryTable = this.backStore_.getTableInternal(tableName);
    this.cache_.setMany(tableName, rows);
    var indices = this.indexStore_.getTableIndices(tableName);
    rows.forEach(function(row) {
      indices.forEach(function(index) {
        var key = row.keyOfIndex(index.getName());
        index.add(key, row.id());
      });
    });
    memoryTable.putSync(rows);
  }

  return goog.Promise.resolve([]);
};
