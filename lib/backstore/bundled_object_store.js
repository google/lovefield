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
goog.provide('lf.backstore.BundledObjectStore');

goog.require('goog.Promise');
goog.require('goog.asserts');
goog.require('lf.Table');
goog.require('lf.backstore.Page');
goog.require('lf.backstore.TableType');
goog.require('lf.service');
goog.require('lf.structs.map');



/**
 * Table stream based on a given IndexedDB Object Store.
 * @constructor
 * @struct
 * @final
 * @implements {lf.Table}
 *
 * @param {!IDBObjectStore} store
 * @param {!function(!lf.Row.Raw): !lf.Row} deserializeFn
 * @param {!function(string, number): !lf.backstore.Page} retrievePageFn The
 *     function to call for retrieving an existing page.
 */
lf.backstore.BundledObjectStore = function(
    store, deserializeFn, retrievePageFn) {
  /** @private {!IDBObjectStore} */
  this.store_ = store;

  /** @private {!function(!lf.Row.Raw): !lf.Row} */
  this.deserializeFn_ = deserializeFn;

  /** @private {!function(string, number): !lf.backstore.Page} */
  this.retrievePageFn_ = retrievePageFn;
};


/** @override */
lf.backstore.BundledObjectStore.prototype.get = function(ids) {
  if (ids.length == 0) {
    return this.getAll_();
  }
  var deserializeFn = this.deserializeFn_;
  return this.getPagesByRowIds_(ids).then(
      /** @param {!lf.structs.Map<number, !lf.backstore.Page>} pages */
      function(pages) {
        return ids.map(function(id) {
          var page = pages.get(lf.backstore.Page.toPageId(id));
          goog.asserts.assert(page, 'Containing page is empty');
          return deserializeFn(page.getPayload()[id]);
        });
      });
};


/**
 * @param {!Array<number>} rowIds
 * @return {!IThenable<!lf.structs.Map<number, !lf.backstore.Page>>} Fetched
 *     pages.
 * @private
 */
lf.backstore.BundledObjectStore.prototype.getPagesByRowIds_ = function(rowIds) {
  var results = lf.structs.map.create();
  var resolver = goog.Promise.withResolver();
  var pageIds = lf.backstore.Page.toPageIds(rowIds);

  // Chrome IndexedDB is slower when using a cursor to iterate through a big
  // table. A faster way is to just get everything individually within a
  // transaction.
  var promises = pageIds.map(function(id, index) {
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
        var page = lf.backstore.Page.deserialize(ev.target.result);
        results.set(page.getId(), page);
        resolve();
      };
    }, this);
  }, this);

  goog.Promise.all(promises).then(function() {
    resolver.resolve(results);
  });

  return resolver.promise;
};


/**
 * Reads everything from data store.
 * @return {!IThenable<!Array<!lf.Row>>}
 * @private
 */
lf.backstore.BundledObjectStore.prototype.getAll_ = function() {
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
        var page = lf.backstore.Page.deserialize(cursor.value);
        var data = page.getPayload();
        for (var key in data) {
          rows.push(this.deserializeFn_(data[key]));
        }
        cursor.continue();
      } else {
        resolve(rows);
      }
    }.bind(this);
  }, this);
};


/**
 * @param {!function(): !IDBRequest} reqFactory
 * @return {!IThenable}
 * @private
 */
lf.backstore.BundledObjectStore.prototype.performWriteOp_ = function(
    reqFactory) {
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
lf.backstore.BundledObjectStore.prototype.put = function(rows) {
  if (rows.length == 0) {
    return goog.Promise.resolve();
  }

  /** @type {!lf.structs.Map} */
  var pages = lf.structs.map.create();
  rows.forEach(function(row) {
    var pageId = lf.backstore.Page.toPageId(row.id());
    var page = pages.get(pageId) || null;
    if (goog.isNull(page)) {
      page = this.retrievePageFn_(this.store_.name, pageId);
    }
    page.setRows([row]);
    pages.set(pageId, page);
  }, this);

  var promises = lf.structs.map.values(pages).map(function(page) {
    return this.performWriteOp_(function() {
      return this.store_.put(page.serialize());
    }.bind(this));
  }, this);

  return goog.Promise.all(promises);
};


/** @override */
lf.backstore.BundledObjectStore.prototype.remove = function(ids) {
  if (ids.length == 0) {
    // Remove all
    return this.performWriteOp_(function() {
      return this.store_.clear();
    }.bind(this));
  }

  /** @type {!lf.structs.Map} */
  var pages = lf.structs.map.create();
  ids.forEach(function(id) {
    var pageId = lf.backstore.Page.toPageId(id);
    var page = pages.get(pageId) || null;
    if (goog.isNull(page)) {
      page = this.retrievePageFn_(this.store_.name, pageId);
    }
    page.removeRows([id]);
    pages.set(pageId, page);
  }, this);

  var promises = lf.structs.map.values(pages).map(function(page) {
    return this.performWriteOp_(function() {
      return Object.keys(page.getPayload()).length == 0 ?
          this.store_.delete(page.getId()) :
          this.store_.put(page.serialize());
    }.bind(this));
  }, this);

  return goog.Promise.all(promises);
};


/**
 * Retrieves a page for the case of a DATA table. It uses the Cache to retrieve
 * the rows that belong to the requested page.
 * @param {!lf.Global} global
 * @param {string} tableName
 * @param {number} pageId
 * @return {!lf.backstore.Page}
 * @private
 */
lf.backstore.BundledObjectStore.getDataTablePage_ = function(
    global, tableName, pageId) {
  var cache = global.getService(lf.service.CACHE);
  var range = lf.backstore.Page.getPageRange(pageId);
  var rows = cache.getRange(tableName, range[0], range[1]);
  var page = new lf.backstore.Page(pageId);
  page.setRows(rows);
  return page;
};


/**
 * Retrieves a page for the case of an INDEX table. It is basically a no-op
 * since the full index contents are rewritten every time.
 * @param {string} tableName
 * @param {number} pageId
 * @return {!lf.backstore.Page}
 * @private
 */
lf.backstore.BundledObjectStore.getIndexTablePage_ = function(
    tableName, pageId) {
  return new lf.backstore.Page(pageId);
};


/**
 *
 * @param {!lf.Global} global
 * @param {!IDBObjectStore} store
 * @param {!function(!lf.Row.Raw): !lf.Row} deserializeFn
 * @param {!lf.backstore.TableType} tableType
 * @return {!lf.Table}
 */
lf.backstore.BundledObjectStore.forTableType = function(
    global, store, deserializeFn, tableType) {
  var retrievePageFn = tableType == lf.backstore.TableType.DATA ?
      goog.partial(lf.backstore.BundledObjectStore.getDataTablePage_, global) :
      lf.backstore.BundledObjectStore.getIndexTablePage_;

  return new lf.backstore.BundledObjectStore(
      store, deserializeFn, retrievePageFn);
};
