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

/**
 * @fileoverview YAML schema parser which converts the schema into a proper,
 * validated lf.schema.Database instance.
 */

var yamlMod = /** @type {{safeLoad: !Function}} */ (require('js-yaml'));

function loadLovefield() {
  var pathMod = require('path');
  var moduleName = 'node_bootstrap';

  var nodeBootstrapModule;
  try {
    // Try this path first.
    nodeBootstrapModule = require(moduleName + '/' + moduleName + '.js');
  } catch (e) {
    nodeBootstrapModule = require(
        pathMod.resolve(__dirname, '..', 'tools', moduleName + '.js'));
  }

  /** @type {{loadLkgrJs: !Function}} */ (
      nodeBootstrapModule.loadLkgrJs());
}

loadLovefield();


/**
 * @typedef {{
 *   name: string,
 *   local: string,
 *   ref: string,
 *   action: ?string,
 *   timing: ?string
 * }}
 * @private
 */
var ForeignKeySpec_;


/**
 * @typedef {{
 *   primaryKey: (!Array<string>|!Array<{
 *     name: string,
 *     order: ?string,
 *     autoIncrement: ?boolean
 *   }>),
 *   nullable: !Array<string>,
 *   unique: {column: !Array<string>},
 *   foreignKey: !Object<!ForeignKeySpec_>
 * }}
 * @private
 */
var Constraint_;


/**
 * @typedef {{
 *   enableBundledMode: (undefined|boolean)
 * }}
 * @private
 */
var Pragma_;


/**
 * @typedef {{
 *   name: string,
 *   column: (
 *      !Array<string>|!Array<{name: string, order: ?string}>),
 *   unique: (boolean|undefined),
 *   order: (string|undefined)
 * }}
 * @private
 */
var Index_;


/**
 * @typedef {{
 *   name: string,
 *   column: !Object<string>,
 *   constraint: Constraint_,
 *   index: !Object<!Index_>,
 *   pragma: {
 *     persistentIndex: ?boolean
 *   }
 * }}
 * @private
 */
var Table_;


/**
 * @typedef {{
 *   name: string,
 *   version: number,
 *   pragma: Pragma_,
 *   table: !Object<!Table_>
 * }}
 * @private
 */
var Schema_;


/** @const {!Array<string>} */
var INVALID_DB_NAMES = ['Db', 'Transaction'];


/**
 * @param {!Table_} tableSchema
 * @param {!lf.schema.TableBuilder} tableBuilder
 */
function processColumns(tableSchema, tableBuilder) {
  Object.keys(tableSchema.column).forEach(
      function(columnName) {
        var columnType = columnTypeToEnumType(tableSchema.column[columnName]);
        tableBuilder.addColumn(columnName, columnType);
      });
}


/**
 * @param {!Table_} tableSchema
 * @param {!lf.schema.TableBuilder} tableBuilder
 */
function processIndices(tableSchema, tableBuilder) {
  if (!tableSchema.index) {
    return;
  }

  Object.keys(tableSchema.index).forEach(function(indexName) {
    var indexDefinition = tableSchema.index[indexName];
    if (typeof indexDefinition.column[0] == 'string') {
      var order = undefined;
      if (indexDefinition.order != undefined) {
        order = columnOrderToEnumType(indexDefinition.order);
      }

      tableBuilder.addIndex(
          indexName, indexDefinition.column, indexDefinition.unique, order);
    } else {
      var indexedColumns = indexDefinition.column.map(
          function(indexedColumnSpec) {
            var indexedColumn = {name: indexedColumnSpec.name};

            // Avoiding giving default values to unspecified fields, such that
            // the default values are dictated by the dynamic schema API.
            if (indexedColumnSpec.order != undefined) {
              indexedColumn.order = columnOrderToEnumType(
                  indexedColumnSpec.order);
            }
            return indexedColumn;
          });
      tableBuilder.addIndex(
          indexName, indexedColumns, indexDefinition.unique);
    }
  });
}


/**
 * @param {!Table_} tableSchema
 * @param {!lf.schema.TableBuilder} tableBuilder
 */
function processPrimaryKeyConstraint(tableSchema, tableBuilder) {
  if (!tableSchema.constraint.primaryKey) {
    return;
  }

  if (tableSchema.constraint.primaryKey.length == 0) {
    throw new Error('Empty primaryKey for ' + tableSchema.name);
  }

  if (tableSchema.constraint.primaryKey[0] instanceof Object) {
    var indexedColumns = tableSchema.constraint.primaryKey.map(
        function(pkColumnSpec) {
          var indexedColumn = {name: pkColumnSpec.column};

          // Avoiding giving default values to unspecified fields, such that
          // the default values are dictated by the dynamic schema API.
          if (pkColumnSpec.order != undefined) {
            indexedColumn.order = columnOrderToEnumType(pkColumnSpec.order);
          }
          if (pkColumnSpec.autoIncrement != undefined) {
            indexedColumn.autoIncrement = pkColumnSpec.autoIncrement;
          }
          return indexedColumn;
        });
    tableBuilder.addPrimaryKey(indexedColumns);
  } else {
    tableBuilder.addPrimaryKey(tableSchema.constraint.primaryKey);
  }
}


/**
 * @param {!Table_} tableSchema
 * @param {!lf.schema.TableBuilder} tableBuilder
 */
function processForeignKeyConstraints(tableSchema, tableBuilder) {
  if (!tableSchema.constraint.foreignKey) {
    return;
  }

  Object.keys(tableSchema.constraint.foreignKey).forEach(
      function(constraintName) {
        var constraintSpecObj =
            tableSchema.constraint.foreignKey[constraintName];
        var constraintSpecRaw = {
          local: constraintSpecObj['local'],
          ref: constraintSpecObj['ref']
        };

        if (constraintSpecObj.action) {
          constraintSpecRaw.action = constraintActionToEnumType(
              constraintSpecObj.action);
        }
        if (constraintSpecObj.timing) {
          constraintSpecRaw.timing = constraintTimingToEnumType(
              constraintSpecObj.timing);
        }

        tableBuilder.addForeignKey(constraintName, constraintSpecRaw);
      });
}


/**
 * @param {!Table_} tableSchema
 * @param {!lf.schema.TableBuilder} tableBuilder
 */
function processUniqueConstraints(tableSchema, tableBuilder) {
  if (!tableSchema.constraint.unique) {
    return;
  }

  Object.keys(tableSchema.constraint.unique).forEach(
      function(constraintName) {
        tableBuilder.addUnique(
            constraintName,
            tableSchema.constraint.unique[constraintName].column);
      });
}


/**
 * @param {string} tableName
 * @param {!Table_} tableSchema
 * @param {!lf.schema.Builder} schemaBuilder
 */
function createTableDefinition(tableName, tableSchema, schemaBuilder) {
  var tableBuilder = schemaBuilder.createTable(tableName);

  processColumns(tableSchema, tableBuilder);

  if (tableSchema.constraint === null) {
    // Case where "Constraint" key-word appears in the YAML schema, but the
    // section is left empty. Note, using triple-equals on purpose since
    // undefined == null is true.
    throw new Error('Empty constraint for ' + tableName);
  }

  if (tableSchema.constraint) {
    processPrimaryKeyConstraint(tableSchema, tableBuilder);
    processUniqueConstraints(tableSchema, tableBuilder);
    processForeignKeyConstraints(tableSchema, tableBuilder);
  }
  processIndices(tableSchema, tableBuilder);

  if (tableSchema.constraint && tableSchema.constraint.nullable) {
    tableBuilder.addNullable(tableSchema.constraint.nullable);
  }

  if (tableSchema.pragma && tableSchema.pragma.persistentIndex != undefined) {
    tableBuilder.persistentIndex(tableSchema.pragma.persistentIndex);
  }
}


/**
 * @param {!Schema_} schema
 * @return {!lf.schema.Database}
 */
function convert(schema) {
  if (typeof schema.version != 'number') {
    throw new Error('Schema version must be a number');
  }

  if (INVALID_DB_NAMES.indexOf(schema.name) != -1) {
    throw new Error('db name cannot be ' + INVALID_DB_NAMES.join(','));
  }


  var schemaBuilder = lf.schema.create(schema.name, schema.version);
  Object.keys(schema.table).forEach(
      function(tableName) {
        createTableDefinition(
            tableName, schema.table[tableName], schemaBuilder);
      });

  if (schema.pragma) {
    schemaBuilder.setPragma(/** @type {!Pragma_} */ (schema.pragma));
  }

  return schemaBuilder.getSchema();
}


/**
 * @param {string} columnType
 * @return {!lf.Type}
 * @suppress {missingRequire}
 */
function columnTypeToEnumType(columnType) {
  switch (columnType) {
    case 'arraybuffer': return lf.Type.ARRAY_BUFFER;
    case 'boolean': return lf.Type.BOOLEAN;
    case 'datetime': return lf.Type.DATE_TIME;
    case 'integer': return lf.Type.INTEGER;
    case 'number': return lf.Type.NUMBER;
    case 'string': return lf.Type.STRING;
    case 'object': return lf.Type.OBJECT;
    default: throw new Error('Invalid column type: ' + columnType);
  }
}


/**
 * @param {string} columnOrder
 * @return {!lf.Order}
 * @suppress {missingRequire}
 */
function columnOrderToEnumType(columnOrder) {
  switch (columnOrder) {
    case 'asc': return lf.Order.ASC;
    case 'desc': return lf.Order.DESC;
    default: throw new Error('Invalid column order: ' + columnOrder);
  }
}


/**
 * @param {string} constraintAction
 * @return {!lf.ConstraintAction}
 * @suppress {missingRequire}
 */
function constraintActionToEnumType(constraintAction) {
  switch (constraintAction) {
    case 'cascade': return lf.ConstraintAction.CASCADE;
    case 'restrict': return lf.ConstraintAction.RESTRICT;
    default: throw new Error('Invalid constraint action: ' + constraintAction);
  }
}


/**
 * @param {string} constraintTiming
 * @return {!lf.ConstraintTiming}
 * @suppress {missingRequire}
 */
function constraintTimingToEnumType(constraintTiming) {
  switch (constraintTiming) {
    case 'deferrable': return lf.ConstraintTiming.DEFERRABLE;
    case 'immediate': return lf.ConstraintTiming.IMMEDIATE;
    default: throw new Error('Invalid constraint timing: ' + constraintTiming);
  }
}


/**
 * @param {string} contents
 * @return {!lf.schema.Database}
 */
exports.convert = function(contents) {
  var schema = yamlMod.safeLoad(contents);
  return convert(schema);
};
