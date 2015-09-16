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

goog.require('lf.ConstraintAction');
goog.require('lf.structs.MapSet');
goog.require('lf.structs.map');
goog.require('lf.structs.set');



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
  /** @private {!lf.schema.Database} */
  this.schema_ = dbSchema;

  /**
   * The map of table name to their referencing foreign keys.
   * @private {!lf.structs.MapSet<string, !lf.schema.ForeignKeySpec>}
   */
  this.referringFk_ = new lf.structs.MapSet();

  /**
   * The map of table name to their parent tables.
   * @private {!lf.structs.MapSet<string, !lf.schema.Table>}
   */
  this.parents_ = new lf.structs.MapSet();

  /**
   * The map of fully qualified column name to its parent table name.
   * @private {!lf.structs.Map<string, string>}
   */
  this.colParent_ = lf.structs.map.create();

  /**
   * The map of table to their child tables.
   * @private {!lf.structs.MapSet<string, !lf.schema.Table>}
   */
  this.children_ = new lf.structs.MapSet();

  /** @private {!lf.structs.MapSet<string, !lf.schema.Table>} */
  this.cascadeChildren_ = new lf.structs.MapSet();

  /** @private {!lf.structs.MapSet<string, !lf.schema.Table>} */
  this.restrictChildren_ = new lf.structs.MapSet();

  /**
   * The map of full qualified column name to their child table name.
   * @private {!lf.structs.MapSet<string, string>}
   */
  this.colChild_ = new lf.structs.MapSet();

  this.init_();
};


/**
 * Initialize internal structures.
 * @private
 */
lf.schema.Info.prototype.init_ = function() {
  this.schema_.tables().forEach(function(table) {
    var tableName = table.getName();
    table.getConstraint().getForeignKeys().forEach(function(fkSpec) {
      this.referringFk_.set(fkSpec.parentTable, fkSpec);

      this.parents_.set(tableName, this.schema_.table(fkSpec.parentTable));
      this.children_.set(fkSpec.parentTable, table);
      if (fkSpec.action == lf.ConstraintAction.RESTRICT) {
        this.restrictChildren_.set(fkSpec.parentTable, table);
      } else { // fkspec.action == lf.ConstraintAction.CASCADE
        this.cascadeChildren_.set(fkSpec.parentTable, table);
      }

      this.colParent_.set(table.getName() + '.' + fkSpec.childColumn,
          fkSpec.parentTable);

      var ref = fkSpec.parentTable + '.' + fkSpec.parentColumn;
      this.colChild_.set(ref, table.getName());
    }, this);
  }, this);
};


/**
 * Looks up referencing foreign key for a given table.
 * @param {string} tableName
 * @return {?Array<!lf.schema.ForeignKeySpec>}
 */
lf.schema.Info.prototype.getReferencingForeignKeys = function(tableName) {
  return this.referringFk_.get(tableName);
};


/**
 * @param {string} tableName
 * @param {!lf.structs.MapSet<string, !lf.schema.Table>} map The map to lookup.
 * @return {!Array<!lf.schema.Table>}
 * @private
 */
lf.schema.Info.prototype.expandScope_ = function(tableName, map) {
  var values = map.get(tableName);
  return goog.isNull(values) ? [] : values;
};


/**
 * Looks up parent tables for given tables.
 * @param {string} tableName
 * @return {!Array<!lf.schema.Table>}
 */
lf.schema.Info.prototype.getParentTables = function(tableName) {
  return this.expandScope_(tableName, this.parents_);
};


/**
 * Looks up parent tables for a given column set.
 * @param {!Array<string>} colNames
 * @return {!Array<!lf.schema.Table>}
 */
lf.schema.Info.prototype.getParentTablesByColumns = function(colNames) {
  var tableNames = lf.structs.set.create();
  colNames.forEach(function(col) {
    var table = this.colParent_.get(col);
    if (table) {
      tableNames.add(table);
    }
  }, this);
  var tables = lf.structs.set.values(tableNames);
  return tables.map(function(tableName) {
    return this.schema_.table(tableName);
  }, this);
};


/**
 * Looks up child tables for given tables.
 * @param {string} tableName
 * @param {!lf.ConstraintAction=} opt_constraintAction The type of children to
 *     return (RESTRICT/CASCADE). If not specified all types of children are
 *     returned.
 * @return {!Array<!lf.schema.Table>}
 */
lf.schema.Info.prototype.getChildTables = function(
    tableName, opt_constraintAction) {
  if (!goog.isDefAndNotNull(opt_constraintAction)) {
    return this.expandScope_(tableName, this.children_);
  } else if (opt_constraintAction == lf.ConstraintAction.RESTRICT) {
    return this.expandScope_(tableName, this.restrictChildren_);
  } else {
    return this.expandScope_(tableName, this.cascadeChildren_);
  }
};


/**
 * Looks up child tables for a given column set.
 * @param {!Array<string>} colNames
 * @return {!Array<!lf.schema.Table>}
 */
lf.schema.Info.prototype.getChildTablesByColumns = function(colNames) {
  var tableNames = lf.structs.set.create();
  colNames.forEach(function(col) {
    var children = this.colChild_.get(col);
    if (children) {
      children.forEach(function(child) {
        tableNames.add(child);
      });
    }
  }, this);
  var tables = lf.structs.set.values(tableNames);
  return tables.map(function(tableName) {
    return this.schema_.table(tableName);
  }, this);
};
