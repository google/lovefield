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
    var ref = numTableAffected > 1 ? this.db_ :
        this.db_.getTableRef(diffs.getValues()[0].getName());
    var changes = this.diffToChange_();
    ref.update(changes, goog.bind(function(e) {
      if (e) {
        // TODO(arthurhsu): when transaction failed, the snapshots of tables
        // are invalid and need reload.
        this.resolver.reject(e);
      } else {
        this.resolver.resolve();
      }
    }, this));
  }
  return this.resolver.promise;
};


/**
 * @return {!Object}
 * @private
 */
lf.backstore.FirebaseTx.prototype.diffToChange_ = function() {
  var object = {};
  var diffs = this.getJournal().getDiff();
  diffs.forEach(function(diff) {
    var prefix = diffs.length > 1 ? diff.getName() + '.' : '';
    var setter = function(row, value) {
      object[prefix + row.id().toString()] = row.payload();
    };
    diff.getAdded().getValues().forEach(setter);
    diff.getModified().getValues().forEach(setter);
    diff.getDeleted().getValues().forEach(function(row) {
      object[prefix + row.id().toString()] = null;
    });
  });
  return object;
};
