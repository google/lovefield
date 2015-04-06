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
  this.name_ = name;

  /** @private {!function(!lf.Row.Raw): !lf.Row} */
  this.deserializeFn_ = deserializeFn;
};


/** @override */
lf.backstore.WebSqlTable.prototype.get = function(ids) {
  var where = (ids.length == 0) ? '' :
      'WHERE id IN (' + ids.join(',') + ')';

  var sql = 'SELECT id, value FROM ' + this.name_ + ' ' + where;
  var resolver = goog.Promise.withResolver();
  var deserializeFn = this.deserializeFn_;
  this.tx_.execSql(sql, []).then(function(results) {
    var length = results.rows.length;
    var rows = [];
    for (var i = 0; i < length; ++i) {
      rows.push(deserializeFn(/** @type {!lf.Row.Raw} */ ({
        id: results.rows.item(i)['id'],
        value: JSON.parse(results.rows.item(i)['value'])
      })));
    }
    resolver.resolve(rows);
  }, function(e) {
    resolver.reject(e);
  });

  return resolver.promise;
};


/** @override */
lf.backstore.WebSqlTable.prototype.put = function(rows) {
  if (rows.length == 0) {
    return goog.Promise.resolve();
  }

  var sql = 'INSERT OR REPLACE INTO ' + this.name_ + '(id, value) ' +
      'VALUES (?, ?)';
  var promises = rows.map(function(row) {
    return this.tx_.execSql(sql, [row.id(), JSON.stringify(row.payload())]);
  }, this);

  return goog.Promise.all(promises);
};


/** @override */
lf.backstore.WebSqlTable.prototype.remove = function(ids) {
  var where = (ids.length == 0) ? '' :
      'WHERE id IN (' + ids.join(',') + ')';

  var sql = 'DELETE FROM ' + this.name_ + ' ' + where;
  return this.tx_.execSql(sql, []);
};
