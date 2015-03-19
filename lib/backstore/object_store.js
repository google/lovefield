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
goog.provide('lf.backstore.ObjectStore');

goog.require('goog.Promise');
goog.require('goog.log');
goog.require('lf.Exception');
goog.require('lf.Stream');

goog.forwardDeclare('goog.debug.Logger');



/**
 * Table stream based on a given IndexedDB Object Store.
 * @constructor
 * @struct
 * @final
 * @implements {lf.Stream}
 *
 * @param {!IDBObjectStore} store
 * @param {!function({id: number, value: *}): !lf.Row} deserializeFn
 */
lf.backstore.ObjectStore = function(store, deserializeFn) {
  /** @private {!IDBObjectStore} */
  this.store_ = store;

  /** @private {!function({id: number, value: *}): !lf.Row} */
  this.deserializeFn_ = deserializeFn;

  /** @private {goog.debug.Logger} */
  this.logger_ = goog.log.getLogger('lf.backstore.ObjectStore');
};


/** @override */
lf.backstore.ObjectStore.prototype.get = function(ids) {
  if (ids.length == 0) {
    return this.getAll_();
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
        goog.log.error(this.logger_, e.message);
        reject(e);
        return;
      }
      request.onerror = goog.bind(function(e) {
        goog.log.error(
            this.logger_,
            'Failed to get ' + id + ':' + request.error.name);
        reject(e);
      }, this);
      request.onsuccess = goog.bind(function(ev) {
        resolve(this.deserializeFn_(ev.target.result));
      }, this);
    }, this);
  }, this);
  return goog.Promise.all(promises);
};


/**
 * Reads everything from data store.
 * @return {!IThenable<!Array<!lf.Row>>}
 * @private
 */
lf.backstore.ObjectStore.prototype.getAll_ = function() {
  return new goog.Promise(function(resolve, reject) {
    var rows = [];
    var request;
    try {
      request = this.store_.openCursor();
    } catch (e) {
      goog.log.error(this.logger_, 'Failed to open cursor:' + e.message);
      reject(e);
      return;
    }

    request.onerror = goog.bind(function(e) {
      goog.log.error(this.logger_, 'Failed to iterate:' + request.error.name);
      reject(e);
    }, this);
    request.onsuccess = goog.bind(function() {
      var cursor = request.result;
      if (cursor) {
        rows.push(this.deserializeFn_(cursor.value));
        cursor.continue();
      } else {
        resolve(rows);
      }
    }, this);
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
      goog.log.error(this.logger_, e.message);
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
    return this.performWriteOp_(goog.bind(function() {
      // TODO(dpapad): Surround this with try catch, otherwise some errors don't
      // surface to the console.
      return this.store_.put(row.serialize());
    }, this));
  }, this);

  return goog.Promise.all(promises);
};


/** @override */
lf.backstore.ObjectStore.prototype.remove = function(ids) {
  return new goog.Promise(function(resolve, reject) {
    var request = this.store_.count();
    request.onsuccess = goog.bind(function(ev) {
      if (ids.length == 0 || ev.target.result == ids.length) {
        // Remove all
        return this.performWriteOp_(goog.bind(function() {
          return this.store_.clear();
        }, this)).then(resolve, reject);
      }

      var promises = ids.map(function(id) {
        return this.performWriteOp_(goog.bind(function() {
          return this.store_.delete(id);
        }, this));
      }, this);

      goog.Promise.all(promises).then(resolve, reject);
    }, this);

    request.onerror = reject;
  }, this);
};


/** @override */
lf.backstore.ObjectStore.prototype.pipe = function(stream) {
  throw new lf.Exception(lf.Exception.Type.SYNTAX,
      'ObjectStore should be the last in chain');
};
