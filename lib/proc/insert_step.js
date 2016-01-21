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
goog.provide('lf.proc.InsertOrReplaceStep');
goog.provide('lf.proc.InsertStep');

goog.require('lf.proc.PhysicalQueryPlanNode');
goog.require('lf.proc.Relation');
goog.require('lf.service');



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!lf.Global} global
 * @param {!lf.schema.Table} table
 */
lf.proc.InsertStep = function(global, table) {
  lf.proc.InsertStep.base(this, 'constructor',
      0,
      lf.proc.PhysicalQueryPlanNode.ExecType.NO_CHILD);

  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = global.getService(lf.service.INDEX_STORE);

  /** @private {!lf.schema.Table} */
  this.table_ = table;
};
goog.inherits(lf.proc.InsertStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.InsertStep.prototype.toString = function() {
  return 'insert(' + this.table_.getName() + ')';
};


/** @override */
lf.proc.InsertStep.prototype.execInternal = function(
    relations, journal, context) {
  var queryContext = /** @type {!lf.query.InsertContext} */ (context);
  lf.proc.InsertStep.assignAutoIncrementPks_(
      this.table_, queryContext.values, this.indexStore_);
  journal.insert(this.table_, queryContext.values);

  return [lf.proc.Relation.fromRows(
      queryContext.values, [this.table_.getName()])];
};


/**
 * Assigns primary keys if a primary key exists and 'autoIncrement' is specified
 * for this table, only for rows where the primary key has been left
 * unspecified.
 * @param {!lf.schema.Table} table The table schema.
 * @param {!Array<!lf.Row>} values
 * @param {!lf.index.IndexStore} indexStore
 * @private
 */
lf.proc.InsertStep.assignAutoIncrementPks_ = function(
    table, values, indexStore) {
  var pkIndexSchema = table.getConstraint().getPrimaryKey();
  var autoIncrement = goog.isNull(pkIndexSchema) ? false :
      pkIndexSchema.columns[0].autoIncrement;
  if (autoIncrement) {
    var pkColumnName = pkIndexSchema.columns[0].schema.getName();
    var index = indexStore.get(pkIndexSchema.getNormalizedName());
    var max = index.stats().maxKeyEncountered;
    var maxKey = goog.isNull(max) ? 0 : max;

    values.forEach(function(row) {
      // A value of 0, null or undefined indicates that a primary key should
      // automatically be assigned.
      if (row.payload()[pkColumnName] == 0 ||
          !goog.isDefAndNotNull(row.payload()[pkColumnName])) {
        maxKey++;
        row.payload()[pkColumnName] = maxKey;
      }
    });
  }
};



/**
 * @constructor @struct
 * @extends {lf.proc.PhysicalQueryPlanNode}
 *
 * @param {!lf.Global} global
 * @param {!lf.schema.Table} table
 */
lf.proc.InsertOrReplaceStep = function(global, table) {
  lf.proc.InsertOrReplaceStep.base(this, 'constructor',
      0,
      lf.proc.PhysicalQueryPlanNode.ExecType.NO_CHILD);

  /** @private {!lf.index.IndexStore} */
  this.indexStore_ = global.getService(lf.service.INDEX_STORE);

  /** @private {!lf.schema.Table} */
  this.table_ = table;
};
goog.inherits(lf.proc.InsertOrReplaceStep, lf.proc.PhysicalQueryPlanNode);


/** @override */
lf.proc.InsertOrReplaceStep.prototype.toString = function() {
  return 'insert_replace(' + this.table_.getName() + ')';
};


/** @override */
lf.proc.InsertOrReplaceStep.prototype.execInternal = function(
    relations, journal, context) {
  var queryContext = /** @type {!lf.query.InsertContext} */ (context);
  lf.proc.InsertStep.assignAutoIncrementPks_(
      this.table_, queryContext.values, this.indexStore_);
  journal.insertOrReplace(this.table_, queryContext.values);

  return [lf.proc.Relation.fromRows(
      queryContext.values, [this.table_.getName()])];
};
