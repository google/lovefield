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
goog.provide('lf.debug.inspect');

goog.require('lf.Global');
goog.require('lf.service');
goog.require('lf.service.ServiceId');


/**
 * Returns requested results as string for inspector to use.
 * @param {?string} dbName Database name, if null then return list of DB.
 * @param {?string} tableName Table name, if null then return list of tables.
 * @param {number=} opt_limit Max rows to return, honored only if tableName is
 *     provided.
 * @param {number=} opt_skip Rows to skip from beginning, honored only if
 *     tableName is provided.
 * @return {string}
 */
lf.debug.inspect = function(dbName, tableName, opt_limit, opt_skip) {
  if (!goog.isDefAndNotNull(dbName)) {
    return lf.debug.listDb_();
  }

  if (!goog.isDefAndNotNull(tableName)) {
    return lf.debug.listTables_(dbName);
  }

  return lf.debug.inspectTable_(dbName, tableName, opt_limit, opt_skip);
};


/**
 * Return stringified object.
 * @param {!Object|!Array<!Object>} data
 * @return {string}
 * @private
 */
lf.debug.toString_ = function(data) {
  var value = '';
  try {
    value = JSON.stringify(data);
  } catch (e) {
  }
  return value;
};


/**
 * Returns global object by database name.
 * @param {string} dbName
 * @return {?lf.Global}
 * @private
 */
lf.debug.getGlobal_ = function(dbName) {
  var global = lf.Global.get();
  var ns = new lf.service.ServiceId('ns_' + dbName);
  return global.isRegistered(ns) ? global.getService(ns) : null;
};


/**
 * Returns a stringified object, whose key is DB name and value is version.
 * @return {string}
 * @private
 */
lf.debug.listDb_ = function() {
  var global = lf.Global.get();
  var dbList = {};
  global.listServices().forEach(function(service) {
    if (service.substring(0, 3) == 'ns_') {
      var dbName = service.substring(3);
      dbList[dbName] =
          lf.debug.getGlobal_(dbName).getService(lf.service.SCHEMA).version();
    }
  });
  return lf.debug.toString_(dbList);
};


/**
 * Returns a stringified object, whose key is table name and value is number of
 * rows in that table.
 * @param {string} dbName
 * @return {string}
 * @private
 */
lf.debug.listTables_ = function(dbName) {
  var global = lf.debug.getGlobal_(dbName);
  var tables = {};
  if (goog.isDefAndNotNull(global)) {
    var indexStore = global.getService(lf.service.INDEX_STORE);
    global.getService(lf.service.SCHEMA).tables().forEach(function(table) {
      tables[table.getName()] =
          indexStore.get(table.getRowIdIndexName()).stats().totalRows;
    });
  }

  return lf.debug.toString_(tables);
};


/**
 * Returns a strigified array of rows.
 * @param {string} dbName
 * @param {string} tableName
 * @param {number=} opt_limit
 * @param {number=} opt_skip
 * @return {string}
 * @private
 */
lf.debug.inspectTable_ = function(dbName, tableName, opt_limit, opt_skip) {
  var global = lf.debug.getGlobal_(dbName);
  var contents = [];
  if (goog.isDefAndNotNull(global)) {
    var table = null;
    try {
      table = global.getService(lf.service.SCHEMA).table(tableName);
    } catch (e) {
    }
    if (goog.isDefAndNotNull(table)) {
      var indexStore = global.getService(lf.service.INDEX_STORE);
      var cache = global.getService(lf.service.CACHE);
      var rowIds = indexStore.get(table.getRowIdIndexName()).
          getRange(undefined, false, opt_limit, opt_skip);
      if (rowIds.length) {
        contents = cache.getMany(rowIds).map(function(row) {
          return row.payload();
        });
      }
    }
  }

  return lf.debug.toString_(contents);
};
