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
goog.require('lf.backstore.Tx');



/**
 * A base class for all native DB transactions wrappers to subclass.
 * @constructor
 * @struct
 * @implements {lf.backstore.Tx}
 *
 * @param {!lf.cache.Journal} journal
 */
lf.backstore.BaseTx = function(journal) {
  /** @private {!lf.cache.Journal} */
  this.journal_ = journal;

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
  return this.mergeIntoBackstore_().then(
      goog.bind(function() {
        this.journal_.commit();
      }, this));
};


/**
 * Flushes the changes currently in this transaction's journal to the backing
 * store.
 * @return {!IThenable} A promise firing after all changes have been
 *     successfully written to the backing store.
 * @private
 */
lf.backstore.BaseTx.prototype.mergeIntoBackstore_ = function() {
  var snapshots = this.journal_.getSnapshots();
  snapshots.getKeys().forEach(
      /**
       * @param {string} tableName
       * @this {lf.backstore.BaseTx}
       */
      function(tableName) {
        var tableSchema = this.journal_.getScope().get(tableName);
        var table = this.getTable(tableSchema);
        var snapshot = snapshots.get(tableName);
        snapshot.getKeys().forEach(
            /**
             * @param {number} key
             * @this {lf.backstore.BaseTx}
             */
            function(key) {
              var value = snapshot.get(key, null);
              var promise = goog.isNull(value) ?
                  table.remove([key]) : table.put([value]);
              promise.thenCatch(this.handleError_, this);
            }, this);
      }, this);

  // When all DB operations have finished, this.whenFinished will fire.
  return this.resolver.promise;
};


/**
 * @param {!Error} e
 * @private
 */
lf.backstore.BaseTx.prototype.handleError_ = function(e) {
  goog.log.error(this.getLogger(), 'DB error', e);
  this.resolver.reject(e);
};
