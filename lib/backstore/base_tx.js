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
goog.provide('lf.backstore.BaseTx');

goog.require('goog.Promise');
goog.require('goog.log');
goog.require('lf.Row');
goog.require('lf.TransactionType');
goog.require('lf.backstore.Tx');
goog.require('lf.index.IndexMetadataRow');

goog.forwardDeclare('lf.index.Index');



/**
 * A base class for all native DB transactions wrappers to subclass.
 * @constructor
 * @struct
 * @implements {lf.backstore.Tx}
 *
 * @param {!lf.cache.Journal} journal
 * @param {!lf.TransactionType} txType
 */
lf.backstore.BaseTx = function(journal, txType) {
  /** @private {!lf.cache.Journal} */
  this.journal_ = journal;

  /** @private {!lf.TransactionType} */
  this.txType_ = txType;

  /** @protected {!goog.promise.Resolver} */
  this.resolver = goog.Promise.withResolver();
};


/**
 * @protected
 * @return {goog.debug.Logger}
 */
lf.backstore.BaseTx.prototype.getLogger = goog.abstractMethod;


/** @override */
lf.backstore.BaseTx.prototype.getTable = goog.abstractMethod;


/** @override */
lf.backstore.BaseTx.prototype.getJournal = function() {
  return this.journal_;
};


/** @override */
lf.backstore.BaseTx.prototype.abort = goog.abstractMethod;


/**
 * @return {!IThenable} A signal that this transaction has completed.
 */
lf.backstore.BaseTx.prototype.finished = function() {
  return this.resolver.promise;
};


/** @override */
lf.backstore.BaseTx.prototype.commit = function() {
  var mergeIntoBackstore = goog.bind(function() {
    // Nothing to merge if this is a READ_ONLY transaction.
    return this.txType_ == lf.TransactionType.READ_ONLY ?
        goog.Promise.resolve() : this.mergeIntoBackstore_();
  }, this);

  return mergeIntoBackstore().then(
      goog.bind(function() {
        this.journal_.commit();
      }, this));
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
  return this.resolver.promise;
};


/**
 * Flushes the changes currently in this transaction's journal that refer to
 * user-defined tables to the backing store.
 * @private
 */
lf.backstore.BaseTx.prototype.mergeTableChanges_ = function() {
  var diff = this.journal_.getDiff();
  diff.getKeys().forEach(
      /**
       * @param {string} tableName
       * @this {lf.backstore.BaseTx}
       */
      function(tableName) {
        /** @type {!lf.schema.Table} */
        var tableSchema = this.journal_.getScope().get(tableName);
        var table = this.getTable(
            tableSchema.getName(),
            goog.bind(tableSchema.deserializeRow, tableSchema));
        var tableDiff = diff.get(tableName);
        var toDeleteRowIds = tableDiff.getDeleted().getValues().map(
            function(row) {
              return row.id();
            });
        if (toDeleteRowIds.length > 0) {
          table.remove(toDeleteRowIds).thenCatch(this.handleError_, this);
        }
        var toPut = tableDiff.getModified().getValues().map(
            /**
             * @param {!Array.<!lf.Row>} modification
             */
            function(modification) {
              return modification[1];
            }).concat(tableDiff.getAdded().getValues());
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
        /** @type {!lf.Stream} */
        var indexTable = this.getTable(index.getName(), lf.Row.deserialize);
        /**
         * Since there is no index diff implemented yet, the entire index needs
         * to be overwritten on disk. The 1st row holds index metadata and needs
         * to be preserved. Subsequent rows hold index contents and need to be
         * overwritten.
         * @type {!Array<!lf.Row>}
         */
        var metadataRows;
        indexTable.get([lf.index.IndexMetadataRow.ROW_ID]).then(
            function(rows) {
              metadataRows = rows;
              return indexTable.remove([]);
            }).then(
            function() {
              indexTable.put(metadataRows);
              indexTable.put(index.serialize());
            }, goog.bind(this.handleError_, this));
      }, this);
};


/**
 * @param {*} e
 * @private
 */
lf.backstore.BaseTx.prototype.handleError_ = function(e) {
  if (e instanceof Error) {
    goog.log.error(this.getLogger(), 'DB error', e);
  } else {
    goog.log.error(this.getLogger(), 'Unknown DB error');
  }
  this.resolver.reject(e);
};
