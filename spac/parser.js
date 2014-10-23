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
  'index=': 'object'
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


/** @const {!Array.<string>} */
var VALID_COLUMN_TYPE = [
  'arraybuffer',
  'boolean',
  'datetime',
  'integer',
  'number',
  'string'
];


/** @const {!Array.<string>} */
var NULLABLE_COLUMN_TYPE = [
  'arraybuffer',
  'datetime',
  'string'
];


/** @const {!Array.<string>} */
var VALID_INDEX_ORDER = ['asc', 'desc'];


/** @const {!Array.<string>} */
var INVALID_DB_NAMES = ['Db', 'Observer', 'Transaction'];


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
 * @param {!Array.<string>} schema
 * @param {!Array.<string>} colNames Column names in this table.
 * @param {!Array.<string>} names Names of unique identifiers in table, this
 *     function will insert entries into it as side effect.
 * @return {!Array.<string>} Columns associated.
 */
function checkPrimaryKey(tableName, schema, colNames, names) {
  var keyName = 'pk' + tableName;

  if (names.indexOf(keyName) != -1) {
    throw new Error('Primary key name conflicts with column name: ' + keyName);
  }

  var notNullable = schema.map(function(key) {
    if (colNames.indexOf(key) == -1) {
      throw new Error('Primary key ' + key + ' of ' + tableName +
          ' is not its column');
    }
    return key;
  });
  names.push(keyName);
  return notNullable;
}


/**
 * @param {string} tableName
 * @param {!Object} schema
 * @param {!Array.<string>} colNames Column names in this table.
 * @param {!Array.<string>} names Names of unique identifiers in table, this
 *     function will insert entries into it as side effect.
 * @param {!Array.<string>} unique Known unique columns.
 * @return {!Array.<string>} Columns associated.
 */
function checkUnique(tableName, schema, colNames, names, unique) {
  var notNullable = [];

  for (var item in schema) {
    checkObject(tableName + '.' + item, UNIQUE_SCHEMA, schema[item]);
    if (names.indexOf(item) != -1) {
      throw new Error(tableName + ' has name conflict:' + item);
    }

    schema[item].column.forEach(function(col) {
      if (colNames.indexOf(col) == -1) {
        throw new Error(tableName + '.' + item + ' has invalid columns');
      }
      if (unique.indexOf(col) != -1 || notNullable.indexOf(col) != -1) {
        throw new Error(tableName + '.' + item + ': column is already unique');
      }
    });

    names.push(item);
    notNullable = notNullable.concat(schema[item].column);
  }
  return notNullable;
}


/**
 * @param {string} tableName
 * @param {!Object} schemas Schema of the whole database.
 * @param {!Object} schema Schema of the foreign key constraint.
 * @param {!Array.<string>} colNames Columns of the table.
 * @param {!Array.<string>} names Names of unique identifiers in table, this
 *     function will insert entries into it as side effect.
 * @param {!Array.<string>} keyed Names already keyed locally.
 * @return {!Array.<string>} Columns associated.
 */
function checkForeignKey(tableName, schemas, schema, colNames, names, keyed) {
  var tableNames = [];
  var notNullable = [];
  for (var table in schemas) {
    tableNames.push(table);
  }

  for (var fk in schema) {
    var fkName = tableName + '.' + fk;
    checkObject(fkName, FOREIGN_KEY_SCHEMA, schema[fk]);

    var local = schema[fk].localColumn;
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
 * @param {!Array.<string>} colNames
 * @param {!Array.<string>} notNullable Already declared not nullable columns
 *     (e.g. Primary Keys, Unique).
 * @return {!Array.<string>} Nullable columns
 */
function checkNullable(tableName, schema, colNames, notNullable) {
  var canBeNull = [];
  for (var col in schema.column) {
    if (NULLABLE_COLUMN_TYPE.indexOf(schema.column[col]) != -1) {
      canBeNull.push(col);
    }
  }

  var nullable = schema.constraint.nullable;
  nullable.forEach(function(col) {
    var colName = tableName + '.' + col;
    if (colNames.indexOf(col) == -1) {
      throw new Error(colName + ' does not exist and thus cannot be nullable');
    }

    if (canBeNull.indexOf(col) == -1 || notNullable.indexOf(col) != -1) {
      throw new Error(colName + ' cannot be nullable');
    }
  });

  return nullable;
}


/**
 * @param {string} tableName
 * @param {!Object} schemas
 * @param {!Array.<string>} colNames
 * @param {!Array.<string>} names Names of unique identifiers in table, this
 *     function will insert entries into it as side effect.
 * @return {!Array.<string>} Nullable columns.
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
    notNullable = notNullable.concat(
        checkPrimaryKey(tableName, schema.primaryKey, colNames, names));
  }

  if (schema.hasOwnProperty('unique')) {
    notNullable = notNullable.concat(
        checkUnique(tableName, schema.unique, colNames, names, notNullable));
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
 * @param {string} tableName
 * @param {!Object} schema
 * @param {!Array.<string>} colNames
 * @param {!Array.<string>} names Names of unique identifiers in table, this
 *     function will insert entries into it as side effect.
 * @param {!Array.<string>} nullable Nullable columns.
 */
function checkIndices(tableName, schema, colNames, names, nullable) {
  var indexedCol = [];
  if (schema.hasOwnProperty('constraint')) {
    var constraint = schema.constraint;
    if (constraint.hasOwnProperty('primaryKey')) {
      indexedCol.push(constraint.primaryKey.join('#'));
    }
    if (constraint.hasOwnProperty('unique')) {
      for (var item in constraint.unique) {
        indexedCol.push(constraint.unique[item].column.join('#'));
      }
    }
  }

  for (var index in schema.index) {
    var indexSchema = schema.index[index];
    var indexName = tableName + '.' + index;
    checkObject(indexName, INDEX_SCHEMA, indexSchema);
    if (names.indexOf(index) != -1) {
      throw new Error(tableName + ' has name conflict: ' + index);
    }
    names.push(index);

    indexSchema.column.forEach(function(col) {
      if (colNames.indexOf(col) == -1) {
        throw new Error(indexName + ' has invalid column: ' + col);
      }
      if (nullable.indexOf(col) != -1) {
        throw new Error(indexName + ' referencing nullable column: ' + col);
      }
    });

    var indexed = indexSchema.column.join('#');
    if (indexedCol.indexOf(indexed) != -1) {
      throw new Error(indexName + ' indexed on already indexed column');
    }
    indexedCol.push(indexed);

    if (indexSchema.hasOwnProperty('order')) {
      if (VALID_INDEX_ORDER.indexOf(indexSchema.order) == -1) {
        throw new Error(indexName + ' has invalid order');
      }
    }
  }
}


/**
 * @param {string} tableName
 * @param {!Object} schemas
 */
function checkTable(tableName, schemas) {
  var schema = schemas[tableName];

  checkObject(tableName, TABLE_SCHEMA, schema);

  /** @type {!Array.<string>} */
  var names = [];

  // Check column types.
  for (var col in schema.column) {
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
