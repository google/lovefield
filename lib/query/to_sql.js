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

goog.require('lf.Binder');
goog.require('lf.Row');
goog.require('lf.Type');
goog.require('lf.eval.Type');
goog.require('lf.pred.CombinedPredicate');
goog.require('lf.pred.Operator');
goog.require('lf.pred.ValuePredicate');
goog.require('lf.query.DeleteContext');
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
 * @param {!lf.eval.Type} op
 * @return {string}
 * @private
 */
lf.query.evaluatorToSql_ = function(op) {
  switch (op) {
    case lf.eval.Type.BETWEEN:
      return 'BETWEEN';
    case lf.eval.Type.EQ:
      return '=';
    case lf.eval.Type.GTE:
      return '>=';
    case lf.eval.Type.GT:
      return '>';
    case lf.eval.Type.IN:
      return 'IN';
    case lf.eval.Type.LTE:
      return '<=';
    case lf.eval.Type.LT:
      return '<';
    case lf.eval.Type.MATCH:
      return 'LIKE';
    case lf.eval.Type.NEQ:
      return '<>';
    default:
      return 'UNKNOWN';
  }
};


/**
 * @param {!lf.Binder|Array|ArrayBuffer|Date|boolean|null|number|string} value
 * @param {!lf.eval.Type} op
 * @param {!lf.Type} type
 * @return {string}
 * @private
 */
lf.query.valueToSql_ = function(value, op, type) {
  if (value instanceof lf.Binder) {
    return '?';
  } else if (op == lf.eval.Type.MATCH) {
    return '\'' + value.toString() + '\'';
  } else if (op == lf.eval.Type.IN) {
    var array = /** @type {Array} */ (value);
    var vals = array.map(function(e) {
      return lf.query.escapeSqlValue_(type, e);
    });
    return '(' + vals.join(', ') + ')';
  } else if (op == lf.eval.Type.BETWEEN) {
    return lf.query.escapeSqlValue_(type, value[0]) +
        ' AND ' +
        lf.query.escapeSqlValue_(type, value[1]);
  }

  return lf.query.escapeSqlValue_(
      type,
      /** @type {ArrayBuffer|Date|boolean|null|number|string} */
      (value)).toString();
};


/**
 * @param {!lf.pred.ValuePredicate} pred
 * @return {string}
 * @private
 */
lf.query.valuePredicateToSql_ = function(pred) {
  return [
    pred.column.getNormalizedName(),
    lf.query.evaluatorToSql_(pred.evaluatorType),
    lf.query.valueToSql_(pred.value, pred.evaluatorType, pred.column.getType())
  ].join(' ');
};


/**
 * @param {!lf.pred.CombinedPredicate} pred
 * @return {string}
 * @private
 */
lf.query.combinedPredicateToSql_ = function(pred) {
  var children = pred.getChildren().map(function(childNode) {
    return '(' + lf.query.parseSearchCondition_(
        /** @type {!lf.Predicate} */ (childNode)) + ')';
  });
  var joinToken = (pred.operator == lf.pred.Operator.AND) ? ' AND ' : ' OR ';
  return children.join(joinToken);
};


/**
 * @param {!lf.Predicate} pred
 * @return {string}
 * @private
 */
lf.query.parseSearchCondition_ = function(pred) {
  if (pred instanceof lf.pred.ValuePredicate) {
    return lf.query.valuePredicateToSql_(pred);
  } else if (pred instanceof lf.pred.CombinedPredicate) {
    return lf.query.combinedPredicateToSql_(pred);
  }
  // TODO(arthurhsu): implement JoinPredicate case.

  return '';
};


/**
 * @param {!lf.Predicate} pred
 * @return {string}
 * @private
 */
lf.query.predicateToSql_ = function(pred) {
  var whereClause = lf.query.parseSearchCondition_(pred);
  if (whereClause) {
    return ' WHERE ' + whereClause;
  }
  return '';
};


/**
 * @param {!lf.query.DeleteContext} query
 * @return {string}
 * @private
 */
lf.query.deleteToSql_ = function(query) {
  var sql = 'DELETE FROM ' + query.from.getName();
  if (query.where) {
    sql += lf.query.predicateToSql_(query.where);
  }
  sql += ';';
  return sql;
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

  if (query instanceof lf.query.DeleteContext) {
    return lf.query.deleteToSql_(query);
  }

  return 'Not implemented';
};
