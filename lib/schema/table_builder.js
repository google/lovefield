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
goog.provide('lf.schema.TableBuilder');

goog.require('goog.structs.Map');
goog.require('goog.structs.Set');
goog.require('lf.Exception');
goog.require('lf.Order');
goog.require('lf.Row');
goog.require('lf.Type');
goog.require('lf.schema.BaseColumn');
goog.require('lf.schema.Constraint');
goog.require('lf.schema.Index');
goog.require('lf.schema.Table');
goog.require('lf.type');



/**
 * Dynamic Table schema builder.
 * @constructor
 *
 * @param {string} tableName
 */
lf.schema.TableBuilder = function(tableName) {
  /** @private {string} */
  this.name_ = tableName;

  /** @private {!goog.structs.Map<string, !lf.Type>} */
  this.columns_ = new goog.structs.Map();

  /** @private {!goog.structs.Set<string>} */
  this.uniqueColumns_ = new goog.structs.Set();

  /** @private {!goog.structs.Set<string>} */
  this.uniqueIndices_ = new goog.structs.Set();

  /** @private {!goog.structs.Set<string>} */
  this.nullable_ = new goog.structs.Set();

  /** @private {string} */
  this.pkName_ = 'pk' + lf.schema.TableBuilder.toPascal_(this.name_);

  /**
   * @private {!goog.structs.Map<string,
   *     !Array<!lf.schema.TableBuilder.IndexedColumn>>}
   */
  this.indices_ = new goog.structs.Map();

  /** @private {boolean} */
  this.persistentIndex_ = false;

  this.checkName_(tableName);
};


/**
 * A intermediate representation of an IndexedColumn used while this table's
 * declaration is still in progress. Once this table's schema is finalized it is
 * convered to a proper lf.schema.IndexedColumn object.
 * @typedef {{
 *   name: string,
 *   order: !lf.Order,
 *   autoIncrement: boolean
 * }}
 */
lf.schema.TableBuilder.IndexedColumn;


/**
 * A set of types that are nullable by default. Columns of this type default to
 * a null value even if addNullable() is not explicitly called.
 * @type {!goog.structs.Set<!lf.Type>}
 */
lf.schema.TableBuilder.NULLABLE_TYPES_BY_DEFAULT = new goog.structs.Set([
  lf.Type.ARRAY_BUFFER,
  lf.Type.OBJECT
]);


/**
 * @param {string} name
 * @return {string}
 * @private
 * @see http://en.wikipedia.org/wiki/CamelCase
 */
lf.schema.TableBuilder.toPascal_ = function(name) {
  return name[0].toUpperCase() + name.substring(1);
};


/**
 * @param {string} name
 * @private
 */
lf.schema.TableBuilder.prototype.checkName_ = function(name) {
  if (!(/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))) {
    throw new lf.Exception(lf.Exception.Type.SYNTAX,
        name + ' violates naming rule');
  }
  if (this.columns_.containsKey(name) ||
      this.indices_.containsKey(name) ||
      this.uniqueIndices_.contains(name)) {
    throw new lf.Exception(lf.Exception.Type.SYNTAX,
        this.name_ + '.' + name + ' is already defined');
  }
};


/**
 * @param {!Array<!lf.schema.TableBuilder.IndexedColumn>} columns
 * @private
 */
lf.schema.TableBuilder.prototype.checkPrimaryKey_ = function(columns) {
  var hasAutoIncrement = false;

  columns.forEach(function(column) {
    var columnType = this.columns_.get(column.name);
    hasAutoIncrement = hasAutoIncrement || column.autoIncrement;
    if (column.autoIncrement && columnType != lf.Type.INTEGER) {
      throw new lf.Exception(lf.Exception.Type.SYNTAX,
          'Can not use autoIncrement with a non-integer primary key.');
    }
  }, this);

  if (hasAutoIncrement && columns.length > 1) {
    throw new lf.Exception(lf.Exception.Type.SYNTAX,
        'Can not use autoIncrement with a cross-column primary key.');

  }
};


/**
 * @param {string} name
 * @param {!lf.Type} type
 * @return {!lf.schema.TableBuilder}
 * @export
 */
lf.schema.TableBuilder.prototype.addColumn = function(name, type) {
  this.checkName_(name);
  this.columns_.set(name, type);
  if (lf.schema.TableBuilder.NULLABLE_TYPES_BY_DEFAULT.contains(type)) {
    this.addNullable([name]);
  }
  return this;
};


/**
 * Adds a primary key to table.
 * There are two overloads of this function:
 *
 * case 1: (columns: !Array<string>, opt_autoInc)
 *   specifies primary key by given only column names with default ascending
 *   orders (lf.Order.ASC). When opt_autoInc is true, there can be only one
 *   column in the columns, its type must be lf.Type.INTEGER, and its order
 *   must be the default lf.Order.ASC.
 *
 * case 2: (columns: !Array<!lf.schema.TableBuilder.IndexedColumn>)
 *   allows different ordering per-column, but more verbose.
 *
 * @param {(!Array<string>|!Array<!lf.schema.TableBuilder.IndexedColumn>)} columns
 * @param {boolean=} opt_autoInc
 * @return {!lf.schema.TableBuilder}
 * @export
 */
lf.schema.TableBuilder.prototype.addPrimaryKey = function(
    columns, opt_autoInc) {
  this.checkName_(this.pkName_);
  var cols = this.normalizeColumns_(columns, true, undefined, opt_autoInc);
  this.checkPrimaryKey_(cols);

  cols.forEach(function(col) {
    this.uniqueColumns_.add(col.name);
  }, this);
  this.uniqueIndices_.add(this.pkName_);
  this.indices_.set(this.pkName_, cols);
  return this;
};


/**
 * Creates a foreign key on a given table column. The caller is responsible to
 * make sure the local column and the referred column are of the same data type.
 * @param {string} name
 * @param {string} localColumn
 * @param {string} remoteTable
 * @param {string} remoteColumn
 * @param {boolean=} opt_cascade If true, deleting/updating a row on the remote
 *     table will cause cascading deletion/update of the local table rows.
 * @return {!lf.schema.TableBuilder}
 * @export
 */
lf.schema.TableBuilder.prototype.addForeignKey = function(
    name, localColumn, remoteTable, remoteColumn, opt_cascade) {
  // TODO(arthurhsu): implement.
  return this;
};


/**
 * @param {string} name
 * @param {!Array<string>} columns
 * @return {!lf.schema.TableBuilder}
 * @export
 */
lf.schema.TableBuilder.prototype.addUnique = function(name, columns) {
  this.checkName_(name);
  var cols = this.normalizeColumns_(columns, true);
  this.indices_.set(name, cols);
  this.uniqueIndices_.add(name);
  return this;
};


/**
 * @param {!Array<string>} columns Names of the columns that can be nullable.
 * @return {!lf.schema.TableBuilder}
 * @export
 */
lf.schema.TableBuilder.prototype.addNullable = function(columns) {
  var cols = this.normalizeColumns_(columns, false);
  this.checkNullableColumns_(cols);
  cols.forEach(function(col) {
    this.nullable_.add(col.name);
  }, this);
  return this;
};


/**
 * Checks whether any of the given columns is referred by a cross-column index.
 * @param {!Array<lf.schema.TableBuilder.IndexedColumn>} columns
 * @private
 */
lf.schema.TableBuilder.prototype.checkNullableColumns_ = function(columns) {
  this.indices_.getKeys().forEach(
      function(indexName) {
        var indexedColumnNames = new goog.structs.Set();
        this.indices_.get(indexName).forEach(
            function(indexedColumn) {
              indexedColumnNames.add(indexedColumn.name);
            });

        var nullableColumns = columns.filter(
            function(nullableColumn) {
              return indexedColumnNames.contains(nullableColumn.name);
            });

        if (indexedColumnNames.getCount() > 1 && nullableColumns.length > 0) {
          // Cross-column indices can not refer to nullable columns.
          throw new lf.Exception(
              lf.Exception.Type.SYNTAX,
              'Cross-column index ' + indexName +
                  ' refers to nullable columns: ' + nullableColumns.join(','));
        }
      }, this);
};


/**
 * Mimics SQL CREATE INDEX.
 * There are two overloads of this function:
 *
 * case 1: (name, columns: !Array<string>, opt_unique, opt_order)
 *   adds an index by column names only. All columns have same ordering.
 *
 * case 2: (name, columns: !Array<!lf.schema.TableBuilder.IndexedColumn>,
 *     opt_unique)
 *   adds an index, allowing customization of ordering, but more verbose.
 *
 * @param {string} name
 * @param {!Array<string> | !Array<!lf.schema.TableBuilder.IndexedColumn>}
 *     columns
 * @param {boolean=} opt_unique Whether the index is unique, default is false.
 * @param {!lf.Order=} opt_order Order of columns, only effective when columns
 *     are array of strings, default to lf.Order.ASC.
 * @return {!lf.schema.TableBuilder}
 * @export
 */
lf.schema.TableBuilder.prototype.addIndex = function(
    name, columns, opt_unique, opt_order) {
  this.checkName_(name);
  var cols = this.normalizeColumns_(columns, true, opt_order);
  this.checkIndexedColumns_(name, cols);
  if (opt_unique) {
    this.uniqueIndices_.add(name);
  }
  this.indices_.set(name, cols);
  return this;
};


/**
 * Checks whether any of the given columns has been marked as nullable, for the
 * case of cross-column indices.
 * @param {string} indexName
 * @param {!Array<!lf.schema.TableBuilder.IndexedColumn>} columns
 * @private
 */
lf.schema.TableBuilder.prototype.checkIndexedColumns_ = function(
    indexName, columns) {
  if (columns.length > 1) {
    // Cross-column indices can not refer to nullable columns.
    var nullableColumns = columns.filter(function(column) {
      return this.nullable_.contains(column.name);
    }, this);

    if (nullableColumns.length > 0) {
      throw new lf.Exception(
          lf.Exception.Type.SYNTAX,
          'Cross-column index ' + indexName +
              ' refers to nullable columns: ' + nullableColumns.join(','));
    }
  }
};


/** @export @param {boolean} value */
lf.schema.TableBuilder.prototype.persistentIndex = function(value) {
  this.persistentIndex_ = value;
};


/** @export @return {!lf.schema.Table} */
lf.schema.TableBuilder.prototype.getSchema = function() {
  var tableClass = this.generateTableClass_();
  return new tableClass();
};


/**
 * Convert different column representations (column name only or column objects)
 * into column object array. Also performs consistency check to make sure
 * referred columns are actually defined.
 * @param {(!Array<string>|!Array<!lf.schema.TableBuilder.IndexedColumn>)} columns
 * @param {boolean} checkIndexable
 * @param {!lf.Order=} opt_order
 * @param {boolean=} opt_autoInc
 * @return {!Array<!lf.schema.TableBuilder.IndexedColumn>} Normalized columns
 * @private
 */
lf.schema.TableBuilder.prototype.normalizeColumns_ = function(
    columns, checkIndexable, opt_order, opt_autoInc) {
  var normalized = columns;
  if (typeof(columns[0]) == 'string') {
    normalized = columns.map(function(col) {
      return {
        'name': col,
        'order': opt_order || lf.Order.ASC,
        'autoIncrement': opt_autoInc || false
      };
    });
  }

  normalized.forEach(function(col) {
    if (!this.columns_.containsKey(col.name)) {
      throw new lf.Exception(
          lf.Exception.Type.SYNTAX,
          this.name_ + ' does not have column: ' + col.name);
    }
    if (checkIndexable) {
      var type = this.columns_.get(col.name);
      if (type == lf.Type.ARRAY_BUFFER || type == lf.Type.OBJECT) {
        throw new lf.Exception(
            lf.Exception.Type.SYNTAX,
            this.name_ + ' index on non-indexable column: ' + col.name);
      }
    }
  }, this);

  return normalized;
};


/**
 * @return {!Function}
 * @private
 */
lf.schema.TableBuilder.prototype.generateTableClass_ = function() {
  var that = this;

  /**
   * @constructor
   * @extends {lf.schema.Table}
   */
  var tableClass = function() {
    var columns = that.columns_.getKeys().map(function(colName) {
      this[colName] = new lf.schema.BaseColumn(
          this,
          colName,
          that.uniqueColumns_.contains(colName),
          that.nullable_.contains(colName),
          that.columns_.get(colName));
      return this[colName];
    }, this);

    var generateIndexedColumns = function(indexName) {
      return that.indices_.get(indexName).map(
          function(indexedColumn) {
            return {
              schema: this[indexedColumn.name],
              order: indexedColumn.order,
              autoIncrement: indexedColumn.autoIncrement
            };
          }, this);
    };

    var indices = that.indices_.getKeys().map(function(indexName) {
      return new lf.schema.Index(
          that.name_,
          indexName,
          that.uniqueIndices_.contains(indexName),
          generateIndexedColumns.call(this, indexName));
    }, this);

    tableClass.base(
        this, 'constructor',
        that.name_, columns, indices, that.persistentIndex_);

    var pk = that.indices_.containsKey(that.pkName_) ?
        new lf.schema.Index(
            that.name_, that.pkName_, true,
            generateIndexedColumns.call(this, that.pkName_)) :
        null;
    var notNullable = columns.filter(function(col) {
      return !that.nullable_.contains(col.getName());
    });
    var foreignKeys = [];
    var unique = that.uniqueIndices_.getValues().map(function(indexName) {
      return new lf.schema.Index(
          that.name_, indexName, true,
          generateIndexedColumns.call(this, indexName));
    }, this);

    /** @private {!lf.schema.Constraint} */
    this.constraint_ =
        new lf.schema.Constraint(pk, notNullable, foreignKeys, unique);

    /** @private {!Function} */
    this.rowClass_ = that.generateRowClass_(columns, indices);
  };
  goog.inherits(tableClass, lf.schema.Table);

  /** @override */
  tableClass.prototype.createRow = function(opt_value) {
    return new this.rowClass_(lf.Row.getNextId(), opt_value);
  };

  /** @override */
  tableClass.prototype.deserializeRow = function(dbRecord) {
    var obj = {};
    this.getColumns().forEach(function(col) {
      var key = col.getName();
      var type = col.getType();
      var value = dbRecord['value'][key];
      if (type == lf.Type.ARRAY_BUFFER) {
        obj[key] = goog.isNull(value) ? value : lf.Row.hexToBin(value);
      } else if (type == lf.Type.DATE_TIME) {
        obj[key] = goog.isNull(value) ? value : new Date(value);
      } else {
        obj[key] = value;
      }
    }, this);
    return new this.rowClass_(dbRecord['id'], obj);
  };

  /** @override */
  tableClass.prototype.getConstraint = function() {
    return this.constraint_;
  };

  return tableClass;
};


/**
 * @param {!Array<!lf.schema.Column>} columns
 * @param {!Array<!lf.schema.Index>} indices
 * @return {!Function}
 * @private
 */
lf.schema.TableBuilder.prototype.generateRowClass_ = function(
    columns, indices) {
  /**
   * @param {number} rowId
   * @param {!Object=} opt_payload
   * @extends {lf.Row}
   * @constructor
   */
  var rowClass = function(rowId, opt_payload) {
    /** @private {!Array<!lf.schema.Column>} */
    this.columns_ = columns;

    /** @private {!Array<!lf.schema.Index>} */
    this.indices_ = indices;

    // Placed here so that defaultPayload() can run correctly.
    rowClass.base(this, 'constructor', rowId, opt_payload);
  };
  goog.inherits(rowClass, lf.Row);

  /** @override */
  rowClass.prototype.defaultPayload = function() {
    var obj = {};
    this.columns_.forEach(function(col) {
      obj[col.getName()] = col.isNullable() ?
          null : lf.type.DEFAULT_VALUES[col.getType()];
    });
    return obj;
  };

  /** @override */
  rowClass.prototype.toDbPayload = function() {
    var obj = {};
    this.columns_.forEach(function(col) {
      var key = col.getName();
      var type = col.getType();
      var value = this.payload()[key];
      if (type == lf.Type.ARRAY_BUFFER) {
        obj[key] = goog.isNull(value) ? value : lf.Row.binToHex(value);
      } else if (type == lf.Type.DATE_TIME) {
        obj[key] = goog.isNull(value) ? value : value.getTime();
      } else {
        obj[key] = value;
      }
    }, this);
    return obj;
  };


  /**
   * @param {!lf.schema.Column} column
   * @return {function(!Object): !lf.index.Index.Key}
   */
  var getSingleKeyFn = goog.bind(function(column) {
    var colType = this.columns_.get(column.getName());
    if (colType == lf.Type.DATE_TIME) {
      return function(payload) {
        var value = payload[column.getName()];
        return column.isNullable() && goog.isNull(value) ?
            null : value.getTime();
      }
    } else if (colType == lf.Type.BOOLEAN) {
      return function(payload) {
        if (column.isNullable()) {
          var value = payload[column.getName()];
          return goog.isNull(value) ? null : (value ? 1 : 0);
        } else {
          return payload[column.getName()] ? 1 : 0;
        }
      }
    } else {
      return function(payload) {
        return payload[column.getName()];
      }
    }
  }, this);


  /**
   * @param {!Array<!lf.schema.IndexedColumn>} columns
   * @return {function(!Object): !lf.index.Index.Key}
   */
  var getMultiKeyFn = goog.bind(function(columns) {
    var getSingleKeyFunctions = columns.map(
        function(indexedColumn) {
          return getSingleKeyFn(indexedColumn.schema);
        });
    return function(payload) {
      return getSingleKeyFunctions.map(function(fn) {
        return fn(payload);
      });
    };
  }, this);


  /**
   * @param {!lf.schema.Index} index
   * @return {function(!Object): !lf.index.Index.Key}
   */
  var getKeyOfIndexFn = function(index) {
    return index.columns.length == 1 ?
        getSingleKeyFn(index.columns[0].schema) :
        getMultiKeyFn(index.columns);
  };

  var functionMap = {};
  indices.forEach(function(index) {
    var key = index.getNormalizedName();
    functionMap[key] = getKeyOfIndexFn(index);
  });


  /** @override */
  rowClass.prototype.keyOfIndex = function(indexName) {
    if (indexName.indexOf('#') != -1) {
      return /** @type {!lf.index.Index.Key} */ (this.id());
    }
    if (functionMap.hasOwnProperty(indexName)) {
      return functionMap[indexName](this.payload());
    }
    return null;
  };

  return rowClass;
};
