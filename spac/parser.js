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

/**
 * @fileoverview YAML schema parser which converts the schema into a JS
 * object for code generator.
 */


/**
 * The typedef to make Closure compiler happy about js-yaml.safeLoad().
 * @typedef {{
 *   safeLoad: function(string):!Object
 * }}
 * @private
 */
var YAML_;

var yaml = /** @type {YAML_} */ (require('js-yaml'));


/** @const {!Object} */
var DB_SCHEMA = {
  'name': 'string',
  'version': 'integer',
  'pragma=': 'object',
  'table': 'object'
};


/** @const {!Object} */
var TABLE_SCHEMA = {
  'column': 'object',
  'constraint=': 'object',
  'index=': 'object',
  'pragma=': 'object'
};


/** @const {!Object} */
var CONSTRAINT_SCHEMA = {
  'primaryKey=': 'array',
  'unique=': 'object',
  'nullable=': 'array',
  'foreignKey=': 'object'
};


/** @const {!Object} */
var UNIQUE_SCHEMA = {
  'column': 'array'
};


/** @const {!Object} */
var FOREIGN_KEY_SCHEMA = {
  'localColumn': 'string',
  'reference': 'string',
  'remoteColumn': 'string',
  'cascade=': 'boolean'
};


/** @const {!Object} */
var INDEX_SCHEMA = {
  'column': 'array',
  'order=': 'string',
  'unique=': 'boolean'
};


/** @const {!Array<string>} */
var VALID_COLUMN_TYPE = [
  'arraybuffer',
  'boolean',
  'datetime',
  'integer',
  'number',
  'object',
  'string'
];


/** @const {!Array<string>} */
var NON_INDEXABLE_TYPE = [
  'arraybuffer',
  'object'
];


/** @const {!Array<string>} */
var VALID_INDEX_ORDER = ['asc', 'desc'];


/** @const {!Array<string>} */
var INVALID_DB_NAMES = ['Db', 'Transaction'];


/** @param {string} name */
function checkName(name) {
  if (!/^[a-zA-Z_][0-9a-zA-Z_]*$/.test(name)) {
    throw new Error(name + ' has illegal characters.');
  }
}


/**
 * @param {string} name
 * @param {*} data
 * @param {string} type
 */
function checkDataType(name, data, type) {
  if (typeof(data) != type) {
    throw new Error(name + ' has wrong type: expected ' + type);
  }
}


/**
 * Checks if an object conforms with the schema rule.
 * @param {string} name Name of the object.
 * @param {!Object} rule Schema rule for verification.
 * @param {!Object} data The object to verify.
 */
function checkObject(name, rule, data) {
  for (var key in rule) {
    var optional = (key.slice(-1) == '=');
    var fieldName = name + '.' + key;

    if (data.hasOwnProperty(key)) {
      checkName(key);
      switch (rule[key]) {
        case 'string':
        case 'boolean':
          checkDataType(fieldName, data[key], rule[key]);
          break;

        case 'number':
        case 'integer':
          checkDataType(fieldName, data[key], 'number');
          if (isNaN(parseInt(data[key], 10))) {
            throw new Error(fieldName + ' is not an integer');
          }
          break;

        case 'array':
          if (!data[key].length) {
            throw new Error(fieldName + ' should not be empty');
          }
          break;

        case 'object':
          if (!(data[key] != null)) {  // !goog.isDefAndNotNull
            throw new Error(fieldName + ' should be defined and not null');
          }
          break;

        default:
          throw new Error('Rule syntax error');
      }
    } else if (!optional) {
      throw new Error('Missing ' + fieldName);
    }
  }
}


/**
 * @param {string} tableName
 * @param {!Object} schema The constraint section of schema
 * @param {!Array<string>} colNames Column names in this table.
 * @param {!Array<string>} names Names of unique identifiers in table, this
 *     function will insert entries into it as side effect.
 * @return {!Array<string>} Columns associated.
 */
function convertPrimaryKey(tableName, schema, colNames, names) {
  var keyName = 'pk' + tableName;

  if (names.indexOf(keyName) != -1) {
    throw new Error('Primary key name conflicts with column name: ' + keyName);
  }

  var givenPK = schema.primaryKey;
  if (givenPK.length == 0) {
    throw new Error('Primary key of ' + tableName + ' is empty.');
  }
  var pk;
  if (typeof(givenPK[0]) == 'string') {
    pk = givenPK.map(function(colName) {
      return {'name': colName, 'order': 'asc'};
    });
  } else {
    pk = givenPK.map(function(obj) {
      if (obj.order && VALID_INDEX_ORDER.indexOf(obj.order) == -1) {
        throw new Error('Primary key of ' + tableName + ' has invalid order.');
      }
      if (obj.order == 'desc' && obj.autoIncrement) {
        throw new Error('Primary key of ' + tableName +
            ' try to autoIncrement in descending order.');
      }
      if (obj.column) {
        return {
          'name': obj.column,
          'order': obj.order || 'asc',
          'autoIncrement': obj.autoIncrement
        };
      } else {
        throw new Error('Primary key of ' + tableName + ' has empty column.');
      }
    });
  }

  var notNullable = pk.map(function(keyCol) {
    if (colNames.indexOf(keyCol.name) == -1) {
      throw new Error('Primary key of ' + tableName + ' has invalid column');
    }
    return keyCol.name;
  });
  schema.primaryKey = pk;
  names.push(keyName);
  return notNullable;
}


/**
 * Checks if an invalid usage of "auto-increment" occurred.
 * @param {!Object} table
 * @private
 */
function checkAutoIncrement(table) {
  var pkColumns = table.constraint.primaryKey;

  var hasAutoIncrement = false;
  pkColumns.forEach(function(pkColumn) {
    var columnType = table.column[pkColumn.column];
    hasAutoIncrement = hasAutoIncrement || pkColumn.autoIncrement;
    if (pkColumn.autoIncrement && columnType != 'integer') {
      throw new Error(
          'Can not use autoIncrement with a non-integer' +
          ' primary key, \'' + pkColumn.column + '\' is of type ' +
          columnType + '.');
    }
  });

  if (hasAutoIncrement && pkColumns.length > 1) {
    throw new Error(
        'Can not use autoIncrement with a cross-column primary key.');
  }
}


/**
 * @param {string} tableName
 * @param {!Object} tableSchema
 * @param {!Array<string>} colNames Column names in this table.
 * @param {!Array<string>} names Names of unique identifiers in table, this
 *     function will insert entries into it as side effect.
 * @param {!Array<string>} unique Known unique columns.
 * @return {!Array<string>} Columns associated.
 */
function convertUnique(tableName, tableSchema, colNames, names, unique) {
  var notNullable = [];
  var schema = tableSchema.constraint.unique;

  for (var item in schema) {
    checkName(item);
    checkObject(tableName + '.' + item, UNIQUE_SCHEMA, schema[item]);
    if (names.indexOf(item) != -1) {
      throw new Error(tableName + ' has name conflict:' + item);
    }

    checkIndexable(tableSchema, schema[item].column);
    schema[item].column.forEach(function(col) {
      if (colNames.indexOf(col) == -1) {
        throw new Error(tableName + '.' + item + ' has invalid columns');
      }
      if (unique.indexOf(col) != -1 || notNullable.indexOf(col) != -1) {
        throw new Error(tableName + '.' + item + ': column is already unique');
      }
    });

    notNullable = notNullable.concat(schema[item].column);
    var newCol = schema[item].column.map(function(col) {
      return {name: col};
    });
    schema[item].column = newCol;

    names.push(item);
  }
  return notNullable;
}


/**
 * @param {string} tableName
 * @param {!Object} schemas Schema of the whole database.
 * @param {!Object} schema Schema of the foreign key constraint.
 * @param {!Array<string>} colNames Columns of the table.
 * @param {!Array<string>} names Names of unique identifiers in table, this
 *     function will insert entries into it as side effect.
 * @param {!Array<string>} keyed Names already keyed locally.
 * @return {!Array<string>} Columns associated.
 */
function checkForeignKey(tableName, schemas, schema, colNames, names, keyed) {
  var tableNames = [];
  var notNullable = [];
  for (var table in schemas) {
    tableNames.push(table);
  }

  for (var fk in schema) {
    checkName(fk);
    var fkName = tableName + '.' + fk;
    checkObject(fkName, FOREIGN_KEY_SCHEMA, schema[fk]);

    var local = schema[fk].localColumn;
    checkIndexable(schemas[tableName], [local]);
    if (colNames.indexOf(local) == -1) {
      throw new Error(fkName + ' has invalid local column');
    }
    if (keyed.indexOf(local) != -1 || notNullable.indexOf(local) != -1) {
      throw new Error(fkName + ' attempts to use already keyed column');
    }
    notNullable.push(local);

    var targetTable = schema[fk].reference;
    if (tableNames.indexOf(targetTable) == -1) {
      throw new Error(fkName + ' has invalid reference');
    }

    var cols = [];
    for (var col in schemas[targetTable].column) {
      cols.push(col);
    }
    if (cols.indexOf(schema[fk].remoteColumn) == -1) {
      throw new Error(fkName + ' has invalid remote column');
    }

    if (names.indexOf(fk) != -1) {
      throw new Error(fkName + ' has name conflict');
    }
    names.push(fkName);
  }

  return notNullable;
}


/**
 * @param {string} tableName
 * @param {!Object} schema
 * @param {!Array<string>} colNames
 * @param {!Array<string>} notNullable Already declared not nullable columns
 *     (e.g. Primary Keys, Unique).
 * @return {!Array<string>} Nullable columns
 */
function checkNullable(tableName, schema, colNames, notNullable) {
  var nullable = schema.constraint.nullable;
  nullable.forEach(function(col) {
    var colName = tableName + '.' + col;
    if (colNames.indexOf(col) == -1) {
      throw new Error(colName + ' does not exist and thus cannot be nullable');
    }

    if (notNullable.indexOf(col) != -1) {
      throw new Error(colName + ' cannot be nullable');
    }
  });

  return nullable;
}


/**
 * Validates whether the given columns are indexable or not.
 * @param {!Object} tableSchema
 * @param {!Array<string>} cols
 */
function checkIndexable(tableSchema, cols) {
  cols.forEach(function(col) {
    if (NON_INDEXABLE_TYPE.indexOf(tableSchema.column[col]) != -1) {
      throw new Error(
          tableSchema.name + ' key on nonindexable column: ' + col);
    }
  });
}


/**
 * @param {string} tableName
 * @param {!Object} schemas
 * @param {!Array<string>} colNames
 * @param {!Array<string>} names Names of unique identifiers in table, this
 *     function will insert entries into it as side effect.
 * @return {!Array<string>} Nullable columns.
 */
function checkConstraint(tableName, schemas, colNames, names) {
  var schema = schemas[tableName].constraint;
  var notNullable = [];
  var nullable = [];
  checkObject(tableName + '.constraint', CONSTRAINT_SCHEMA, schema);

  if (schema.hasOwnProperty('primaryKey')) {
    if (schema.primaryKey.length == 0) {
      throw new Error('Empty primaryKey for ' + tableName);
    }
    checkAutoIncrement(schemas[tableName]);
    checkIndexable(schemas[tableName], schema.primaryKey);
    notNullable = notNullable.concat(
        convertPrimaryKey(tableName, schema, colNames, names));
  }

  if (schema.hasOwnProperty('unique')) {
    notNullable = notNullable.concat(
        convertUnique(
            tableName, schemas[tableName], colNames, names, notNullable));
  }

  if (schema.hasOwnProperty('foreignKey')) {
    notNullable = notNullable.concat(
        checkForeignKey(
            tableName, schemas, schema.foreignKey,
            colNames, names, notNullable));
  }

  if (schema.hasOwnProperty('nullable')) {
    nullable = checkNullable(
        tableName, schemas[tableName], colNames, notNullable);
  }

  return nullable;
}


/**
 * @param {string} indexName
 * @param {Object} raw
 * @return {!Object}
 */
function convertIndexSchema(indexName, raw) {
  if (raw.column.length == 0) {
    throw new Error(indexName + ' is empty');
  }

  var index = {
    'name': indexName.substring(indexName.indexOf('.') + 1),
    'column': []
  };
  if (raw.hasOwnProperty('unique')) {
    index.unique = raw.unique;
  }

  var order = raw.order ? raw.order : 'asc';
  if (VALID_INDEX_ORDER.indexOf(order) == -1) {
    throw new Error(indexName + ' has invalid order');
  }

  raw.column.forEach(function(col) {
    if (typeof(col) == 'string') {
      index.column.push({
        'name': col,
        'order': order
      });
    } else {
      var colOrder = col.order || order;
      if (VALID_INDEX_ORDER.indexOf(colOrder) == -1) {
        throw new Error(indexName + ' has invalid order');
      }
      index.column.push({
        'name': col.name,
        'order': colOrder
      });
    }
  });

  return index;
}


/**
 * @param {string} tableName
 * @param {!Object} schema
 * @param {!Array<string>} colNames
 * @param {!Array<string>} names Names of unique identifiers in table, this
 *     function will insert entries into it as side effect.
 * @param {!Array<string>} nullable Nullable columns.
 */
function checkIndices(tableName, schema, colNames, names, nullable) {
  var indexedCol = [];
  if (schema.hasOwnProperty('constraint')) {
    var constraint = schema.constraint;
    if (constraint.hasOwnProperty('primaryKey')) {
      indexedCol.push(constraint.primaryKey.map(function(keyCol) {
        return keyCol.name;
      }).join('#'));
    }
    if (constraint.hasOwnProperty('unique')) {
      for (var item in constraint.unique) {
        indexedCol.push(constraint.unique[item].column.join('#'));
      }
    }
  }

  for (var index in schema.index) {
    checkName(index);
    var indexName = tableName + '.' + index;
    checkObject(indexName, INDEX_SCHEMA, schema.index[index]);
    if (names.indexOf(index) != -1) {
      throw new Error(tableName + ' has name conflict: ' + index);
    }
    names.push(index);

    var indexSchema = convertIndexSchema(indexName, schema.index[index]);
    indexSchema.column.forEach(function(col, i, columns) {
      if (colNames.indexOf(col.name) == -1) {
        throw new Error(indexName + ' has invalid column: ' + col);
      }
      if (columns.length > 1 && nullable.indexOf(col.name) != -1) {
        throw new Error('Cross-column index ' + indexName +
            ' referencing nullable column: ' + col);
      }
      if (NON_INDEXABLE_TYPE.indexOf(schema.column[col.name]) != -1) {
        throw new Error(indexName + ' referencing nonindexable column: ' + col);
      }
    });

    var indexed = indexSchema.column.map(function(col) {
      return col.name;
    }).join('#');
    if (indexedCol.indexOf(indexed) != -1) {
      throw new Error(indexName + ' indexed on already indexed column');
    }
    indexedCol.push(indexed);

    schema.index[index] = indexSchema;
  }
}


/**
 * @param {string} tableName
 * @param {!Object} schemas
 */
function checkTable(tableName, schemas) {
  checkName(tableName);
  var schema = schemas[tableName];

  checkObject(tableName, TABLE_SCHEMA, schema);

  /** @type {!Array<string>} */
  var names = [];

  // Check column types.
  for (var col in schema.column) {
    checkName(col);
    names.push(col);
    if (VALID_COLUMN_TYPE.indexOf(schema.column[col]) == -1) {
      throw new Error(tableName + '.' + col + ' has invalid type');
    }
  }
  var colNames = names.slice(0);
  var nullable = [];

  if (schema.hasOwnProperty('constraint')) {
    nullable = checkConstraint(tableName, schemas, colNames, names);
  }

  if (schema.hasOwnProperty('index')) {
    names.push(tableName);
    checkIndices(tableName, schema, colNames, names, nullable);
  }
}


/** @param {!Object} schema */
function checkSchema(schema) {
  checkObject('DB', DB_SCHEMA, schema);
  if (INVALID_DB_NAMES.indexOf(schema.name) != -1) {
    throw new Error('db name cannot be ' + INVALID_DB_NAMES.join(','));
  }

  for (var table in schema.table) {
    checkTable(table, schema.table);
  }
}


/**
 * @param {string} contents
 * @return {!Object}
 */
exports.parse = function(contents) {
  var schema = yaml.safeLoad(contents);
  checkSchema(schema);
  return schema;
};
