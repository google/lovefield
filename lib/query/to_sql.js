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
goog.provide('lf.query.toSql');

goog.require('lf.Binder');
goog.require('lf.Exception');
goog.require('lf.Order');
goog.require('lf.Row');
goog.require('lf.Type');
goog.require('lf.eval.Type');
goog.require('lf.pred.CombinedPredicate');
goog.require('lf.pred.JoinPredicate');
goog.require('lf.pred.Operator');
goog.require('lf.pred.ValuePredicate');
goog.require('lf.query.DeleteContext');
goog.require('lf.query.InsertContext');
goog.require('lf.query.SelectContext');
goog.require('lf.query.UpdateContext');


/**
 * @param {!lf.Type} type
 * @param {boolean|number|string|Date|ArrayBuffer} value
 * @return {string|number}
 * @private
 */
lf.query.escapeSqlValue_ = function(type, value) {
  if (!goog.isDefAndNotNull(value)) {
    return 'NULL';
  }

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
      return '\'' + value.toString() + '\'';
  }
};


/**
 * @param {!lf.query.InsertContext} query
 * @param {boolean} stripValueInfo
 * @return {string}
 * @private
 */
lf.query.insertToSql_ = function(query, stripValueInfo) {
  var prefix = query.allowReplace ? 'INSERT OR REPLACE' : 'INSERT';
  var columns = query.into.getColumns();
  prefix += ' INTO ' + query.into.getName() + '(';
  prefix += columns.map(function(col) { return col.getName(); }).join(', ');
  prefix += ') VALUES (';
  var sqls = query.values.map(function(row) {
    var values = columns.map(function(col) {
      var rawVal = row.payload()[col.getName()];
      return stripValueInfo ?
          (goog.isDefAndNotNull(rawVal) ? '#' : 'NULL') :
          lf.query.escapeSqlValue_(col.getType(), rawVal);
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
 * @param {boolean} stripValueInfo
 * @return {string}
 * @private
 */
lf.query.valueToSql_ = function(value, op, type, stripValueInfo) {
  if (value instanceof lf.Binder) {
    return '?' + value.getIndex().toString();
  }

  if (stripValueInfo) {
    return goog.isDefAndNotNull(value) ? '#' : 'NULL';
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
 * @param {boolean} stripValueInfo
 * @return {string}
 * @private
 */
lf.query.valuePredicateToSql_ = function(pred, stripValueInfo) {
  var column = pred.column.getNormalizedName();
  var op = lf.query.evaluatorToSql_(pred.evaluatorType);
  var value = lf.query.valueToSql_(
      pred.value, pred.evaluatorType, pred.column.getType(), stripValueInfo);
  if (op == '=' && value == 'NULL') {
    return [column, 'IS NULL'].join(' ');
  } else if (op == '<>' && value == 'NULL') {
    return [column, 'IS NOT NULL'].join(' ');
  } else {
    return [column, op, value].join(' ');
  }
};


/**
 * @param {!lf.pred.CombinedPredicate} pred
 * @param {boolean} stripValueInfo
 * @return {string}
 * @private
 */
lf.query.combinedPredicateToSql_ = function(pred, stripValueInfo) {
  var children = pred.getChildren().map(function(childNode) {
    return '(' + lf.query.parseSearchCondition_(
        /** @type {!lf.Predicate} */ (childNode), stripValueInfo) + ')';
  });
  var joinToken = (pred.operator == lf.pred.Operator.AND) ? ' AND ' : ' OR ';
  return children.join(joinToken);
};


/**
 * @param {!lf.pred.JoinPredicate} pred
 * @return {string}
 * @private
 */
lf.query.joinPredicateToSql_ = function(pred) {
  return [
    pred.leftColumn.getNormalizedName(),
    lf.query.evaluatorToSql_(pred.evaluatorType),
    pred.rightColumn.getNormalizedName()
  ].join(' ');
};


/**
 * @param {!lf.Predicate} pred
 * @param {boolean} stripValueInfo
 * @return {string}
 * @private
 */
lf.query.parseSearchCondition_ = function(pred, stripValueInfo) {
  if (pred instanceof lf.pred.ValuePredicate) {
    return lf.query.valuePredicateToSql_(pred, stripValueInfo);
  } else if (pred instanceof lf.pred.CombinedPredicate) {
    return lf.query.combinedPredicateToSql_(pred, stripValueInfo);
  } else if (pred instanceof lf.pred.JoinPredicate) {
    return lf.query.joinPredicateToSql_(pred);
  }

  // 357: toSql() does not support predicate type: {0}.
  throw new lf.Exception(357, typeof(pred));
};


/**
 * @param {!lf.Predicate} pred
 * @param {boolean} stripValueInfo
 * @return {string}
 * @private
 */
lf.query.predicateToSql_ = function(pred, stripValueInfo) {
  var whereClause = lf.query.parseSearchCondition_(pred, stripValueInfo);
  if (whereClause) {
    return ' WHERE ' + whereClause;
  }
  return '';
};


/**
 * @param {!lf.query.DeleteContext} query
 * @param {boolean} stripValueInfo
 * @return {string}
 * @private
 */
lf.query.deleteToSql_ = function(query, stripValueInfo) {
  var sql = 'DELETE FROM ' + query.from.getName();
  if (query.where) {
    sql += lf.query.predicateToSql_(query.where, stripValueInfo);
  }
  sql += ';';
  return sql;
};


/**
 * @param {!lf.query.UpdateContext} query
 * @param {boolean} stripValueInfo
 * @return {string}
 * @private
 */
lf.query.updateToSql_ = function(query, stripValueInfo) {
  var sql = 'UPDATE ' + query.table.getName() + ' SET ';
  sql += query.set.map(function(set) {
    var setter = set.column.getNormalizedName() + ' = ';
    if (set.binding != -1) {
      return setter + '?' + set.binding.toString();
    }
    return setter + lf.query.escapeSqlValue_(
        set.column.getType(),
        /** @type {ArrayBuffer|Date|boolean|null|number|string} */
        (set.value)).toString();
  }).join(', ');
  if (query.where) {
    sql += lf.query.predicateToSql_(query.where, stripValueInfo);
  }
  sql += ';';
  return sql;
};


/**
 * @param {!lf.query.SelectContext} query
 * @param {boolean} stripValueInfo
 * @return {string}
 * @private
 */
lf.query.selectToSql_ = function(query, stripValueInfo) {
  var colList = '*';
  if (query.columns.length) {
    colList = query.columns.map(function(col) {
      if (col.getAlias()) {
        return col.getNormalizedName() + ' AS ' + col.getAlias();
      } else {
        return col.getNormalizedName();
      }
    }).join(', ');
  }

  var fromList = query.from.map(function(table) {
    if (table.getEffectiveName() != table.getName()) {
      return table.getName() + ' AS ' + table.getEffectiveName();
    } else {
      return table.getName();
    }
  }).join(', ');

  var sql = 'SELECT ' + colList + ' FROM ' + fromList;
  if (query.where) {
    sql += lf.query.predicateToSql_(query.where, stripValueInfo);
  }

  if (query.orderBy) {
    var orderBy = query.orderBy.map(function(order) {
      return order.column.getNormalizedName() +
          ((order.order == lf.Order.DESC) ? ' DESC' : ' ASC');
    }).join(', ');
    sql += ' ORDER BY ' + orderBy;
  }

  if (query.groupBy) {
    var groupBy = query.groupBy.map(function(col) {
      return col.getNormalizedName();
    }).join(', ');
    sql += ' GROUP BY ' + groupBy;
  }

  if (query.limit) {
    sql += ' LIMIT ' + query.limit.toString();
  }

  if (query.skip) {
    sql += ' SKIP ' + query.skip.toString();
  }

  sql += ';';
  return sql;
};


/**
 * @param {!lf.query.BaseBuilder} builder
 * @param {boolean=} opt_stripValueInfo Strip value, default to false. This is
 *     used to remove all PII.
 * @return {string}
 */
lf.query.toSql = function(builder, opt_stripValueInfo) {
  var stripValueInfo = opt_stripValueInfo || false;
  var query = builder.getQuery();

  if (query instanceof lf.query.InsertContext) {
    return lf.query.insertToSql_(query, stripValueInfo);
  }

  if (query instanceof lf.query.DeleteContext) {
    return lf.query.deleteToSql_(query, stripValueInfo);
  }

  if (query instanceof lf.query.UpdateContext) {
    return lf.query.updateToSql_(query, stripValueInfo);
  }

  if (query instanceof lf.query.SelectContext) {
    return lf.query.selectToSql_(query, stripValueInfo);
  }

  // 358: toSql() is not implemented for {0}.
  throw new lf.Exception(358, typeof(query));
};
