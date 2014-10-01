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
var fs = require('fs');
var path = require('path');
var parse = userRequire('parser').parse;

describe('YAML Parser Test', function() {
  it('should parse codegen.yaml without issue', function() {
    var testFile = fs.readFileSync(testdata['codegen.yaml']);
    var schema = parse(testFile);
    expect(schema.name).toEqual('db');
    expect(schema.version).toEqual(1);
  });

  /** @param {string} file */
  var thrower = function(file) {
    var testFile = fs.readFileSync(testdata[file]);
    expect(function() { parse(testFile); }).toThrow();
  };

  it('should throw if input were invalid YAML', function() {
    thrower('invalid.yaml');
  });

  it('should throw if column had invalid type', function() {
    thrower('invalid_column_type.yaml');
  });

  it('should throw if missing required field', function() {
    thrower('missing_required_field.yaml');
  });

  it('should throw if required array were empty', function() {
    thrower('required_array_empty.yaml');
  });

  it('should throw if object were null or undefined', function() {
    thrower('required_object_null.yaml');
  });

  it('should throw if number/integer were not a number', function() {
    thrower('nan.yaml');
  });

  it('should throw if primary key were not a column', function() {
    thrower('primary_key_not_found.yaml');
  });

  it('should throw if column name conflicted with primary key name',
      function() {
        thrower('primary_key_name_conflict.yaml');
      });

  it('should throw if unique constraint name conflicted', function() {
    thrower('unique_key_name_conflict.yaml');
  });

  it('should throw if unique were not on a column', function() {
    thrower('unique_key_not_found.yaml');
  });

  it('should throw if foreign key had invalid local column', function() {
    thrower('foreign_key_invalid_local_column.yaml');
  });

  it('should throw if foreign key had invalid reference', function() {
    thrower('foreign_key_invalid_reference.yaml');
  });

  it('should throw if foreign key had invalid remote column', function() {
    thrower('foreign_key_invalid_remote_column.yaml');
  });

  it('should throw if foreign key name conflicted', function() {
    thrower('foreign_key_name_conflict.yaml');
  });

  it('should throw if a column is both PK and FK', function() {
    thrower('key_conflict.yaml');
  });

  it('should throw if a column is both PK and index', function() {
    thrower('key_conflict2.yaml');
  });

  it('should throw if unique column is already defined unique', function() {
    thrower('key_conflict3.yaml');
  });

  it('should throw if foreign key is defined on a unique column', function() {
    thrower('key_conflict4.yaml');
  });

  it('should throw if nullable column not found', function() {
    thrower('nullable_not_found.yaml');
  });

  it('should throw if nullable on non-nullable columns', function() {
    thrower('nullable_not_allowed.yaml');
  });

  it('should throw if nullable on integer columns', function() {
    thrower('integer_nullable_not_allowed.yaml');
  });

  it('should throw if nullable on number columns', function() {
    thrower('number_nullable_not_allowed.yaml');
  });

  it('should throw if nullable on boolean columns', function() {
    thrower('boolean_nullable_not_allowed.yaml');
  });

  it('should throw if index name conflicted with table', function() {
    thrower('index_name_conflict.yaml');
  });

  it('should throw if index name conflicted with column/constraint',
      function() {
        thrower('index_name_conflict2.yaml');
      });

  it('should throw if indexed column not found', function() {
    thrower('index_on_nonexist_column.yaml');
  });

  it('should throw if indexed on nullable column', function() {
    thrower('index_on_nullable.yaml');
  });

  it('should throw if index order were invalid', function() {
    thrower('invalid_index_order.yaml');
  });

  it('should throw if DB name conflicted with reserved words', function() {
    thrower('invalid_db_name.yaml');
  });
});
