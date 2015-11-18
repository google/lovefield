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
goog.provide('lf.backstore.WebSqlTable');

goog.require('goog.Promise');
goog.require('lf.Table');



/**
 * Table stream based on a given WebSQL table.
 * @constructor
 * @struct
 * @final
 * @implements {lf.Table}
 *
 * @param {!lf.backstore.WebSqlTx} tx
 * @param {string} name
 * @param {!function(!lf.Row.Raw): !lf.Row} deserializeFn
 */
lf.backstore.WebSqlTable = function(tx, name, deserializeFn) {
  /** @private {!lf.backstore.WebSqlTx} */
  this.tx_ = tx;

  /** @private {string} */
  this.name_ = '"' + name + '"';  // Escape the string by default.

  /** @private {!function(!lf.Row.Raw): !lf.Row} */
  this.deserializeFn_ = deserializeFn;
};


/** @override */
lf.backstore.WebSqlTable.prototype.get = function(ids) {
  var where = (ids.length == 0) ? '' :
      'WHERE id IN (' + ids.join(',') + ')';

  var sql = 'SELECT id, value FROM ' + this.name_ + ' ' + where;
  var deserializeFn = this.deserializeFn_;

  /**
   * @param {!Object} results
   * @return {!Array<!lf.Row.Raw>}
   */
  var transformer = function(results) {
    var length = results.rows.length;
    var rows = new Array(length);
    for (var i = 0; i < length; ++i) {
      rows[i] = deserializeFn(/** @type {!lf.Row.Raw} */ ({
        id: results.rows.item(i)['id'],
        value: JSON.parse(results.rows.item(i)['value'])
      }));
    }
    return rows;
  };

  return this.tx_.queue(sql, [], transformer);
};


/** @override */
lf.backstore.WebSqlTable.prototype.put = function(rows) {
  if (rows.length == 0) {
    return goog.Promise.resolve();
  }

  var sql = 'INSERT OR REPLACE INTO ' + this.name_ + '(id, value) ' +
      'VALUES (?, ?)';
  rows.forEach(function(row) {
    this.tx_.queue(sql, [row.id(), JSON.stringify(row.payload())]);
  }, this);

  return goog.Promise.resolve();
};


/** @override */
lf.backstore.WebSqlTable.prototype.remove = function(ids) {
  var where = (ids.length == 0) ? '' :
      'WHERE id IN (' + ids.join(',') + ')';

  var sql = 'DELETE FROM ' + this.name_ + ' ' + where;
  this.tx_.queue(sql, []);
  return goog.Promise.resolve();
};
