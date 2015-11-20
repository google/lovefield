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
goog.provide('lf.backstore.BaseTx');

goog.require('goog.Promise');
goog.require('lf.Row');
goog.require('lf.TransactionStats');
goog.require('lf.TransactionType');
goog.require('lf.backstore.TableType');
goog.require('lf.backstore.Tx');
goog.require('lf.structs.map');

goog.forwardDeclare('lf.cache.TableDiff');
goog.forwardDeclare('lf.index.Index');



/**
 * A base class for all native DB transactions wrappers to subclass.
 * @constructor
 * @struct
 * @implements {lf.backstore.Tx}
 *
 * @param {!lf.TransactionType} txType
 * @param {!lf.cache.Journal=} opt_journal A journal should be provided only in
 *     the case where the type of this transaction is
 *     lf.TransactionType.READ_WRITE.
 */
lf.backstore.BaseTx = function(txType, opt_journal) {
  /** @protected {!lf.TransactionType} */
  this.txType = txType;

  /** @private {?lf.cache.Journal} */
  this.journal_ = opt_journal || null;

  /** @protected {!goog.promise.Resolver} */
  this.resolver = goog.Promise.withResolver();

  /** @private {boolean} */
  this.success_ = false;

  /** @private {?lf.TransactionStats} */
  this.stats_ = null;
};


/** @override */
lf.backstore.BaseTx.prototype.getTable = goog.abstractMethod;


/** @override */
lf.backstore.BaseTx.prototype.getJournal = function() {
  return this.journal_;
};


/** @override */
lf.backstore.BaseTx.prototype.abort = goog.abstractMethod;


/** @return {!IThenable} */
lf.backstore.BaseTx.prototype.commitInternal = goog.abstractMethod;


/** @override */
lf.backstore.BaseTx.prototype.commit = function() {
  var promise = this.txType == lf.TransactionType.READ_ONLY ?
      this.commitInternal() : this.commitReadWrite_();
  return promise.then(function(results) {
    this.success_ = true;
    return results;
  }.bind(this));
};


/**
 * @return {!IThenable}
 * @private
 */
lf.backstore.BaseTx.prototype.commitReadWrite_ = function() {
  try {
    this.journal_.checkDeferredConstraints();
  } catch (e) {
    return goog.Promise.reject(e);
  }

  return this.mergeIntoBackstore_().then(function(results) {
    this.journal_.commit();
    return results;
  }.bind(this));
};


/**
 * Flushes all changes currently in this transaction's journal to the backing
 * store.
 * @return {!IThenable} A promise firing after all changes have been
 *     successfully written to the backing store.
 * @private
 */
lf.backstore.BaseTx.prototype.mergeIntoBackstore_ = function() {
  this.mergeTableChanges_();
  this.mergeIndexChanges_();

  // When all DB operations have finished, this.whenFinished will fire.
  return this.commitInternal();
};


/**
 * Flushes the changes currently in this transaction's journal that refer to
 * user-defined tables to the backing store.
 * @private
 */
lf.backstore.BaseTx.prototype.mergeTableChanges_ = function() {
  var diff = this.journal_.getDiff();
  diff.forEach(
      /**
       * @param {string} tableName
       * @param {!lf.cache.TableDiff} tableDiff
       * @this {lf.backstore.BaseTx}
       */
      function(tableDiff, tableName) {
        /** @type {!lf.schema.Table} */
        var tableSchema = this.journal_.getScope().get(tableName);
        var table = this.getTable(
            tableSchema.getName(),
            tableSchema.deserializeRow.bind(tableSchema),
            lf.backstore.TableType.DATA);
        var toDeleteRowIds = lf.structs.map.values(tableDiff.getDeleted()).map(
            function(row) {
              return row.id();
            });
        if (toDeleteRowIds.length > 0) {
          table.remove(toDeleteRowIds).thenCatch(this.handleError_, this);
        }
        var toPut = lf.structs.map.values(tableDiff.getModified()).map(
            /**
             * @param {!Array<!lf.Row>} modification
             */
            function(modification) {
              return modification[1];
            }).concat(lf.structs.map.values(tableDiff.getAdded()));
        table.put(toPut).thenCatch(this.handleError_, this);
      }, this);
};


/**
 * Flushes the changes currently in this transaction's journal that refer to
 * persisted indices to the backing store.
 * @private
 */
lf.backstore.BaseTx.prototype.mergeIndexChanges_ = function() {
  var indices = this.journal_.getIndexDiff();
  indices.forEach(
      /**
       * @param {!lf.index.Index} index
       * @this {lf.backstore.BaseTx}
       */
      function(index) {
        /** @type {!lf.Table} */
        var indexTable = this.getTable(
            index.getName(), lf.Row.deserialize, lf.backstore.TableType.INDEX);
        // Since there is no index diff implemented yet, the entire index needs
        // to be overwritten on disk.
        indexTable.remove([]);
        indexTable.put(index.serialize());
      }, this);
};


/**
 * @param {*} e
 * @private
 */
lf.backstore.BaseTx.prototype.handleError_ = function(e) {
  this.resolver.reject(e);
};


/** @override */
lf.backstore.BaseTx.prototype.stats = function() {
  if (goog.isNull(this.stats_)) {
    if (!this.success_) {
      this.stats_ = lf.TransactionStats.getDefault();
    } else if (this.txType == lf.TransactionType.READ_ONLY) {
      this.stats_ = new lf.TransactionStats(true, 0, 0, 0, 0);
    } else {
      var diff = this.journal_.getDiff();
      var insertedRows = 0;
      var deletedRows = 0;
      var updatedRows = 0;
      var tablesChanged = 0;
      diff.forEach(
          /**
           * @param {!lf.cache.TableDiff} tableDiff
           * @param {string} tableName
           */
          function(tableDiff, tableName) {
            tablesChanged++;
            insertedRows += tableDiff.getAdded().size;
            updatedRows += tableDiff.getModified().size;
            deletedRows += tableDiff.getDeleted().size;
          });
      this.stats_ = new lf.TransactionStats(
          true, insertedRows, updatedRows, deletedRows, tablesChanged);
    }
  }
  return this.stats_;
}
