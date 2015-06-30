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
goog.provide('lf.schema.Info');

goog.require('lf.structs.Map');



/**
 * Read-only objects that provides information for schema metadata.
 *
 * @constructor
 * @struct
 * @final
 *
 * @param {!lf.schema.Database} dbSchema
 */
lf.schema.Info = function(dbSchema) {
  /**
   * The map of table name to their referencing foreign keys.
   * @private {!lf.structs.Map<string, !Array<!lf.schema.ForeignKeySpec>>}
   */
  this.referringFk_ = new lf.structs.Map();

  dbSchema.tables().forEach(function(table) {
    table.getConstraint().getForeignKeys().forEach(function(fkSpec) {
      var parentRefs = this.referringFk_.get(fkSpec.parentTable) || [];
      parentRefs.push(fkSpec);
      this.referringFk_.set(fkSpec.parentTable, parentRefs);
    }, this);
  }, this);
};


/**
 * Looks up referencing foreign key for a given table.
 * @param {string} tableName
 * @return {?Array<!lf.schema.ForeignKeySpec>}
 */
lf.schema.Info.prototype.getReferencingForeignKeys = function(tableName) {
  return this.referringFk_.get(tableName) || null;
};
