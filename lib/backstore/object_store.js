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
goog.provide('lf.backstore.ObjectStore');

goog.require('goog.Promise');
goog.require('lf.Table');



/**
 * Table stream based on a given IndexedDB Object Store.
 * @constructor
 * @struct
 * @final
 * @implements {lf.Table}
 *
 * @param {!IDBObjectStore} store
 * @param {!function(!lf.Row.Raw): !lf.Row} deserializeFn
 */
lf.backstore.ObjectStore = function(store, deserializeFn) {
  /** @private {!IDBObjectStore} */
  this.store_ = store;

  /** @private {!function(!lf.Row.Raw): !lf.Row} */
  this.deserializeFn_ = deserializeFn;
};


/** @override */
lf.backstore.ObjectStore.prototype.get = function(ids) {
  if (ids.length == 0) {
    return goog.isDefAndNotNull(this.store_['getAll']) ?
        this.getAllBulk_() : this.getAllWithCursor_();
  }

  // Chrome IndexedDB is slower when using a cursor to iterate through a big
  // table. A faster way is to just get everything individually within a
  // transaction.
  var promises = ids.map(function(id, index) {
    return new goog.Promise(function(resolve, reject) {
      var request;
      try {
        request = this.store_.get(id);
      } catch (e) {
        reject(e);
        return;
      }
      request.onerror = reject;
      request.onsuccess = function(ev) {
        resolve(this.deserializeFn_(ev.target.result));
      }.bind(this);
    }, this);
  }, this);
  return goog.Promise.all(promises);
};


/**
 * Reads everything from data store, using a cursor.
 * @return {!IThenable<!Array<!lf.Row>>}
 * @private
 */
lf.backstore.ObjectStore.prototype.getAllWithCursor_ = function() {
  return new goog.Promise(function(resolve, reject) {
    var rows = [];
    var request;
    try {
      request = this.store_.openCursor();
    } catch (e) {
      reject(e);
      return;
    }

    request.onerror = reject;
    request.onsuccess = function() {
      var cursor = request.result;
      if (cursor) {
        rows.push(this.deserializeFn_(cursor.value));
        cursor.continue();
      } else {
        resolve(rows);
      }
    }.bind(this);
  }, this);
};


/**
 * Reads everything from data store, using the experimental
 * IDBObjectStore#getAll.
 * @return {!IThenable<!Array<!lf.Row>>}
 * @private
 */
lf.backstore.ObjectStore.prototype.getAllBulk_ = function() {
  return new goog.Promise(function(resolve, reject) {
    var request;
    try {
      // TODO(dpapad): getAll is still experimental (and hidden behind a flag)
      // on both Chrome and Firefox. Add it to the externs once a flag is no
      // longer required.
      request = this.store_['getAll']();
    } catch (e) {
      reject(e);
      return;
    }

    request.onerror = reject;
    request.onsuccess = function() {
      var rows = request.result.map(
          /** @this {lf.backstore.ObjectStore} */
          function(rawRow) {
            return this.deserializeFn_(rawRow);
          }, this);
      resolve(rows);
    }.bind(this);
  }, this);
};


/**
 * @param {!function(): !IDBRequest} reqFactory
 * @return {!IThenable}
 * @private
 */
lf.backstore.ObjectStore.prototype.performWriteOp_ = function(reqFactory) {
  return new goog.Promise(function(resolve, reject) {
    var request;
    try {
      request = reqFactory();
    } catch (e) {
      reject(e);
      return;
    }
    request.onsuccess = resolve;
    request.onerror = reject;
  }, this);
};


/** @override */
lf.backstore.ObjectStore.prototype.put = function(rows) {
  if (rows.length == 0) {
    return goog.Promise.resolve();
  }

  var promises = rows.map(function(row) {
    return this.performWriteOp_(function() {
      // TODO(dpapad): Surround this with try catch, otherwise some errors don't
      // surface to the console.
      return this.store_.put(row.serialize());
    }.bind(this));
  }, this);

  return goog.Promise.all(promises);
};


/** @override */
lf.backstore.ObjectStore.prototype.remove = function(ids) {
  return new goog.Promise(function(resolve, reject) {
    var request = this.store_.count();
    request.onsuccess = function(ev) {
      if (ids.length == 0 || ev.target.result == ids.length) {
        // Remove all
        return this.performWriteOp_(function() {
          return this.store_.clear();
        }.bind(this)).then(resolve, reject);
      }

      var promises = ids.map(function(id) {
        return this.performWriteOp_(function() {
          return this.store_.delete(id);
        }.bind(this));
      }, this);

      goog.Promise.all(promises).then(resolve, reject);
    }.bind(this);

    request.onerror = reject;
  }, this);
};
