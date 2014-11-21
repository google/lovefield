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
goog.provide('lf.query.toSql');

goog.require('lf.Row');
goog.require('lf.Type');
goog.require('lf.query.InsertContext');


/**
 * @param {!lf.Type} type
 * @param {boolean|number|string|Date|ArrayBuffer} value
 * @return {string|number}
 * @private
 */
lf.query.escapeSqlValue_ = function(type, value) {
  switch (type) {
    case lf.Type.BOOLEAN:
      return value ? 1 : 0;

    case lf.Type.INTEGER:
    case lf.Type.NUMBER:
      return /** @type {number} */ (value);

    case lf.Type.ARRAY_BUFFER:
      // Note: Oracle format is used here.
      return '\'' + lf.Row.binToHex(/** @type {!ArrayBuffer} */ (value)) + '\'';

    default:  // datetime, string
      var val = value.toString();
      return '\'' + val + '\'';
  }
};


/**
 * @param {!lf.query.InsertContext} query
 * @return {string}
 * @private
 */
lf.query.insertToSql_ = function(query) {
  var prefix = query.allowReplace ? 'INSERT OR REPLACE' : 'INSERT';
  var columns = query.into.getColumns();
  prefix += ' INTO ' + query.into.getName() + '(';
  prefix += columns.map(function(col) { return col.getName(); }).join(', ');
  prefix += ') VALUES (';
  var sqls = query.values.map(function(row) {
    var values = columns.map(function(col) {
      var rawVal = row.payload()[col.getName()];
      return lf.query.escapeSqlValue_(col.getType(), rawVal);
    });
    return prefix + values.join(', ') + ');';
  });
  return sqls.join('\n');
};


/**
 * @param {!lf.query.BaseBuilder} builder
 * @return {string}
 */
lf.query.toSql = function(builder) {
  var query = builder.query;
  if (query instanceof lf.query.InsertContext) {
    return lf.query.insertToSql_(query);
  }

  return 'Not implemented';
};
