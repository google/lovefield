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
 * @fileoverview Code generator for given templates. The class reads the schema
 * and generates following variables:
 *
 * #bundledmode: enableBundledMode pragma value, default to false
 * #column: array of columns of last used #table, must be used in #repeatcolumn
 * #columnuniqueness: uniqueness of last used #column
 * #columnnullable: nullability of last used #column
 * #dbname: database name
 * #dbtablelist: database table list
 * #dbversion: database version
 * #keyofindex: function body of a row's keyOfIndex function
 * #namespace: namespace given by the user
 * #table: array of tables defined in schema, must be used in #repeattable
 * #tablecolumntypes: column as members with type annotation
 * #tablecolumndbtypes: column as members with type annotation
 * #tablename: table name of last used #table
 * #tablepersistentindex: table pragma persistIndex
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
 * @param {string} namespace
 * @param {!lf.schema.Database} schema Validated DB schema
 * @constructor
 */
var CodeGenerator = function(namespace, schema) {
  /** @private {!lf.schema.Database} */
  this.schema_ = schema;

  /** @private {string} */
  this.namespace_ = namespace;

  /** @private {?string} */
  this.fileName_ = null;

  /**
   * A stack used to store relative line numbers.
   * @private {!Array<number>}
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
 * @param {!Array<string>} lines
 * @return {!Array<string>}
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
        this.error('Code generator out of state');
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
 * @param {!Array<string>} lines
 * @return {!Array<string>}
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
 * @param {!lf.schema.Table} table
 * @param {string} prefix
 * @return {string}
 * @private
 */
CodeGenerator.prototype.genGetDefaultPayload_ = function(table, prefix) {
  var body = [];  // Object body for UserType default object.

  /**
   * @param {!lf.schema.Column} col
   * @param {string} defaultValue
   */
  var pushField = function(col, defaultValue) {
    var lhs = '  ' + prefix + '.' + col.getName() + ' = ';
    body.push(lhs + (col.isNullable() ? 'null' : defaultValue) + ';');
  };

  table.getColumns().forEach(function(col) {
    if (col.getType() == lf.Type.STRING) {
      pushField(col, '\'\'');
    } else if (col.getType() == lf.Type.BOOLEAN) {
      pushField(col, 'false');
    } else if (col.getType() == lf.Type.DATE_TIME) {
      pushField(col, 'new Date(0)');
    } else if (col.getType() == lf.Type.ARRAY_BUFFER) {
      pushField(col, 'new ArrayBuffer(0)');
    } else if (col.getType() == lf.Type.OBJECT) {
      pushField(col, '{}');
    } else {  // integer, number
      pushField(col, '0');
    }
  });

  return body.join('\n');
};


/**
 * @param {!lf.schema.Table} table
 * @param {string} prefix
 * @return {string}
 * @private
 */
CodeGenerator.prototype.genToDbPayload_ = function(table, prefix) {
  var body = table.getColumns().map(function(col) {
    var lhs = '  ' + prefix + '.' + col.getName() + ' =';
    switch (col.getType()) {
      case lf.Type.ARRAY_BUFFER:
        return lhs + ' lf.Row.binToHex(this.payload().' + col.getName() + ');';
      case lf.Type.DATE_TIME:
        if (col.isNullable()) {
          return lhs + '\n      goog.isDefAndNotNull(this.payload().' +
              col.getName() + ') ?\n' +
              '      this.payload().' + col.getName() + '.getTime() : null;';
        }
        return lhs + ' this.payload().' + col.getName() + '.getTime();';
      case lf.Type.OBJECT:
        return lhs + '\n      goog.isDefAndNotNull(this.payload().' +
            col.getName() + ') ?\n' +
            '      this.payload().' + col.getName() + ' : null;';
      default:
        return lhs + ' this.payload().' + col.getName() + ';';
    }
  });

  return body.join('\n');
};


/**
 * Produces code that when run extracts an index key from a row.
 * Because this function is used both for single/cross column indices, and for
 * non-nullable/nullable indices it needs to be customized to produce the
 * correct output in both situations.
 * @param {!lf.schema.Table} table
 * @param {!lf.schema.Column} column
 * @param {string} indentation The prefix to use for each line.
 * @param {boolean} includeSemicolonAndReturn Whether the output should include
 *     semicolons and 'return' keywords.
 * @return {string}
 * @private
 */
CodeGenerator.columnToKey_ = function(
    table, column, indentation, includeSemicolonAndReturn) {
  var body = [];

  var pushLine = function(line) {
    body.push(indentation + line + (includeSemicolonAndReturn ? ';' : ''));
  };

  switch (column.getType()) {
    case lf.Type.DATE_TIME:
      if (column.isNullable()) {
        pushLine('var value = this.payload().' + column.getName());
        pushLine('return goog.isDefAndNotNull(value) ? value.getTime() : null');
      } else {
        pushLine(
            (includeSemicolonAndReturn ? 'return ' : '') +
            'this.payload().' + column.getName() + '.getTime()');
      }
      break;
    case lf.Type.STRING:
    case lf.Type.INTEGER:
    case lf.Type.NUMBER:
      pushLine(
          (includeSemicolonAndReturn ? 'return ' : '') +
          'this.payload().' + column.getName());
      break;
    case lf.Type.BOOLEAN:
      if (column.isNullable()) {
        pushLine('var value = this.payload().' + column.getName());
        pushLine('return goog.isDefAndNotNull(value) ? (value ? 1 : 0) : null');
      } else {
        pushLine(
            (includeSemicolonAndReturn ? 'return ' : '') +
            'this.payload().' + column.getName() + ' ? 1 : 0');
      }
      break;
    default:
      throw new Error();
  }

  return body.join('\n');
};


/**
 * @param {!lf.schema.Table} table
 * @param {!lf.schema.Index} indexSchema
 * @return {string}
 * @private
 */
CodeGenerator.prototype.genKeyOfIndexForSchema_ = function(table, indexSchema) {
  var indentation = indexSchema.columns.length > 1 ? '        ' : '      ';
  var includeSemicolonAndReturn = indexSchema.columns.length == 1;

  var strings = indexSchema.columns.map(function(column) {
    return CodeGenerator.columnToKey_(
        table, column.schema, indentation, includeSemicolonAndReturn);
  });
  return (strings.length == 1 ?
      strings[0] :
      '      return [\n' + strings.join(',\n') + '\n      ];');
};


/**
 * @param {!lf.schema.Table} table
 * @param {string} prefix
 * @return {string}
 * @private
 */
CodeGenerator.prototype.genKeyOfIndex_ = function(table, prefix) {
  var body = [];
  body.push('  switch (' + prefix + ') {');
  var genCase = function(keyName) {
    body.push('    case \'' + table.getName() + '.' + keyName + '\':');
  };

  table.getIndices().forEach(function(indexSchema) {
    genCase(indexSchema.name);
    body.push(this.genKeyOfIndexForSchema_(table, indexSchema));
  }, this);

  // '#' is the name of the special RowId index.
  genCase('#');
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
 * @param {!lf.schema.Table} table
 * @param {string} target
 * @param {string} record
 * @return {string}
 * @private
 */
CodeGenerator.prototype.genDeserializeRow_ = function(table, target, record) {
  var body = [
    '  var data = ' + record + '[\'value\']' + ';'
  ];

  table.getColumns().forEach(function(col) {
    var prefix = '  data.' + col.getName() + ' = ';
    switch (col.getType()) {
      case lf.Type.ARRAY_BUFFER:
        if (!col.isNullable()) {
          body.push(prefix + '/** @type {!ArrayBuffer} */ (\n' +
              '      lf.Row.hexToBin(data.' + col.getName() + '));');
        } else {
          body.push(prefix + 'lf.Row.hexToBin(data.' + col.getName() + ');');
        }
        break;
      case lf.Type.DATE_TIME:
        var temp = 'data.' + col.getName();
        if (col.isNullable()) {
          body.push(prefix + 'goog.isDefAndNotNull(' + temp + ') ?\n' +
              '      new Date(' + temp + ') : null;');
        } else {
          body.push(prefix + 'new Date(' + temp + ');');
        }
        break;
    }
  });

  body.push('  return new ' + target + '(' + record + '[\'id\'], data);');
  return body.join('\n');
};


/**
 * Converts a column type to a JS type annotation.
 * @param {!lf.schema.Column} column
 * @param {boolean} ignoreNullable Whether to take into account nullability of
 *     the column.
 * @return {string} The type annotation to be used in generated code.
 * @private
 */
CodeGenerator.columnTypeToJsType_ = function(column, ignoreNullable) {
  var isNullable = !ignoreNullable && column.isNullable();
  switch (column.getType()) {
    case lf.Type.ARRAY_BUFFER:
      return (isNullable ? '?' : '!') + 'ArrayBuffer';
    case lf.Type.DATE_TIME:
      return (isNullable ? '?' : '!') + 'Date';
    case lf.Type.INTEGER:
    case lf.Type.NUMBER:
      return (isNullable ? '?' : '') + 'number';
    case lf.Type.STRING:
      return (isNullable ? '?' : '') + 'string';
    case lf.Type.BOOLEAN:
      return (isNullable ? '?' : '') + 'boolean';
    case lf.Type.OBJECT:
      return (isNullable ? '?' : '!') + 'Object';
    default: throw new Error('Invalid column type: ' + column.getType());
  }
};


/**
 * Converts a column type to a JS database type annotation.
 * @param {!lf.schema.Column} column
 * @return {string} The type annotation to be used in generated code.
 * @private
 */
CodeGenerator.columnTypeToJsDbType_ = function(column) {
  switch (column.getType()) {
    case lf.Type.DATE_TIME:
      return (column.isNullable() ? '?' : '') + 'number';
    case lf.Type.ARRAY_BUFFER:
      return (column.isNullable() ? '?' : '') + 'string';
    default: return CodeGenerator.columnTypeToJsType_(column, false);
  }
};


/**
 * Converts a column type to a string representing an lf.Type enumeration.
 * @param {!lf.Type} columnType The type to be converted.
 * @return {string}
 * @private
 */
CodeGenerator.columnTypeToEnumType_ = function(columnType) {
  switch (columnType) {
    case lf.Type.ARRAY_BUFFER: return 'lf.Type.ARRAY_BUFFER';
    case lf.Type.BOOLEAN: return 'lf.Type.BOOLEAN';
    case lf.Type.DATE_TIME: return 'lf.Type.DATE_TIME';
    case lf.Type.INTEGER: return 'lf.Type.INTEGER';
    case lf.Type.NUMBER: return 'lf.Type.NUMBER';
    case lf.Type.STRING: return 'lf.Type.STRING';
    case lf.Type.OBJECT: return 'lf.Type.OBJECT';
    default: throw new Error('Invalid type: ' + columnType);
  }
};


/**
 * @param {!lf.schema.Table} table
 * @param {string} prefix
 * @return {string}
 * @private
 */
CodeGenerator.prototype.genRowGetSet_ = function(table, prefix) {
  var results = [];

  table.getColumns().forEach(function(col) {
    var jsType = CodeGenerator.columnTypeToJsType_(col, false);
    var value = 'this.payload().' + col.getName();
    var getter = '  return ' + value + ';';
    var setter = '  ' + value + ' = value;';

    results.push('\n\n/** @return {' + jsType + '} */');
    results.push(prefix + '.get' + this.toPascal_(col.getName()) +
        ' = function() {');
    results.push(getter);
    results.push('};');

    var className = prefix.substring(0, prefix.indexOf('.prototype'));
    results.push('\n\n/**');
    results.push(' * @param {' + jsType + '} value');
    results.push(' * @return {!' + className + '}');
    results.push('*/');
    results.push(prefix + '.set' + this.toPascal_(col.getName()) +
        ' = function(value) {');
    results.push(setter);
    results.push('  return this;');
    results.push('};');
  }, this);

  return results.join('\n');
};


/**
 * @param {!Array<string>} lines
 * @return {!Array<string>}
 * @private
 */
CodeGenerator.prototype.processRepeatTable_ = function(lines) {
  var tables = this.schema_.tables();
  var results = [];

  tables.forEach(function(table, i) {
    var pool = [];
    var name = table.getName();
    var pascal = this.toPascal_(name);
    var camel = this.toCamel_(name);
    var indices = this.getIndices_(table);
    var constraint = this.getConstraint_(table);
    var colTypes = this.getColumnTypes_(table);
    var colDbTypes = this.getColumnDbTypes_(table);

    for (var j = 0; j < lines.length; ++j) {
      var genLine = lines[j];
      // Regex replacing must start from the longest pattern.
      genLine = genLine.replace(
          /#tablepersistentindex/g, table.persistentIndex().toString());
      genLine = genLine.replace(/#tablecolumndbtypes/g, colDbTypes);
      genLine = genLine.replace(/#tablecolumntypes/g, colTypes);
      genLine = genLine.replace(/#tableindices/g, indices);
      genLine = genLine.replace(/#tableconstraint/g, constraint);
      genLine = genLine.replace(/#table#pascal/g, pascal);
      genLine = genLine.replace(/#table#camel/g, camel);
      genLine = genLine.replace(/#tablename/g, name);

      // These patterns must be replaced last.
      var prefix = genLine.split(' ')[1];
      if (prefix) {
        // The genLine is splitted by space, but on Windows an additional
        // \r may be added, therefore need to trim the token here.
        prefix = prefix.trim();
      }
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
        var source = genLine.split(' ')[2].trim();
        genLine = this.genDeserializeRow_(table, prefix, source);
      }

      if (genLine != CodeGenerator.SKIP_LINE_) {
        pool.push(genLine);
      }
    }

    this.tableIndex_ = i;
    results = results.concat(this.parse_(pool));
  }, this);

  this.tableIndex_ = -1;
  return results;
};


/**
 * @param {!lf.schema.Table} table
 * @param {!lf.schema.Index} indexSchema
 * @param {number} indentCount
 * @return {string}
 * @private
 */
CodeGenerator.getIndexDefinition_ = function(table, indexSchema, indentCount) {
  var generateIndent = function(count) {
    var indentation = '';
    for (var i = 0; i < count; i++) {
      indentation += ' ';
    }

    return indentation;
  };

  var getIndent = function(relativeIndent) {
    return generateIndent(indentCount) + generateIndent(relativeIndent);
  };

  var body = 'new lf.schema.Index(\'' + table.getName() + '\', \'' +
      indexSchema.name + '\', ' + indexSchema.isUnique.toString() + ',\n' +
      getIndent(4);
  var columnBodys = indexSchema.columns.map(function(col) {
    var colBody = getIndent(6) + '{schema: this.' + col.schema.getName() + ',';
    colBody += ' order: ' +
        (col.order == lf.Order.DESC ? 'lf.Order.DESC' : 'lf.Order.ASC');
    if (table.getConstraint().getPrimaryKey() &&
        table.getConstraint().getPrimaryKey().name == indexSchema.name) {
      colBody += ', autoIncrement: ' + (col.autoIncrement ? 'true' : 'false');
    }
    colBody += '}';

    return colBody;
  });
  return getIndent(0) + body + '[\n' + columnBodys.join(',\n') + '\n' +
      getIndent(4) + '])';
};


/**
 * @param {!lf.schema.Table} table
 * @return {string}
 * @private
 */
CodeGenerator.prototype.getForeignKeySpec_ = function(table) {
  if (!table.getConstraint().getForeignKeys()) {
    return '';
  }

  var getAction = function(action) {
    return action == lf.ConstraintAction.CASCADE ?
        'lf.ConstraintAction.CASCADE' :
        'lf.ConstraintAction.RESTRICT';
  };

  var getTiming = function(timing) {
    return timing == lf.ConstraintTiming.DEFERRABLE ?
        'lf.ConstraintTiming.DEFERRABLE' :
        'lf.ConstraintTiming.IMMEDIATE';
  };

  return table.getConstraint().getForeignKeys().map(function(spec) {
    var parts = spec.name.split('.');
    var childTable = parts[0];
    var name = parts[1];

    return '    new lf.schema.ForeignKeySpec(\n' +
        '        {\n' +
        '          \'local\': \'' + spec.childColumn + '\',\n' +
        '          \'ref\': \'' + spec.parentTable + '.' + spec.parentColumn +
            '\',\n' +
        '          \'action\': ' + getAction(spec.action) + ',\n' +
        '          \'timing\': ' + getTiming(spec.timing) + '\n' +
        '        }, \'' + childTable + '\', \'' + name + '\')';
  }).join(',\n');
};


/**
 * @param {!lf.schema.Table} table
 * @return {string}
 * @private
 */
CodeGenerator.prototype.getConstraint_ = function(table) {
  var results = [];

  var getNotNullable = (function() {
    var notNullable = table.getColumns().filter(function(column) {
      return !column.isNullable();
    }).map(function(column) {
      return '    this.' + column.getName();
    });
    return '  var notNullable = [\n' + notNullable.join(',\n') + '\n  ];';
  }).bind(this);

  if (table.getConstraint()) {
    var pkIndexSchema = table.getConstraint().getPrimaryKey();
    results.push(pkIndexSchema == null ?
        '  var pk = ' + pkIndexSchema + ';' :
        '  var pk = this.getIndices()[0];');
    results.push(getNotNullable());

    results.push('  var foreignKeys = [');
    var fkSpec = this.getForeignKeySpec_(table);
    if (fkSpec.length) {
      results.push(fkSpec);
    }
    results.push('  ];');

    results.push('  this.constraint_ = new lf.schema.Constraint(\n' +
        '      pk, notNullable, foreignKeys);');
  } else {
    results.push(getNotNullable());
    results.push('  this.constraint_ = new lf.schema.Constraint(' +
        'null, notNullable, []);');
  }

  results.push('  return this.constraint_;');
  return results.join('\n');
};


/**
 * @param {!lf.schema.Table} table
 * @return {string}
 * @private
 */
CodeGenerator.prototype.getIndices_ = function(table) {
  return table.getIndices().map(function(indexSchema) {
    return CodeGenerator.getIndexDefinition_(table, indexSchema, 4);
  }, this).join(',\n');
};


/**
 * @param {!lf.schema.Table} table
 * @return {string}
 * @private
 */
CodeGenerator.prototype.getColumnTypes_ = function(table) {
  var result = table.getColumns().map(
      function(col) {
        var jsType = CodeGenerator.columnTypeToJsType_(col, false);
        return '  /** @export @type {' + jsType + '} */\n  this.' +
            this.toCamel_(col.getName()) + ';\n';
      }, this).join('');
  return result.substring(0, result.length - 1);
};


/**
 * @param {!lf.schema.Table} table
 * @return {string}
 * @private
 */
CodeGenerator.prototype.getColumnDbTypes_ = function(table) {
  var result = table.getColumns().map(
      function(col) {
        var jsType = CodeGenerator.columnTypeToJsDbType_(col);
        return '  /** @export @type {' + jsType + '} */\n  this.' +
            this.toCamel_(col.getName()) + ';\n';
      }, this).join('');
  return result.substring(0, result.length - 1);
};


/**
 * @param {!lf.schema.Table} table
 * @return {!Array<string>}
 * @private
 */
CodeGenerator.prototype.getUniqueColumns_ = function(table) {
  var ret = [];

  table.getIndices().forEach(function(indexSchema) {
    if (indexSchema.isUnique && indexSchema.columns.length == 1) {
      ret.push(indexSchema.columns[0].schema.getName());
    }
  });

  return ret;
};


/**
 * @param {!lf.schema.Table} table
 * @return {!Array<string>}
 * @private
 */
CodeGenerator.prototype.getNullableColumns_ = function(table) {
  return table.getColumns().filter(
      function(column) {
        return column.isNullable();
      }).map(
      function(column) {
        return column.getName();
      });
};


/**
 * @param {!Array<string>} lines
 * @return {!Array<string>}
 * @private
 */
CodeGenerator.prototype.processRepeatColumn_ = function(lines) {
  var table = this.schema_.tables()[this.tableIndex_];
  var columns = table.getColumns();
  var uniqueColumns = this.getUniqueColumns_(table);
  var nullableColumns = this.getNullableColumns_(table);

  var results = [];

  columns.forEach(function(col) {
    var name = col.getName();
    var pascal = this.toPascal_(name);
    var camel = this.toCamel_(name);
    var isUnique = uniqueColumns.indexOf(name) != -1;
    var isNullable = nullableColumns.indexOf(name) != -1;

    for (var j = 0; j < lines.length; ++j) {
      var genLine = lines[j];
      genLine = genLine.replace(/#column#pascal/g, pascal);
      genLine = genLine.replace(/#column#camel/g, camel);
      genLine = genLine.replace(/#columnuniqueness/g, isUnique.toString());
      genLine = genLine.replace(/#columnnullable/g, isNullable.toString());
      genLine = genLine.replace(
          /#columnjstype/g, CodeGenerator.columnTypeToJsType_(col, true));
      genLine = genLine.replace(
          /#columnenumtype/g,
          CodeGenerator.columnTypeToEnumType_(col.getType()));
      results.push(genLine);
    }
  }, this);

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
  this.schema_.tables().forEach(function(tableSchema) {
    dbTableList = dbTableList + '    this.' +
        this.toCamel_(tableSchema.getName()) + '_,\n';
  }, this);
  dbTableList = dbTableList.substring(0, dbTableList.length - 2);

  output = output.replace(/#namespace#escape/g,
      this.namespace_.replace(/\./g, '_'));
  output = output.replace(/#dbtablelist/g, dbTableList);
  output = output.replace(/#dbversion/g, this.schema_.version().toString());
  output = output.replace(/#namespace/g, this.namespace_);
  output = output.replace(/#dbname/g, this.schema_.name());
  var bundledMode = this.schema_.pragma().enableBundledMode;
  output = output.replace(/#bundledmode/g, bundledMode.toString());

  return this.parse_(output.split('\n')).join('\n');
};


/** @type {Object} */
exports.CodeGenerator = CodeGenerator;
