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
 * @fileoverview Code generator for given templates. The class reads the schema
 * and generates following variables:
 *
 * #bundledmode: enableBundledMode pragma value, default to false
 * #column: array of columns of last used #table, must be used in #repeatcolumn
 * #columnprop: property of last used #column
 * #columnuniqueness: uniqueness of last used #column
 * #dbname: database name
 * #dbtablelist: database table list
 * #dbversion: database version
 * #keyofindex: function body of a row's keyOfIndex function
 * #namespace: namespace given by the user
 * #table: array of tables defined in schema, must be used in #repeattable
 * #tablecolumntypes: column as members with type annotation
 * #tablecolumndbtypes: column as members with type annotation
 * #tableindexedcolumns: array form of indexed columns prefixed with "this." of
 *     last used #table
 * #tablename: table name of last used #table
 *
 * The caller feeds in the content of a template in string form, and the
 * generator will replace the variables in the template and return the results
 * as string. The template can have following control variables:
 *
 * #pascal: used for #{table|column} to generate Pascal-Camel-style string
 * #camel: used for #{table|column} to generate Camel-style string
 * /// #sort: sort the coming block in lexical order
 * /// #repeattable: repeat given statements by table
 * /// #repeatcolumn: repeat given statements by column
 */


/**
 * @typedef {{
 *   primaryKey: !Array.<string>,
 *   nullable: !Array.<string>,
 *   unique: !Array.<{
 *     name: string,
 *     column: !Array.<string>
 *   }>,
 *   foreignKey: !Array.<{
 *     name: string,
 *     localColumn: string,
 *     reference: string,
 *     remoteColumn: string,
 *     cascade: ?boolean
 *   }>
 * }}
 */
var Constraint_;


/**
 * @typedef {{
 *   enableBundledMode: boolean
 * }}
 */
var Pragma_;


/**
 * @typedef {{
 *   name: string,
 *   version: number,
 *   pragma: Pragma_,
 *   table: !Array.<{
 *     name: string,
 *     column: !Array.<{
 *       name: string,
 *       type: string,
 *       nullable: boolean
 *     }>,
 *     constraint: Constraint_,
 *     index: !Array.<{
 *       name: string,
 *       column: !Array.<string>,
 *       order: ?string,
 *       unique: ?boolean
 *     }>
 *   }>
 * }}
 * @private
 */
var Schema_;


/**
 * @param {!Object} yaml
 * @return {!Array.<!Object>}
 */
function objectToArray(yaml) {
  var ret = [];
  for (var propName in yaml) {
    var prop = yaml[propName];
    prop.name = propName;
    ret.push(prop);
  }
  return ret;
}


/**
 * Converts constraints from YAML schema to codegen format.
 * @param {!Object} yaml
 * @return {!Constraint_}
 */
function convertConstraint(yaml) {
  var ret = {};
  if (yaml.hasOwnProperty('primaryKey')) {
    ret.primaryKey = yaml.primaryKey;
  }
  if (yaml.hasOwnProperty('nullable')) {
    ret.nullable = yaml.nullable;
  }
  if (yaml.hasOwnProperty('unique')) {
    ret.unique = objectToArray(yaml.unique);
  }
  if (yaml.hasOwnProperty('foreignKey')) {
    ret.foreignKey = objectToArray(yaml.foreignKey);
  }
  return ret;
}


/**
 * Converts schema from YAML parser to the one understandable by codegen.
 * @param {!Object} yaml
 * @return {!Schema_}
 * @private
 */
function convertSchema(yaml) {
  var schema = {};
  schema.name = yaml.name;
  schema.version = yaml.version;
  schema.pragma = yaml.pragma;
  var tables = [];
  for (var tableName in yaml.table) {
    var table = {};
    table.name = tableName;

    if (yaml.table[tableName].hasOwnProperty('constraint')) {
      table.constraint = convertConstraint(yaml.table[tableName].constraint);
    }

    var columns = [];
    for (var colName in yaml.table[tableName].column) {
      var col = {};
      col.name = colName;
      col.type = yaml.table[tableName].column[colName];
      col.nullable = table.hasOwnProperty('constraint') &&
          table.constraint.hasOwnProperty('nullable') &&
          table.constraint.nullable.indexOf(col.name) != -1;
      columns.push(col);
    }
    table.column = columns;

    if (yaml.table[tableName].hasOwnProperty('index')) {
      table.index = objectToArray(yaml.table[tableName].index);
    }

    tables.push(table);
  }
  schema.table = tables;
  return schema;
}



/**
 * @param {string} namespace
 * @param {!Object} schema Validated DB schema
 * @constructor
 */
var CodeGenerator = function(namespace, schema) {
  /** @private {!Schema_} */
  this.schema_ = convertSchema(schema);

  /** @private {string} */
  this.namespace_ = namespace;

  /** @private {?string} */
  this.fileName_ = null;

  /**
   * A stack used to store relative line numbers.
   * @private {!Array.<number>}
   */
  this.stack_ = [];

  /** @private {number} */
  this.tableIndex_ = -1;
};


/**
 * @param {string} message
 * @throws {!Error}
 */
CodeGenerator.prototype.error = function(message) {
  // The parser works in sub-blocks. For example:
  // block 1: repeattable  <-- pushes relative line number for block 1
  // block 2:  repeatcolumn  <-- pushes relative line number for block 2
  // block 2:  repeatend  <-- pops line number for block 2
  // block 1: repeatend  <-- pops line number for block 1
  //
  // When block 2 throws error, the line number of actual error incurring line
  // is the sum of the stack.
  var line = this.stack_.reduce(function(a, b) {
    return a + b;
  });
  throw new Error(this.fileName_ + ':' + line + ' ' + message);
};


/**
 * @enum {number}
 * @private
 */
CodeGenerator.State_ = {
  NONE: 0,
  SORT: 1,
  REPEAT_TABLE: 2,
  REPEAT_COLUMN: 3,
  SORT_END: 4,
  REPEAT_TABLE_END: 5,
  REPEAT_COLUMN_END: 6
};


/**
 * @const {string}
 * @private
 */
CodeGenerator.SKIP_LINE_ = '#';


/**
 * @const {Object}
 * @private
 */
CodeGenerator.STATE_MAP_ = {
  '/// #sort': CodeGenerator.State_.SORT,
  '/// #sortend': CodeGenerator.State_.SORT_END,
  '/// #repeattable': CodeGenerator.State_.REPEAT_TABLE,
  '/// #repeattableend': CodeGenerator.State_.REPEAT_TABLE_END,
  '/// #repeatcolumn': CodeGenerator.State_.REPEAT_COLUMN,
  '/// #repeatcolumnend': CodeGenerator.State_.REPEAT_COLUMN_END
};


/**
 * State transition logic.
 *
 * REPEAT_COLUMN must be nested in REPEAT_TABLE.
 * REPEAT_TABLE can only be nested in SORT.
 * SORT must not be nested by anyone.
 *
 * The map is constructed in three layers:
 * oldState: { parsedToken: realNewState }
 *
 * For example, old state is SORT, parsed token is REPEAT_TABLE, that means a
 * repeattable block is nested inside a sort block so the real new state shall
 * be SORT. The map will be '1': { '2': SORT }.
 *
 * @const {!Object}
 * @private
 */
CodeGenerator.VALID_STATE_TRANSITION_ = {
  '0' /* CodeGenerator.State_.NONE */: {
    '0': CodeGenerator.State_.NONE,
    '1': CodeGenerator.State_.SORT,
    '2': CodeGenerator.State_.REPEAT_TABLE,
    '3': CodeGenerator.State_.REPEAT_COLUMN
  },

  '1' /* CodeGenerator.State_.SORT */: {
    '1': CodeGenerator.State_.SORT,
    '2': CodeGenerator.State_.SORT,
    '4': CodeGenerator.State_.NONE,
    '5': CodeGenerator.State_.SORT,
    '6': CodeGenerator.State_.SORT
  },

  '2' /* CodeGenerator.State_.REPEAT_TABLE */: {
    '2': CodeGenerator.State_.REPEAT_TABLE,
    '3': CodeGenerator.State_.REPEAT_TABLE,
    '5': CodeGenerator.State_.NONE,
    '6': CodeGenerator.State_.REPEAT_TABLE
  },

  '3' /* CodeGenerator.State_.REPEAT_COLUMN */: {
    '3': CodeGenerator.State_.REPEAT_COLUMN,
    '6': CodeGenerator.State_.NONE
  }
};


/**
 * @param {string} name
 * @return {string}
 * @private
 */
CodeGenerator.prototype.toCamel_ = function(name) {
  return name[0].toLowerCase() + name.substring(1);
};


/**
 * @param {string} name
 * @return {string}
 * @private
 * @see http://en.wikipedia.org/wiki/CamelCase
 */
CodeGenerator.prototype.toPascal_ = function(name) {
  return name[0].toUpperCase() + name.substring(1);
};


/**
 * State transition logic.
 *
 * REPEAT_COLUMN must be nested in REPEAT_TABLE.
 * REPEAT_TABLE can only be nested in SORT.
 * SORT must not be nested by anyone.
 *
 * @param {string} line
 * @param {number} oldState
 * @return {number}
 * @private
 */
CodeGenerator.prototype.getNewState_ = function(line, oldState) {
  var state = CodeGenerator.STATE_MAP_[line] || oldState;
  var newState = CodeGenerator.VALID_STATE_TRANSITION_[oldState][state];
  if (newState == undefined) {
    this.error('invalid syntax');
  } else if (newState == CodeGenerator.State_.REPEAT_COLUMN &&
      this.tableIndex_ < 0) {
    this.error('#repeatcolumn not in #repeattable');
  } else if (newState == CodeGenerator.State_.REPEAT_TABLE &&
      this.tableIndex_ >= 0) {
    this.error('#repeattable cannot be nested');
  }

  return newState;
};


/**
 * @param {!Array.<string>} lines
 * @return {!Array.<string>}
 * @private
 */
CodeGenerator.prototype.parse_ = function(lines) {
  var finished = [];
  var pool = [];
  var oldState = CodeGenerator.State_.NONE;

  for (var i = 0; i < lines.length; ++i) {
    this.stack_.push(i);
    var line = lines[i].trim();
    var newState = this.getNewState_(line, oldState);

    if (oldState != CodeGenerator.State_.NONE) {
      if (newState == oldState) {
        pool.push(lines[i]);
      } else if (newState == CodeGenerator.State_.NONE) {
        // SORT|REPEAT* -> NONE, dispatch pool to processing
        finished = finished.concat((oldState == CodeGenerator.State_.SORT) ?
            this.processSort_(pool) :
            (oldState == CodeGenerator.State_.REPEAT_TABLE) ?
                this.processRepeatTable_(pool) :
                this.processRepeatColumn_(pool));
        pool = [];
      } else {
        throw new Error('Code generator out of state');
      }
    } else {  // old state is NONE
      // NONE -> NONE: nothing needs to be done, just push to final buffer.
      if (newState == CodeGenerator.State_.NONE) {
        finished.push(lines[i]);
      }
    }

    oldState = newState;
    this.stack_.pop();
  }

  return finished;
};


/**
 * @param {!Array.<string>} lines
 * @return {!Array.<string>}
 * @private
 */
CodeGenerator.prototype.processSort_ = function(lines) {
  // Expand possible containing repeat.
  var linesToSort = this.parse_(lines);

  // Scan for Closure annotations.
  var mapper = {};
  for (var i = linesToSort.length - 1; i > 0; --i) {
    var line = linesToSort[i];
    if (line.trim().lastIndexOf('/** @') == 0) {
      mapper[linesToSort[i + 1]] = line;
      linesToSort.splice(i, 1);
    }
  }

  linesToSort = linesToSort.sort();
  for (var i = 0; i < linesToSort.length; ++i) {
    var line = linesToSort[i];
    if (mapper[line]) {
      linesToSort.splice(i, 0, mapper[line]);
      ++i;
    }
  }

  return linesToSort;
};


/**
 * @param {Object} table
 * @param {string} prefix
 * @return {?string}
 * @private
 */
CodeGenerator.prototype.genGetDefaultPayload_ = function(table, prefix) {
  var body = [];  // Object body for UserType default object.

  var columns = table.column;
  for (var i = 0; i < columns.length; ++i) {
    var col = columns[i];
    var lhs = '  ' + prefix + '.' + col.name + ' = ';
    if (col.type == 'string') {
      body.push(lhs + (col.nullable ? 'null' : '\'\'') + ';');
    } else if (col.type == 'boolean') {
      body.push(lhs + 'false;');
    } else if (col.type == 'datetime') {
      body.push(lhs + (col.nullable ? 'null' : 'new Date(0)') + ';');
    } else if (col.type == 'arraybuffer') {
      body.push(lhs + (col.nullable ? 'null' : 'new ArrayBuffer(0)') + ';');
    } else {  // integer, number
      body.push(lhs + '0;');
    }
  }

  return body.join('\n');
};


/**
 * @param {Object} table
 * @param {string} prefix
 * @return {?string}
 * @private
 */
CodeGenerator.prototype.genToDbPayload_ = function(table, prefix) {
  var body = [];  // Object body for DbType objects
  var columns = table.column;
  for (var i = 0; i < columns.length; ++i) {
    var col = columns[i];
    var lhs = '  ' + prefix + '.' + col.name + ' = ';
    switch (col.type) {
      case 'arraybuffer':
        body.push(lhs + 'lf.Row.binToHex(this.payload().' + col.name + ');');
        break;

      case 'datetime':
        if (col.nullable) {
          body.push(
              lhs + 'goog.isNull(this.payload().' + col.name + ') ?\n' +
              '      null : this.payload().' + col.name + '.getTime();');
        } else {
          body.push(lhs + 'this.payload().' + col.name + '.getTime();');
        }
        break;

      default:
        body.push(lhs + 'this.payload().' + col.name + ';');
        break;
    }
  }

  return body.join('\n');
};


/**
 * @param {Object} table
 * @param {string} column
 * @return {string}
 * @private
 */
CodeGenerator.columnToKey_ = function(table, column) {
  var columns = table.column;
  var result = '';
  for (var i = 0; i < columns.length; ++i) {
    var col = columns[i];
    if (col.name != column) {
      continue;
    }

    switch (col.type) {
      case 'arraybuffer':
        result = 'lf.Row.hexToBin(this.payload().' + column + ')';
        break;

      case 'datetime':
        result = 'this.payload().' + column + '.getTime()';
        break;

      case 'string':
      case 'integer':
      case 'number':
        result = 'this.payload().' + column;
        break;

      case 'boolean':
        result = '(this.payload().' + column + ' ? 1 : 0)';
        break;

      default:
        throw new Error();
    }
    break;
  }

  return result;
};


/**
 * @param {Object} table
 * @param {string} column
 * @return {string}
 * @private
 */
CodeGenerator.columnToKeyString_ = function(table, column) {
  var columns = table.column;
  var result = '';

  for (var i = 0; i < columns.length; ++i) {
    var col = columns[i];
    if (col.name != column) {
      continue;
    }

    switch (col.type) {
      case 'arraybuffer':
        result = 'lf.Row.hexToBin(this.payload().' + column + ')';
        break;

      case 'datetime':
        result = 'this.payload().' + column + '.getTime().toString()';
        break;

      case 'string':
        result = 'this.payload().' + column;
        break;

      case 'integer':
      case 'number':
        result = 'this.payload().' + column + '.toString()';
        break;

      case 'boolean':
        result = 'this.payload().' + column + '.toString()';
        break;

      default:
        throw new Error();
    }
    break;
  }

  return result;
};


/**
 * @param {Object} table
 * @param {!Array.<string>} columns
 * @return {string}
 * @private
 */
CodeGenerator.prototype.genKeyFromColumns_ = function(table, columns) {
  var doError = (function(col) {
    this.error(
        'Cannot generate index key for column:' + table.name + '.' + col);
  }).bind(this);

  if (columns.length > 1) {
    var strings = columns.map(function(col) {
      try {
        return CodeGenerator.columnToKeyString_(table, col);
      } catch (e) {
        doError(col);
      }
    });
    var token = ' + \'_\' + ';
    return '      return ' + strings.join(token).substring(-token.length) + ';';
  } else {
    try {
      return '      return ' +
          CodeGenerator.columnToKey_(table, columns[0]) + ';';
    } catch (e) {
      doError(columns[0]);
    }
  }
};


/**
 * @param {Object} table
 * @param {string} prefix
 * @return {string}
 * @private
 */
CodeGenerator.prototype.genKeyOfIndex_ = function(table, prefix) {
  var body = [];
  body.push('  switch (' + prefix + ') {');
  var genCase = function(keyName) {
    body.push('    case \'' + table.name + '.' + keyName + '\':');
  };

  if (table.constraint) {
    if (table.constraint.primaryKey) {
      genCase('pk' + this.toPascal_(table.name));
      body.push(this.genKeyFromColumns_(table,
          this.getPrimaryKeyCols_(table.constraint.primaryKey)));
    }

    if (table.constraint.unique) {
      for (var i = 0; i < table.constraint.unique.length; ++i) {
        var unq = table.constraint.unique[i];
        genCase(unq.name);
        body.push(this.genKeyFromColumns_(table, unq.column));
      }
    }
  }

  if (table.index) {
    for (var i = 0; i < table.index.length; ++i) {
      var index = table.index[i];
      genCase(index.name);
      body.push(this.genKeyFromColumns_(table, index.column));
    }
  }

  body.push('    case \'##row_id##\':');
  body.push('      return this.id();');
  body.push('    default:');
  body.push('      break;');
  body.push('  }');
  body.push('  return null;');
  return body.join('\n');
};


/**
 * Generates deserializeRow() function. It generates
 *
 *   return new target(record['id'], record['value']);
 *
 * if there is no special conversion needed, or
 *
 *   var payload = new targetType();
 *   var data = record['value'];
 *   payload.col1 = data.col1;
 *   ...
 *   return payload;
 *
 * if special conversion is required.
 *
 * @param {Object} table
 * @param {string} target
 * @param {string} record
 * @return {string}
 * @private
 */
CodeGenerator.prototype.genDeserializeRow_ = function(table, target, record) {
  var source = record + '[\'value\']';
  var body = [
    '  var data = ' + source + ';',
    '  var payload = new ' + target + 'Type();'
  ];
  var columns = table.column;
  var hasConversion = false;

  for (var i = 0; i < columns.length; ++i) {
    var col = columns[i];
    var prefix = '  payload.' + col.name + ' = ';
    switch (col.type) {
      case 'arraybuffer':
        if (!col.nullable) {
          // Need to cast because hexToBin returns ?ArrayBuffer, but in the case
          // of a non-nullable arraybuffer field, the return value is always
          // non-null.
          body.push(prefix +
              '/** @type {!ArrayBuffer} */ (\n' +
              '      lf.Row.hexToBin(data.' + col.name + '));');
        } else {
          body.push(
              prefix + 'lf.Row.hexToBin(data.' + col.name + ');');
        }
        hasConversion = true;
        break;

      case 'datetime':
        var temp = 'data.' + col.name;
        if (col.nullable) {
          body.push(prefix + 'goog.isNull(' + temp + ') ?\n' +
              '      null : new Date(' + temp + ');');
        } else {
          body.push(prefix + 'new Date(' + temp + ');');
        }
        hasConversion = true;
        break;

      default:
        body.push(prefix + 'data.' + col.name + ';');
        break;
    }
  }

  var commonNew = '  return new ' + target + '(' + record + '[\'id\'], ';
  if (hasConversion) {
    body.push(commonNew + 'payload);');
  } else {
    body = [commonNew + source + ');'];
  }
  return body.join('\n');
};


/**
 * Converts a column type to a JS type annotation.
 * @param {string} columnType The type to be converted. Must be a value that
 *     exists in VALID_COLUMN_TYPE.
 * @param {boolean} isNullable Whether the type is nullable, applies only to
 *     ArrayBuffer and Date, since all other types are non-nullable per spec.
 * @return {string} The type annotation to be used in generated code.
 * @private
 */
CodeGenerator.columnTypeToJsType_ = function(columnType, isNullable) {
  if (columnType == 'arraybuffer') {
    columnType = (isNullable ? '?' : '!') + 'ArrayBuffer';
  } else if (columnType == 'datetime') {
    columnType = (isNullable ? '?' : '!') + 'Date';
  } else if (columnType == 'integer') {
    columnType = 'number';
  } else if (columnType == 'string') {
    columnType = (isNullable ? '?' : '') + 'string';
  }

  // Must be either 'number', 'boolean', which are non-nullable according to the
  // spec.
  return columnType;
};


/**
 * Converts a column type to a string representing an lf.Type enumaration.
 * @param {string} columnType The type to be converted. Must be a value that
 *     exists in VALID_COLUMN_TYPE.
 * @return {string}
 * @private
 */
CodeGenerator.columnTypeToEnumType_ = function(columnType) {
  switch (columnType) {
    case 'arraybuffer': return 'lf.Type.ARRAY_BUFFER';
    case 'boolean': return 'lf.Type.BOOLEAN';
    case 'datetime': return 'lf.Type.DATE_TIME';
    case 'integer': return 'lf.Type.INTEGER';
    case 'number': return 'lf.Type.NUMBER';
    default /* 'string' */: return 'lf.Type.STRING';
  }
};


/**
 * @param {Object} table
 * @param {string} prefix
 * @return {string}
 * @private
 */
CodeGenerator.prototype.genRowGetSet_ = function(table, prefix) {
  var results = [];

  var columns = table.column;
  for (var i = 0; i < columns.length; ++i) {
    var col = columns[i];
    var jsType = CodeGenerator.columnTypeToJsType_(
        col.type, /* isNullable */ col.nullable);
    var value = 'this.payload().' + col.name;
    var getter = '  return ' + value + ';';
    var setter = '  ' + value + ' = value;';

    results.push('\n\n/** @return {' + jsType + '} */');
    results.push(prefix + '.get' + this.toPascal_(col.name) +
        ' = function() {');
    results.push(getter);
    results.push('};');

    var className = prefix.substring(0, prefix.indexOf('.prototype'));
    results.push('\n\n/**');
    results.push(' * @param {' + jsType + '} value');
    results.push(' * @return {!' + className + '}');
    results.push('*/');
    results.push(prefix + '.set' + this.toPascal_(col.name) +
        ' = function(value) {');
    results.push(setter);
    results.push('  return this;');
    results.push('};');
  }

  return results.join('\n');
};


/**
 * @param {!Array.<string>} lines
 * @return {!Array.<string>}
 * @private
 */
CodeGenerator.prototype.processRepeatTable_ = function(lines) {
  var tables = this.schema_.table;
  var results = [];

  for (var i = 0; i < tables.length; ++i) {
    var pool = [];

    var table = tables[i];
    var name = table.name;
    var pascal = this.toPascal_(name);
    var camel = this.toCamel_(name);
    var indices = this.getIndices_(table);
    var constraint = this.getConstraint_(table);
    var colTypes = this.getColumnAsMembers_(table);

    for (var j = 0; j < lines.length; ++j) {
      var genLine = lines[j];
      // Regex replacing must start from the longest pattern.
      genLine = genLine.replace(/#tablecolumndbtypes/g, colTypes[0]);
      genLine = genLine.replace(/#tablecolumntypes/g, colTypes[1]);
      genLine = genLine.replace(/#tableindices/g, indices);
      genLine = genLine.replace(/#tableconstraint/g, constraint);
      genLine = genLine.replace(/#table#pascal/g, pascal);
      genLine = genLine.replace(/#table#camel/g, camel);
      genLine = genLine.replace(/#tablename/g, name);

      // These patterns must be replaced last.
      var prefix = genLine.split(' ')[1];
      if (genLine.indexOf('#getdefaultpayload ') != -1) {
        genLine = this.genGetDefaultPayload_(table, prefix);
      }
      if (genLine.indexOf('#todbpayload ') != -1) {
        genLine = this.genToDbPayload_(table, prefix);
      }
      if (genLine.indexOf('#rowpropgetset ') != -1) {
        genLine = this.genRowGetSet_(table, prefix);
      }
      if (genLine.indexOf('#keyofindex ') != -1) {
        genLine = this.genKeyOfIndex_(table, prefix);
      }
      if (genLine.indexOf('#deserializerow ') != -1) {
        var source = genLine.split(' ')[2];
        genLine = this.genDeserializeRow_(table, prefix, source);
      }

      if (genLine != CodeGenerator.SKIP_LINE_) {
        pool.push(genLine);
      }
    }

    this.tableIndex_ = i;
    results = results.concat(this.parse_(pool));
  }

  this.tableIndex_ = -1;
  return results;
};


/**
 * @param {!Array.<*>} columns
 * @private
 */
CodeGenerator.prototype.checkMultiColumnIndex_ = function(columns) {
  if (columns.length > 1) {
    throw new Error('Lovefield does not fully support cross-column index yet');
  }
};


/**
 * @param {!Object} schema primaryKey schema.
 * @return {!Array.<string>} Primary Key columns.
 * @private
 */
CodeGenerator.prototype.getPrimaryKeyCols_ = function(schema) {
  if (schema.length) {
    // Format 1: primaryKey: [ cols ]
    return /** @type {!Array.<string>} */ (schema);
  } else {
    // Format 2: primaryKey:
    //             column: [ cols ]
    return schema.column;
  }
};


/**
 * @param {!Object} table
 * @return {string}
 * @private
 */
CodeGenerator.prototype.getPrimaryKeyIndex_ = function(table) {
  var results = [];

  if (table.constraint && table.constraint.primaryKey) {
    var pkCols = this.getPrimaryKeyCols_(table.constraint.primaryKey);

    // TODO(arthurhsu): remove this check.
    //     https://github.com/google/lovefield/issues/15
    this.checkMultiColumnIndex_(pkCols);

    var header = 'new lf.schema.Index(\'' + table.name + '\', \'';
    var cols = pkCols.join(', \'');
    var keyName = 'pk' + this.toPascal_(table.name);
    var persistent = table.constraint.primaryKey.persistent ? true : false;
    results.push(header + keyName + '\', true, ' + persistent.toString() +
        ', [\'' + cols + '\'])');
  } else {
    results.push('null');
  }

  return results.join(',\n');
};


/**
 * @param {!Object} table
 * @return {string}
 * @private
 */
CodeGenerator.prototype.getConstraint_ = function(table) {
  var results = [];

  var getNotNullable = (function() {
    var notNullable = [];
    table.column.forEach(function(column) {
      if (!table.constraint || !table.constraint.nullable ||
          table.constraint.nullable.indexOf(column.name) == -1) {
        notNullable.push('    this.' + column.name);
      }
    }, this);
    return '  var notNullable = [\n' + notNullable.join(',\n') + '\n  ];';
  }).bind(this);

  if (table.constraint) {
    results.push('  var pk = ' + this.getPrimaryKeyIndex_(table) + ';');
    results.push(getNotNullable());

    // TODO(dpapad): Populate this field once foreign key indices are
    // implemented.
    results.push('  var foreignKeys = [];');

    results.push('  var unique = [');
    if (table.constraint.unique) {
      var uniqueIndices = this.getUniqueIndices_(table);
      uniqueIndices.forEach(function(uniqueIndex) {
        results.push('    ' + uniqueIndex);
      });
    }
    results.push('  ];');

    results.push('  return new lf.schema.Constraint(' +
        'pk, notNullable, foreignKeys, unique);');
  } else {
    results.push(getNotNullable());
    results.push('  return new lf.schema.Constraint(' +
        'null, notNullable, [], []);');
  }

  return results.join('\n');
};


/**
 * @param {!Object} table
 * @return {!Array.<string>}
 * @private
 */
CodeGenerator.prototype.getUniqueIndices_ = function(table) {
  var uniqueIndices = [];

  for (var i = 0; i < table.constraint.unique.length; ++i) {
    var uniqueConstraint = table.constraint.unique[i];
    // TODO(arthurhsu): remove this check.
    this.checkMultiColumnIndex_(uniqueConstraint.column);

    var cols = uniqueConstraint.column.join(', \'');
    var persistent = uniqueConstraint.persistent ? true : false;
    var uniqueIndex = 'new lf.schema.Index(\'' + table.name + '\', \'' +
        uniqueConstraint.name + '\', true, ' + persistent.toString() +
        ', [\'' + cols + '\'])';
    uniqueIndices.push(uniqueIndex);
  }

  return uniqueIndices;
};


/**
 * @param {!Object} table
 * @return {string}
 * @private
 */
CodeGenerator.prototype.getIndices_ = function(table) {
  var results = [];

  if (table.constraint) {
    if (table.constraint.primaryKey) {
      results.push('      ' + this.getPrimaryKeyIndex_(table));
    }

    if (table.constraint.unique) {
      var uniqueIndices = this.getUniqueIndices_(table);
      uniqueIndices.forEach(function(uniqueIndex) {
        results.push('      ' + uniqueIndex);
      });
    }
  }

  if (table.index) {
    var header = '      new lf.schema.Index(\'' + table.name + '\', \'';
    for (var i = 0; i < table.index.length; ++i) {
      var index = table.index[i];
      var col = [];
      col = col.concat(index.column);
      // TODO(arthurhsu): remove this check.
      this.checkMultiColumnIndex_(col);

      var isUnique = index.unique ? true : false;
      var persistent = index.persistent ? true : false;
      results.push(header + index.name + '\', ' + isUnique.toString() + ', ' +
          persistent.toString() + ', [\'' + col.join('\', \'') + '\'])');
    }
  }

  return results.join(',\n');
};


/**
 * @param {!Object} table
 * @return {!Array.<string>}
 * @private
 */
CodeGenerator.prototype.getColumnAsMembers_ = function(table) {
  var columns = table.column;
  var result = '';
  var result2 = '';
  for (var i = 0; i < columns.length; ++i) {
    var col = columns[i];
    var name = col.name;
    var type = col.type;
    var type2 = col.type;
    switch (type) {
      case 'arraybuffer':
        type = col.nullable ? '?string' : 'string';
        type2 = col.nullable ? '?ArrayBuffer' : '!ArrayBuffer';
        break;

      case 'datetime':
        type = col.nullable ? '?number' : 'number';
        type2 = col.nullable ? '?Date' : '!Date';
        break;

      case 'string':
        type = col.nullable ? '?string' : 'string';
        type2 = type;
        break;

      case 'integer':
        type = 'number';
        type2 = 'number';
        break;
    }

    var pattern =
        '  /** @export @type {#####} */\n  this.' + this.toCamel_(name) + ';\n';

    result += pattern.replace('#####', type);
    result2 += pattern.replace('#####', type2);
  }
  return [
    result.substring(0, result.length - 1),
    result2.substring(0, result2.length - 1)
  ];
};


/**
 * @param {!Object} table
 * @return {!Array.<string>}
 * @private
 */
CodeGenerator.prototype.getUniqueColumns_ = function(table) {
  var ret = [];

  if (table.hasOwnProperty('constraint')) {
    var constraint = table.constraint;
    if (constraint.hasOwnProperty('primaryKey') &&
        constraint.primaryKey.length == 1) {
      ret.push(constraint.primaryKey[0]);
    }
    if (constraint.hasOwnProperty('unique')) {
      constraint.unique.forEach(function(unq) {
        if (unq.column.length == 1) {
          ret.push(unq.column[0]);
        }
      });
    }
  }

  if (table.hasOwnProperty('index')) {
    table.index.forEach(function(idx) {
      if (idx.unique && idx.column.length == 1) {
        ret.push(idx.column[0]);
      }
    });
  }

  return ret;
};


/**
 * @param {!Array.<string>} lines
 * @return {!Array.<string>}
 * @private
 */
CodeGenerator.prototype.processRepeatColumn_ = function(lines) {
  var table = this.schema_.table[this.tableIndex_];
  var columns = table.column;
  var uniqueColumns = this.getUniqueColumns_(table);

  var results = [];

  for (var i = 0; i < columns.length; ++i) {
    var col = columns[i];
    var name = col.name;
    var pascal = this.toPascal_(name);
    var camel = this.toCamel_(name);
    var unique = (uniqueColumns.indexOf(name) != -1);

    for (var j = 0; j < lines.length; ++j) {
      var genLine = lines[j];
      genLine = genLine.replace(/#column#pascal/g, pascal);
      genLine = genLine.replace(/#column#camel/g, camel);
      genLine = genLine.replace(/#columnuniqueness/g, unique.toString());
      genLine = genLine.replace(
          /#columnjstype/g,
          CodeGenerator.columnTypeToJsType_(col.type, /* isNullable */ false));
      genLine = genLine.replace(
          /#columnenumtype/g, CodeGenerator.columnTypeToEnumType_(col.type));
      results.push(genLine);
    }
  }

  return results;
};


/**
 * @param {string} fileName
 * @param {string} template
 * @return {string}
 */
CodeGenerator.prototype.generate = function(fileName, template) {
  this.fileName_ = fileName;
  var output = new String(template);

  // Global replacements
  var dbTableList = '';
  for (var i = 0; i < this.schema_.table.length; ++i) {
    var name = this.schema_.table[i].name;
    dbTableList = dbTableList + '    this.' + this.toCamel_(name) + '_,\n';
  }
  dbTableList = dbTableList.substring(0, dbTableList.length - 2);

  output = output.replace(/#namespace#escape/g,
      this.namespace_.replace(/\./g, '_'));
  output = output.replace(/#dbtablelist/g, dbTableList);
  output = output.replace(/#dbversion/g, this.schema_.version.toString());
  output = output.replace(/#namespace/g, this.namespace_);
  output = output.replace(/#dbname/g, this.schema_.name);
  var bundledMode = this.schema_.pragma ?
      (this.schema_.pragma.enableBundledMode || false) : false;
  output = output.replace(/#bundledmode/g, bundledMode.toString());

  return this.parse_(output.split('\n')).join('\n');
};


/** @type {Object} */
exports.CodeGenerator = CodeGenerator;
