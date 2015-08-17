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
var fs = require('fs');
var path = require('path');
var parse = require('./parser').convert;

describe('YAML Parser Test', function() {
  it('should parse codegen.yaml without issue', function() {
    var testFile = fs.readFileSync(testdata['codegen.yaml']);
    var schema = parse(testFile);
    expect(schema.name()).toEqual('db');
    expect(schema.version()).toEqual(1);
  });

  it('should parse bundled_mode.yaml without issue', function() {
    var testFile = fs.readFileSync(testdata['bundled_mode.yaml']);
    var schema = parse(testFile);
    expect(schema.name()).toEqual('pdb');
  });

  it('should parse bundled_mode_disabled.yaml without issue', function() {
    var testFile = fs.readFileSync(testdata['bundled_mode_disabled.yaml']);
    var schema = parse(testFile);
    expect(schema.name()).toEqual('pdb');
  });

  it('should parse persistent_index.yaml without issue', function() {
    var testFile = fs.readFileSync(testdata['persistent_index.yaml']);
    var schema = parse(testFile);
    expect(schema.name()).toEqual('idb');
  });

  /** @param {string} file */
  var thrower = function(file) {
    var testFile = fs.readFileSync(testdata[file]);
    expect(function() { parse(testFile); }).toThrow();
  };

  it('should throw if input were invalid YAML', function() {
    thrower('invalid.yaml');
  });

  it('should throw if column had invalid name', function() {
    thrower('invalid_column_name.yaml');
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

  it('should throw if primary key on non-indexable column', function() {
    thrower('invalid_primary_key.yaml');
  });

  it('should throw if auto-inc used with non-integer primary key', function() {
    thrower('invalid_auto_increment1.yaml');
  });

  it('should throw if auto-inc used cross-column primary key', function() {
    thrower('invalid_auto_increment2.yaml');
  });

  it('should throw if unique constraint name is invalid', function() {
    thrower('invalid_unique_key_name.yaml');
  });

  it('should throw if unique constraint name conflicted', function() {
    thrower('unique_key_name_conflict.yaml');
  });

  it('should throw if unique were not on a column', function() {
    thrower('unique_key_not_found.yaml');
  });

  it('should throw if unique on non-indexable column', function() {
    thrower('invalid_unique_key.yaml');
  });

  it('should throw if foreign key name is invalid', function() {
    thrower('invalid_foreign_key_name.yaml');
  });

  it('should throw if foreign key had invalid local column', function() {
    thrower('foreign_key_invalid_local_column.yaml');
  });

  it('should throw if foreign key had invalid reference', function() {
    thrower('foreign_key_invalid_reference.yaml');
  });

  it('should throw if foreign key had invalid reference 2', function() {
    thrower('foreign_key_invalid_reference2.yaml');
  });

  it('should throw if foreign key had invalid reference 3', function() {
    thrower('foreign_key_invalid_reference3.yaml');
  });

  it('should throw if foreign key had invalid remote column', function() {
    thrower('foreign_key_invalid_remote_column.yaml');
  });

  it('should throw if foreign key had invalid action', function() {
    thrower('foreign_key_invalid_action.yaml');
  });

  it('should throw if foreign key had invalid timing', function() {
    thrower('foreign_key_invalid_timing.yaml');
  });

  it('should throw if foreign key had invalid action/timing combination',
      function() {
        thrower('foreign_key_invalid_remote_column.yaml');
      });

  it('should throw if discovered foreign key chain', function() {
    thrower('foreign_key_chain.yaml');
  });

  it('should throw if detected foreign key loop', function() {
    thrower('foreign_key_loop.yaml');
  });

  it('should throw if foreign key name conflicted', function() {
    thrower('foreign_key_name_conflict.yaml');
  });

  it('should throw if detected foreign key chain', function() {
    thrower('foreign_key_chain.yaml');
  });

  it('should throw if ref column is not unique', function() {
    thrower('foreign_key_non_unique.yaml');
  });

  it('should throw if ref column is not unique 2', function() {
    thrower('foreign_key_non_unique2.yaml');
  });

  it('should throw if ref column is not unique 3', function() {
    thrower('foreign_key_non_unique3.yaml');
  });

  it('should throw if foreign key on non-indexable column', function() {
    thrower('invalid_foreign_key.yaml');
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

  it('should throw if nullable column not found', function() {
    thrower('nullable_not_found.yaml');
  });

  it('should throw if nullable on non-nullable columns', function() {
    thrower('nullable_not_allowed.yaml');
  });

  it('should throw if index name is invalid', function() {
    thrower('invalid_index_name.yaml');
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

  it('should throw if index order were invalid', function() {
    thrower('invalid_index_order.yaml');
  });

  it('should throw if index on non-indexable column', function() {
    thrower('invalid_index_type.yaml');
  });

  it('should throw if DB name conflicted with reserved words', function() {
    thrower('invalid_db_name.yaml');
  });

  it('should throw if table had invalid name', function() {
    thrower('invalid_table_name.yaml');
  });

  it('should throw if primary key is also nullable', function() {
    thrower('invalid_nullable.yaml');
  });

  it('should throw if cross-column primary key has invalid type', function() {
    thrower('invalid_cross_column_key.yaml');
  });

  it('should throw if cross-column primary key is nullable', function() {
    thrower('invalid_cross_column_key2.yaml');
  });
});
