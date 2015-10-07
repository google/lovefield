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

goog.require('lf.ConstraintAction');
goog.require('lf.ConstraintTiming');
goog.require('lf.Exception');
goog.require('lf.Order');
goog.require('lf.Row');
goog.require('lf.Type');
goog.require('lf.eval.Registry');
goog.require('lf.schema.BaseColumn');
goog.require('lf.schema.Constraint');
goog.require('lf.schema.ForeignKeySpec');
goog.require('lf.schema.Index');
goog.require('lf.schema.Table');
goog.require('lf.structs.map');
goog.require('lf.structs.set');
goog.require('lf.type');



/**
 * Dynamic Table schema builder.
 * @constructor
 *
 * @param {string} tableName
 * @export
 */
lf.schema.TableBuilder = function(tableName) {
  this.checkNamingRules_(tableName);

  /** @private {!lf.eval.Registry} */
  this.evalRegistry_ = lf.eval.Registry.get();

  /** @private {string} */
  this.name_ = tableName;

  /** @private {!lf.structs.Map<string, !lf.Type>} */
  this.columns_ = lf.structs.map.create();

  /** @private {!lf.structs.Set<string>} */
  this.uniqueColumns_ = lf.structs.set.create();

  /** @private {!lf.structs.Set<string>} */
  this.uniqueIndices_ = lf.structs.set.create();

  /** @private {!lf.structs.Set<string>} */
  this.nullable_ = lf.structs.set.create();

  /** @private {?string} */
  this.pkName_ = null;

  /**
   * @private {!lf.structs.Map<string,
   *     !Array<!lf.schema.TableBuilder.IndexedColumn_>>}
   */
  this.indices_ = lf.structs.map.create();

  /** @private {boolean} */
  this.persistentIndex_ = false;

  /** @private {!Array<!lf.schema.ForeignKeySpec>} */
  this.fkSpecs_ = [];
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
 * @private
 */
lf.schema.TableBuilder.IndexedColumnRaw_;



/**
 * @constructor @struct
 * @private
 *
 * @param {!lf.schema.TableBuilder.IndexedColumnRaw_} raw The plain JS object as
 *     passed from clients. It is wrapped within a proper JS class, such that
 *     the rest of the code in this file does not give up compiler coverage.
 */
lf.schema.TableBuilder.IndexedColumn_ = function(raw) {
  /** @type {string} */
  this.name = raw['name'];

  /** @type {!lf.Order} */
  this.order = raw['order'];

  /** @type {boolean} */
  this.autoIncrement = raw['autoIncrement'];
};


/**
 * A set of types that are nullable by default. Columns of this type default to
 * a null value even if addNullable() is not explicitly called.
 * @type {!lf.structs.Set<!lf.Type>}
 */
lf.schema.TableBuilder.NULLABLE_TYPES_BY_DEFAULT = lf.structs.set.create([
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
 * @throws {!lf.Exception}
 */
lf.schema.TableBuilder.prototype.checkNamingRules_ = function(name) {
  if (!(/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))) {
    // 502: Naming rule violation: {0}.
    throw new lf.Exception(502, name);
  }
};


/**
 * @param {string} name
 * @private
 * @throws {!lf.Exception}
 */
lf.schema.TableBuilder.prototype.checkNameConflicts_ = function(name) {
  if (name == this.name_) {
    // 546: Indices/constraints/columns can't re-use the table name {0},
    throw new lf.Exception(546, name);
  }

  if (this.columns_.has(name) ||
      this.indices_.has(name) ||
      this.uniqueIndices_.has(name)) {
    // 503: Name {0} is already defined.
    throw new lf.Exception(503, this.name_ + '.' + name);
  }
};


/**
 * @param {!Array<!lf.schema.TableBuilder.IndexedColumn_>} columns
 * @private
 */
lf.schema.TableBuilder.prototype.checkPrimaryKey_ = function(columns) {
  var hasAutoIncrement = false;

  columns.forEach(function(column) {
    var columnType = this.columns_.get(column.name);
    hasAutoIncrement = hasAutoIncrement || column.autoIncrement;
    if (column.autoIncrement && columnType != lf.Type.INTEGER) {
      // 504: Can not use autoIncrement with a non-integer primary key.
      throw new lf.Exception(504);
    }
  }, this);

  if (hasAutoIncrement && columns.length > 1) {
    // 505: Can not use autoIncrement with a cross-column primary key.
    throw new lf.Exception(505);
  }
};


/**
 * Checks whether any primary key column is also used as a foreign key child
 * column, and throws an exception if such a column is found.
 * @private
 * @throws {!lf.Exception}
 */
lf.schema.TableBuilder.prototype.checkPrimaryKeyNotForeignKey_ = function() {
  if (goog.isNull(this.pkName_)) {
    return;
  }
  var pkColumns = this.indices_.get(this.pkName_).map(
      function(indexedColumn) {
        return indexedColumn.name;
      });

  var fkSpecIndex = 0;
  var conflict = this.fkSpecs_.some(function(fkSpec, i) {
    fkSpecIndex = i;
    return pkColumns.indexOf(fkSpec.childColumn) != -1;
  }, this);

  if (conflict) {
    // 543: Foreign key {0}. A primary key column can't also be a foreign key
    // child column.
    throw new lf.Exception(543, this.fkSpecs_[fkSpecIndex].name);
  }
};


/**
 * Checks whether the primary key index is identical (in terms of indexed
 * columns) with another explicitly added index.
 * @private
 * @throws {!lf.Exception}
 */
lf.schema.TableBuilder.prototype.checkPrimaryKeyDuplicateIndex_ = function() {
  if (goog.isNull(this.pkName_)) {
    return;
  }

  var extractName = function(indexedColumn) {
    return indexedColumn.name;
  };
  var pkColumnsJson = JSON.stringify(
      this.indices_.get(this.pkName_).map(extractName));

  this.indices_.forEach(function(indexedColumns, indexName) {
    if (indexName == this.pkName_) {
      return;
    }
    var indexedColumnNames = indexedColumns.map(extractName);
    if (JSON.stringify(indexedColumnNames) == pkColumnsJson) {
      // 544: Duplicate primary key index found at {0},
      throw new lf.Exception(544, this.name_ + '.' + indexName);
    }
  }, this);
};


/**
 * Checks whether any primary key column has also been marked as nullable.
 * @private
 * @throws {!lf.Exception}
 */
lf.schema.TableBuilder.prototype.checkPrimaryKeyNotNullable_ = function() {
  if (goog.isNull(this.pkName_)) {
    return;
  }

  this.indices_.get(this.pkName_).forEach(
      function(indexedColumn) {
        if (this.nullable_.has(indexedColumn.name)) {
          // 545: Primary key column {0} can't be marked as nullable,
          throw new lf.Exception(545, this.name_ + '.' + indexedColumn.name);
        }
      }, this);
};


/**
 * @param {string} name
 * @param {!lf.Type} type
 * @return {!lf.schema.TableBuilder}
 * @export
 */
lf.schema.TableBuilder.prototype.addColumn = function(name, type) {
  this.checkNamingRules_(name);
  this.checkNameConflicts_(name);
  this.columns_.set(name, type);
  if (lf.schema.TableBuilder.NULLABLE_TYPES_BY_DEFAULT.has(type)) {
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
 * case 2: (columns: !Array<!lf.schema.TableBuilder.IndexedColumnRaw_>)
 *   allows different ordering per-column, but more verbose.
 *
 * @param {(!Array<string>|!Array<!lf.schema.TableBuilder.IndexedColumnRaw_>)}
 *     columns
 * @param {boolean=} opt_autoInc
 * @return {!lf.schema.TableBuilder}
 * @export
 */
lf.schema.TableBuilder.prototype.addPrimaryKey = function(
    columns, opt_autoInc) {
  this.pkName_ = 'pk' + lf.schema.TableBuilder.toPascal_(this.name_);
  this.checkNamingRules_(this.pkName_);
  this.checkNameConflicts_(this.pkName_);
  var cols = this.normalizeColumns_(columns, true, undefined, opt_autoInc);
  this.checkPrimaryKey_(cols);

  if (cols.length == 1) {
    this.uniqueColumns_.add(cols[0].name);
  }
  this.uniqueIndices_.add(this.pkName_);
  this.indices_.set(this.pkName_, cols);
  return this;
};


/**
 * Creates a foreign key on a given table column.
 * @param {string} name
 * @param {!lf.schema.RawForeignKeySpec} rawSpec
 * @return {!lf.schema.TableBuilder}
 * @export
 */
lf.schema.TableBuilder.prototype.addForeignKey = function(name, rawSpec) {
  this.checkNamingRules_(name);
  this.checkNameConflicts_(name);
  var spec = new lf.schema.ForeignKeySpec(rawSpec, this.name_, name);
  if (!goog.isDef(spec.action)) {
    spec.action = lf.ConstraintAction.RESTRICT;
  }

  if (!goog.isDef(spec.timing)) {
    spec.timing = lf.ConstraintTiming.IMMEDIATE;
  }

  if (spec.action == lf.ConstraintAction.CASCADE &&
      spec.timing == lf.ConstraintTiming.DEFERRABLE) {
    // 506: Lovefield allows only immediate evaluation of cascading constraints.
    throw new lf.Exception(506);
  }

  if (!this.columns_.has(spec.childColumn)) {
    // 540: Foreign key {0} has invalid reference syntax.
    throw new lf.Exception(540, name);
  }

  this.fkSpecs_.push(spec);
  this.addIndex(
      name, [spec.childColumn],
      this.uniqueColumns_.has(spec.childColumn));
  return this;
};


/**
 * @param {string} name
 * @param {!Array<string>} columns
 * @return {!lf.schema.TableBuilder}
 * @export
 */
lf.schema.TableBuilder.prototype.addUnique = function(name, columns) {
  this.checkNamingRules_(name);
  this.checkNameConflicts_(name);
  var cols = this.normalizeColumns_(columns, true);
  if (cols.length == 1) {
    this.uniqueColumns_.add(cols[0].name);
    this.markFkIndexForColumnUnique_(cols[0].name);
  }
  this.indices_.set(name, cols);
  this.uniqueIndices_.add(name);
  return this;
};


/**
 * Marks the index corresponding to the child column of a foreign key constraint
 * as unique, if such an index exists.
 * @param {string} column The unique column.
 * @private
 */
lf.schema.TableBuilder.prototype.markFkIndexForColumnUnique_ =
    function(column) {
  this.fkSpecs_.forEach(function(fkSpec) {
    if (fkSpec.childColumn == column) {
      var indexName = fkSpec.name.split('.')[1];
      this.uniqueIndices_.add(indexName);
    }
  }, this);
};


/**
 * @param {!Array<string>} columns Names of the columns that can be nullable.
 * @return {!lf.schema.TableBuilder}
 * @export
 */
lf.schema.TableBuilder.prototype.addNullable = function(columns) {
  var cols = this.normalizeColumns_(columns, false);
  cols.forEach(function(col) {
    this.nullable_.add(col.name);
  }, this);
  return this;
};


/**
 * Mimics SQL CREATE INDEX.
 * There are two overloads of this function:
 *
 * case 1: (name, columns: !Array<string>, opt_unique, opt_order)
 *   adds an index by column names only. All columns have same ordering.
 *
 * case 2: (name, columns: !Array<!lf.schema.TableBuilder.IndexedColumnRaw_>,
 *     opt_unique)
 *   adds an index, allowing customization of ordering, but more verbose.
 *
 * @param {string} name
 * @param {!Array<string>|!Array<!lf.schema.TableBuilder.IndexedColumnRaw_>}
 *     columns
 * @param {boolean=} opt_unique Whether the index is unique, default is false.
 * @param {!lf.Order=} opt_order Order of columns, only effective when columns
 *     are array of strings, default to lf.Order.ASC.
 * @return {!lf.schema.TableBuilder}
 * @export
 */
lf.schema.TableBuilder.prototype.addIndex = function(
    name, columns, opt_unique, opt_order) {
  this.checkNamingRules_(name);
  this.checkNameConflicts_(name);
  var cols = this.normalizeColumns_(columns, true, opt_order);
  if (opt_unique) {
    this.uniqueIndices_.add(name);
  }
  this.indices_.set(name, cols);
  return this;
};


/** @export @param {boolean} value */
lf.schema.TableBuilder.prototype.persistentIndex = function(value) {
  this.persistentIndex_ = value;
};


/** @export @return {!lf.schema.Table} */
lf.schema.TableBuilder.prototype.getSchema = function() {
  this.checkPrimaryKeyNotForeignKey_();
  this.checkPrimaryKeyDuplicateIndex_();
  this.checkPrimaryKeyNotNullable_();

  var tableClass = this.generateTableClass_();
  return new tableClass();
};


/** @return {!Array<!lf.schema.ForeignKeySpec>} */
lf.schema.TableBuilder.prototype.getFkSpecs = function() {
  return this.fkSpecs_;
};


/**
 * Convert different column representations (column name only or column objects)
 * into column object array. Also performs consistency check to make sure
 * referred columns are actually defined.
 * @param {(!Array<string>|!Array<!lf.schema.TableBuilder.IndexedColumnRaw_>)}
 *     columns
 * @param {boolean} checkIndexable
 * @param {!lf.Order=} opt_order
 * @param {boolean=} opt_autoInc
 * @return {!Array<!lf.schema.TableBuilder.IndexedColumn_>} Normalized columns
 * @private
 */
lf.schema.TableBuilder.prototype.normalizeColumns_ = function(
    columns, checkIndexable, opt_order, opt_autoInc) {
  var normalized = columns;
  if (typeof(columns[0]) == 'string') {
    normalized = columns.map(function(col) {
      return new lf.schema.TableBuilder.IndexedColumn_({
        'name': col,
        'order': goog.isDefAndNotNull(opt_order) ? opt_order : lf.Order.ASC,
        'autoIncrement': opt_autoInc || false
      });
    });
  } else {  // case of IndexedColumnRaw_
    normalized = columns.map(function(col) {
      return new lf.schema.TableBuilder.IndexedColumn_(col);
    });
  }

  normalized.forEach(function(col) {
    if (!this.columns_.has(col.name)) {
      // 508: Table {0} does not have column: {1}.
      throw new lf.Exception(508, this.name_, col.name);
    }
    if (checkIndexable) {
      var type = this.columns_.get(col.name);
      if (type == lf.Type.ARRAY_BUFFER || type == lf.Type.OBJECT) {
        // 509: Attempt to index table {0} on non-indexable column {1}.
        throw new lf.Exception(509, this.name_, col.name);
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
    var columns = lf.structs.map.keys(that.columns_).map(function(colName) {
      this[colName] = new lf.schema.BaseColumn(
          this,
          colName,
          that.uniqueColumns_.has(colName),
          that.nullable_.has(colName),
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

    var indices = lf.structs.map.keys(that.indices_).map(function(indexName) {
      return new lf.schema.Index(
          that.name_,
          indexName,
          that.uniqueIndices_.has(indexName),
          generateIndexedColumns.call(this, indexName));
    }, this);

    tableClass.base(
        this, 'constructor',
        that.name_, columns, indices, that.persistentIndex_);

    var pk = !goog.isNull(that.pkName_) ?
        new lf.schema.Index(
            that.name_, that.pkName_, true,
            generateIndexedColumns.call(this, that.pkName_)) :
        null;
    var notNullable = columns.filter(function(col) {
      return !that.nullable_.has(col.getName());
    });

    /** @private {!lf.schema.Constraint} */
    this.constraint_ =
        new lf.schema.Constraint(pk, notNullable, that.getFkSpecs());

    /** @private {!Function} */
    this.rowClass_ = that.generateRowClass_(columns, indices);
  };
  goog.inherits(tableClass, lf.schema.Table);

  /** @override */
  tableClass.prototype.createRow = function(opt_value) {
    return new this.rowClass_(lf.Row.getNextId(), opt_value);
  };
  // NOTE: Can't use @export with generated classes, so using
  // goog.exportProperty instead.
  goog.exportProperty(
      tableClass.prototype, 'createRow', tableClass.prototype.createRow);

  /** @override */
  tableClass.prototype.deserializeRow = function(dbRecord) {
    var obj = {};
    this.getColumns().forEach(function(col) {
      var key = col.getName();
      var type = col.getType();
      var value = dbRecord['value'][key];
      if (type == lf.Type.ARRAY_BUFFER) {
        obj[key] = lf.Row.hexToBin(value);
      } else if (type == lf.Type.DATE_TIME) {
        obj[key] = goog.isDefAndNotNull(value) ? new Date(value) : null;
      } else {
        obj[key] = value;
      }
    }, this);
    return new this.rowClass_(dbRecord['id'], obj);
  };
  goog.exportProperty(
      tableClass.prototype, 'deserializeRow',
      tableClass.prototype.deserializeRow);

  /** @override */
  tableClass.prototype.getConstraint = function() {
    return this.constraint_;
  };
  goog.exportProperty(
      tableClass.prototype, 'getConstraint',
      tableClass.prototype.getConstraint);

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
        obj[key] = goog.isDefAndNotNull(value) ? lf.Row.binToHex(value) : null;
      } else if (type == lf.Type.DATE_TIME) {
        obj[key] = goog.isDefAndNotNull(value) ? value.getTime() : null;
      } else if (type == lf.Type.OBJECT) {
        obj[key] = goog.isDefAndNotNull(value) ? value : null;
      } else {
        obj[key] = value;
      }
    }, this);
    return obj;
  };


  /**
   * @param {!lf.schema.Column} column
   * @return {function(!Object): !lf.index.Index.Key}
   * @this {lf.schema.TableBuilder}
   */
  var getSingleKeyFn = function(column) {
    var colType = this.columns_.get(column.getName());
    var keyOfIndexFn = this.evalRegistry_.getKeyOfIndexEvaluator(colType);
    return function(payload) {
      return keyOfIndexFn(payload[column.getName()]);
    };
  }.bind(this);


  /**
   * @param {!Array<!lf.schema.IndexedColumn>} columns
   * @return {function(!Object): !lf.index.Index.Key}
   * @this {lf.schema.TableBuilder}
   */
  var getMultiKeyFn = function(columns) {
    var getSingleKeyFunctions = columns.map(
        function(indexedColumn) {
          return getSingleKeyFn(indexedColumn.schema);
        });
    return function(payload) {
      return getSingleKeyFunctions.map(function(fn) {
        return fn(payload);
      });
    };
  }.bind(this);


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
