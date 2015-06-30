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
goog.setTestOnly();
goog.require('goog.testing.jsunit');
goog.require('lf.schema.Info');
goog.require('lf.testing.hrSchema.getSchemaBuilder');


function testGetReferencingForeignKeys() {
  var builder = lf.testing.hrSchema.getSchemaBuilder();
  var info = new lf.schema.Info(builder.getSchema());

  var getRefs = function(tableName) {
    var refs = info.getReferencingForeignKeys(tableName);
    return !refs ? null : refs.map(function(ref) {
      return ref.name;
    });
  };

  assertSameElements(['Country.fk_RegionId'], getRefs('Region'));
  assertSameElements(['Location.fk_CountryId'], getRefs('Country'));
}
