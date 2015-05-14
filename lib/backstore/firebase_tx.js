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
goog.provide('lf.backstore.FirebaseTx');

goog.require('goog.Promise');
goog.require('lf.backstore.BaseTx');



/**
 * Psuedo transaction object for Firebase.
 *
 * @constructor
 * @struct
 * @final
 * @extends {lf.backstore.BaseTx}
 *
 * @param {!lf.backstore.Firebase} db
 * @param {!lf.TransactionType} type
 * @param {!lf.cache.Journal} journal
 */
lf.backstore.FirebaseTx = function(db, type, journal) {
  lf.backstore.FirebaseTx.base(this, 'constructor', journal, type);

  /** @private {!lf.backstore.Firebase} */
  this.db_ = db;
};
goog.inherits(lf.backstore.FirebaseTx, lf.backstore.BaseTx);


/** @override */
lf.backstore.FirebaseTx.prototype.getTable = function(name, deserializeFn) {
  return this.db_.getTableInternal(name);
};


/** @override */
lf.backstore.FirebaseTx.prototype.commit = function() {
  // Update the memory snapshots, this will effectively be synchronous.
  lf.backstore.FirebaseTx.base(this, 'commit');

  var diffs = this.getJournal().getDiff();
  var numTableAffected = diffs.getCount();
  if (numTableAffected == 0) {
    this.resolver.resolve();
  } else {
    var rev = this.db_.getRevision() + 1;
    this.db_.getRef().transaction(goog.bind(function(snapshot) {
      // Firebase will send change notification before actually committing to
      // remote database. Therefore the DB revision needs to be increased here
      // for the change management to work correctly.
      this.db_.setRevision(rev);
      diffs.forEach(function(diff) {
        var table = snapshot[diff.getName()];
        diff.getAdded().forEach(function(row, rowId) {
          table[rowId.toString()] = row.payload();
        });
        diff.getModified().getValues().forEach(function(pair) {
          table[pair[1].id().toString()] = pair[1].payload();
        });
        diff.getDeleted().getValues().forEach(function(row) {
          table[row.id().toString()] = null;
        });
      });
      snapshot['__revision__'] = rev;
      return snapshot;
    }, this), goog.bind(function(error, committed, snapshot) {
      if (error || !committed) {
        // Transaction failed or aborted.
        this.db_.setRevision(rev - 1);
        diffs.forEach(goog.bind(function(diff) {
          var tableName = diff.getName();
          this.db_.reloadTable(tableName, snapshot[tableName]);
        }, this));
        this.resolver.reject(error);
      } else {
        // Transaction committed.
        this.resolver.resolve();
      }
    }, this));
  }
  return this.resolver.promise;
};
